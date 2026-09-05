/**
 * email.js
 * --------
 * Envía el email de notificación al dueño del formulario cuando
 * llega un nuevo envío.
 *
 * Usamos Resend porque su API es la más simple de integrar en una
 * Cloud Function (una sola llamada HTTP). Alternativa: SendGrid o
 * Nodemailer + SMTP si prefieres otro proveedor — la función
 * sendNotification() es el único lugar que habría que cambiar.
 *
 * TODO (ver ESTADO.md): falta poner la RESEND_API_KEY real y
 * verificar un dominio propio en Resend para que el email no
 * llegue a spam.
 */

const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * @param {object} params
 * @param {string} params.to - email del dueño del formulario
 * @param {string} params.formName - nombre del formulario
 * @param {object} params.data - campos enviados por el usuario final
 * @param {string[]} [params.fileUrls] - urls de Cloudinary si hubo adjuntos
 */
async function sendNotification({ to, formName, data, fileUrls = [] }) {
  const rows = Object.entries(data)
    .map(([key, value]) => `<tr><td><b>${key}</b></td><td>${value}</td></tr>`)
    .join("");

  const filesHtml = fileUrls.length
    ? `<p><b>Archivos adjuntos:</b><br>${fileUrls
        .map((url) => `<a href="${url}">${url}</a>`)
        .join("<br>")}</p>`
    : "";

  await resend.emails.send({
    from: "FormMail <notificaciones@tudominio.com>",
    to,
    subject: `Nuevo envío en tu formulario "${formName}"`,
    html: `
      <h2>Nuevo envío recibido</h2>
      <table>${rows}</table>
      ${filesHtml}
    `,
  });
}

module.exports = { sendNotification };
