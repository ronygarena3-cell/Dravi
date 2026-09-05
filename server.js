// FormMail simple — un servidor Node/Express normal.
// Recibe POST de formularios, guarda el envío en un archivo JSON,
// y manda un email de notificación con Resend.

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'submissions.json');

// Middlewares
app.use(express.urlencoded({ extended: true })); // para <form> normal
app.use(express.json()); // por si mandan JSON (fetch/axios)
app.use(express.static(path.join(__dirname, 'public')));

// --- Helpers de almacenamiento (archivo JSON simple) ---
function leerEnvios() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return raw ? JSON.parse(raw) : [];
}

function guardarEnvio(envio) {
  const envios = leerEnvios();
  envios.push(envio);
  fs.writeFileSync(DATA_FILE, JSON.stringify(envios, null, 2));
}

// --- Envío de email con Resend ---
async function enviarEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  RESEND_API_KEY no configurada, no se envía email (solo se guarda el envío).');
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL || 'FormMail <onboarding@resend.dev>',
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Error enviando email con Resend:', err);
  }
}

// --- Ruta principal: recibe el formulario ---
// El usuario pone en su HTML: <form action="/f/mi-formulario" method="POST">
app.post('/f/:formId', async (req, res) => {
  const { formId } = req.params;
  const datos = req.body;

  // Honeypot anti-spam simple: campo oculto "empresa" que un humano nunca llena
  if (datos._honeypot) {
    return res.redirect(datos._redirect || '/gracias.html');
  }

  const envio = {
    formId,
    datos,
    fecha: new Date().toISOString(),
    ip: req.ip,
  };

  guardarEnvio(envio);

  // A dónde llega la notificación: puedes fijarlo por variable de entorno
  // o dejar que el propio formulario lo indique con un campo oculto "_to"
  const destino = datos._to || process.env.NOTIFY_EMAIL;

  if (destino) {
    const filas = Object.entries(datos)
      .filter(([campo]) => !campo.startsWith('_'))
      .map(([campo, valor]) => `<tr><td><b>${campo}</b></td><td>${valor}</td></tr>`)
      .join('');

    await enviarEmail({
      to: destino,
      subject: `Nuevo mensaje del formulario "${formId}"`,
      html: `<table>${filas}</table>`,
    });
  }

  // Redirige a una página de gracias, o responde JSON si el cliente lo pidió
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.json({ ok: true });
  }
  res.redirect(datos._redirect || '/gracias.html');
});

// --- Ruta para ver los envíos guardados (protégela con contraseña si la pones en producción) ---
app.get('/api/envios/:formId', (req, res) => {
  const envios = leerEnvios().filter((e) => e.formId === req.params.formId);
  res.json(envios);
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
