# FormMail simple

Un servidor Node.js + Express normal. Un solo archivo (`server.js`), sin base de
datos, sin login, sin dashboard. Guarda los envíos en `data/submissions.json` y
manda un email de notificación con Resend.

## Cómo funciona
1. Pones esto en tu web: `<form action="https://tu-servidor.com/f/mi-form" method="POST">`
2. El servidor recibe el POST, guarda el envío y te manda un email.
3. Redirige al usuario a `/gracias.html` (o responde JSON si tu fetch pide `Accept: application/json`).

## Probarlo en local
```
npm install
cp .env.example .env
# edita .env con tu RESEND_API_KEY (gratis en resend.com) y tu NOTIFY_EMAIL
npm start
```
Abre `http://localhost:3000/ejemplo.html` para probar el formulario de ejemplo.

## Desplegarlo (sin usar la terminal, todo desde el navegador del teléfono)
La forma más simple desde el teléfono es **Render.com**:
1. Sube esta carpeta a un repositorio de GitHub (puedes hacerlo desde la app de GitHub
   o subiendo el ZIP con la web de GitHub, sección "Add file → Upload files").
2. Entra a render.com, crea cuenta gratis, "New → Web Service", conecta tu repo.
3. Build command: `npm install` — Start command: `npm start`
4. En la pestaña "Environment" pega las mismas variables de tu `.env`.
5. Deploy. Render te da una URL tipo `https://tu-app.onrender.com`.

Alternativas igual de simples: Railway.app o Fly.io (proceso muy parecido).

## Ver los envíos guardados
`GET /api/envios/:formId` te devuelve el JSON con todos los envíos de ese
formulario. En producción, protege esta ruta con una contraseña simple antes
de dejarla pública (dímelo y te lo agrego).

## Siguientes pasos opcionales
- Rate limiting (evitar spam masivo): se puede agregar con `express-rate-limit` en 2 líneas.
- Adjuntar archivos: se puede hacer con `multer` + subirlos a algún servicio (Cloudinary, S3, etc).
- Reemplazar el archivo JSON por SQLite si quieres algo un poco más robusto sin salir de "un solo servidor".
