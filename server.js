// FormMail — un clon simple de Formspree, un solo servidor Node/Express.
// Cualquier persona se registra con su email, recibe un ID único, y pone
// <form action="https://tu-servidor.com/f/SU-ID"> en su propia web.
// Los mensajes pasan por este servidor y se reenvían SOLO al email
// registrado (no al que diga el visitante), para que no se use como spam.

require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SUBMISSIONS_FILE = path.join(__dirname, 'data', 'submissions.json');
const FORMS_FILE = path.join(__dirname, 'data', 'forms.json');

// Middlewares
app.use(express.urlencoded({ extended: true })); // para <form> normal
app.use(express.json()); // por si mandan JSON (fetch/axios)
app.use(express.static(path.join(__dirname, 'public')));

// --- Helpers de almacenamiento (archivos JSON simples) ---
function leerJSON(archivo, porDefecto) {
  if (!fs.existsSync(archivo)) return porDefecto;
  const raw = fs.readFileSync(archivo, 'utf-8');
  return raw ? JSON.parse(raw) : porDefecto;
}

function guardarJSON(archivo, datos) {
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, JSON.stringify(datos, null, 2));
}

function leerFormularios() {
  return leerJSON(FORMS_FILE, {}); // { [formId]: { email, creado } }
}

function guardarFormularios(forms) {
  guardarJSON(FORMS_FILE, forms);
}

function leerEnvios() {
  return leerJSON(SUBMISSIONS_FILE, []);
}

function guardarEnvio(envio) {
  const envios = leerEnvios();
  envios.push(envio);
  guardarJSON(SUBMISSIONS_FILE, envios);
}

// --- Envío de email con Resend ---
async function enviarEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  RESEND_API_KEY no configurada, no se envía email.');
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

// --- Registro: alguien da su email y le generamos su ID único ---
app.post('/api/registro', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ ok: false, error: 'Email inválido' });
  }

  const formId = crypto.randomBytes(4).toString('hex'); // ej: "a1b2c3d4"
  const forms = leerFormularios();
  forms[formId] = { email, creado: new Date().toISOString() };
  guardarFormularios(forms);

  const dominio = `${req.protocol}://${req.get('host')}`;
  const codigo = `<form action="${dominio}/f/${formId}" method="POST">
  <input type="text" name="nombre" placeholder="Tu nombre" required>
  <input type="email" name="email" placeholder="Tu email" required>
  <textarea name="mensaje" placeholder="Tu mensaje" required></textarea>
  <button type="submit">Enviar</button>
</form>`;

  // Le mandamos su código por email también, para que no lo pierda
  await enviarEmail({
    to: email,
    subject: 'Tu formulario está listo',
    html: `<p>Tu ID de formulario es: <b>${formId}</b></p>
           <p>Copia este código en tu web:</p>
           <pre>${codigo.replace(/</g, '&lt;')}</pre>`,
  });

  res.json({ ok: true, formId, codigo });
});

// --- Ruta principal: recibe el formulario de un visitante ---
// El dueño del formulario pone en SU HTML: <form action="/f/SU-ID" method="POST">
app.post('/f/:formId', async (req, res) => {
  const { formId } = req.params;
  const datos = req.body;

  const forms = leerFormularios();
  const formulario = forms[formId];

  if (!formulario) {
    return res.status(404).send('Formulario no encontrado. Regístrate primero en /registro.html');
  }

  // Honeypot anti-spam simple: campo oculto que un humano nunca llena
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

  // El destino SIEMPRE es el email registrado — nunca uno que mande el visitante
  const filas = Object.entries(datos)
    .filter(([campo]) => !campo.startsWith('_'))
    .map(([campo, valor]) => `<tr><td><b>${campo}</b></td><td>${valor}</td></tr>`)
    .join('');

  await enviarEmail({
    to: formulario.email,
    subject: 'Nuevo mensaje de tu formulario',
    html: `<table>${filas}</table>`,
  });

  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.json({ ok: true });
  }
  res.redirect(datos._redirect || '/gracias.html');
});

// --- Ver los envíos guardados de un formulario (protégela con contraseña antes de producción real) ---
app.get('/api/envios/:formId', (req, res) => {
  const envios = leerEnvios().filter((e) => e.formId === req.params.formId);
  res.json(envios);
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
