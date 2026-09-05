/**
 * submitForm.js
 * -------------
 * Endpoint público: POST /f/:formId
 *
 * Este es el corazón del servicio. Cualquier <form action="...">  en
 * internet apunta aquí. Flujo:
 *   1. Buscar el formulario en Firestore por formId
 *   2. Validar origen + honeypot
 *   3. Parsear el body (soporta application/x-www-form-urlencoded,
 *      application/json y multipart/form-data con archivos)
 *   4. Subir archivos a Cloudinary si los hay
 *   5. Guardar el envío en Firestore
 *   6. Enviar email de notificación al dueño
 *   7. Responder: JSON si el cliente pidió Accept: application/json,
 *      si no, redirigir a una página de gracias (comportamiento Formspree)
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Busboy = require("busboy");

const { uploadAttachments } = require("./cloudinary");
const { sendNotification } = require("./email");
const { isHoneypotTriggered, isOriginAllowed } = require("./spam");

const db = admin.firestore();

/**
 * Parsea multipart/form-data usando busboy, separando campos de texto
 * y archivos. Devuelve una Promise porque busboy trabaja por eventos.
 */
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = [];
    const busboy = Busboy({ headers: req.headers });

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (name, stream, info) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => {
        files.push({ filename: info.filename, buffer: Buffer.concat(chunks) });
      });
    });

    busboy.on("finish", () => resolve({ fields, files }));
    busboy.on("error", reject);

    busboy.end(req.rawBody);
  });
}

/**
 * Extrae { fields, files } del request sin importar el content-type.
 */
async function parseBody(req) {
  const contentType = req.headers["content-type"] || "";

  if (contentType.includes("multipart/form-data")) {
    return parseMultipart(req);
  }

  // req.body ya viene parseado por Firebase Functions para json y urlencoded
  return { fields: req.body || {}, files: [] };
}

const submitForm = functions.https.onRequest(async (req, res) => {
  // CORS: permitimos POST desde cualquier origen a nivel HTTP;
  // el filtrado real de "qué dominios pueden usar este formId" pasa
  // por isOriginAllowed() más abajo, no por CORS.
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido, usa POST." });
  }

  const formId = req.params[0] || req.query.formId;
  if (!formId) {
    return res.status(400).json({ error: "Falta el id del formulario en la URL." });
  }

  try {
    const formDoc = await db.collection("forms").doc(formId).get();
    if (!formDoc.exists) {
      return res.status(404).json({ error: "Formulario no encontrado." });
    }
    const form = formDoc.data();

    const origin = req.headers.origin || req.headers.referer;
    if (!isOriginAllowed(origin, form.allowedOrigins)) {
      return res.status(403).json({ error: "Origen no autorizado para este formulario." });
    }

    const { fields, files } = await parseBody(req);

    if (isHoneypotTriggered(fields)) {
      // Respondemos como si todo fuera bien para no delatar al bot,
      // pero NO guardamos nada.
      return res.status(200).json({ success: true });
    }

    // Quitamos campos de control que no son datos del usuario
    const { _gotcha, _honeypot, _redirect, ...data } = fields;

    let fileUrls = [];
    if (files.length > 0) {
      const uploaded = await uploadAttachments(files, formId);
      fileUrls = uploaded.map((f) => f.url);
    }

    await db.collection("forms").doc(formId).collection("submissions").add({
      data,
      files: fileUrls,
      ip: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"] || "",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (form.notifyEmail) {
      // No bloqueamos la respuesta al usuario si el email tarda o falla;
      // se registra el error pero el envío ya quedó guardado.
      sendNotification({
        to: form.notifyEmail,
        formName: form.name || formId,
        data,
        fileUrls,
      }).catch((err) => functions.logger.error("Error enviando email:", err));
    }

    const wantsJson = (req.headers.accept || "").includes("application/json");
    if (wantsJson) {
      return res.status(200).json({ success: true });
    }

    const redirectTo = fields._redirect || form.thanksUrl || "/gracias";
    return res.redirect(303, redirectTo);
  } catch (err) {
    functions.logger.error("Error en submitForm:", err);
    return res.status(500).json({ error: "Error interno procesando el formulario." });
  }
});

module.exports = { submitForm };
