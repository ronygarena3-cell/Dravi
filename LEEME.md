# FormMail — clon simple de Formspree

Un servidor Node.js + Express normal. Un solo archivo principal (`server.js`),
sin base de datos externa (usa archivos JSON), sin framework de frontend.

## Cómo funciona (como Formspree)
1. Cualquier persona entra a `https://tu-servidor.com/registro.html`, pone su
   email, y recibe un ID único + un código `<form>` para copiar en su web.
2. Esa persona pega el código en su propia web (la tuya o de cualquiera).
3. Cuando alguien llena y envía ese formulario, el mensaje pasa por tu servidor,
   se guarda, y se reenvía SOLO al email que se registró (nunca a uno que
   invente el visitante — así no se puede usar tu servidor para mandar spam
   a otras direcciones).
4. El visitante ve la página `/gracias.html` al terminar.

⚠️ **Importante sobre el almacenamiento**: los archivos `data/forms.json` y
`data/submissions.json` viven en el disco del servidor. En el plan gratis de
Render, ese disco se reinicia cada vez que el servicio se reinicia o se
vuelve a desplegar — o sea, **se pierden los formularios registrados**. Para
producción real hace falta una base de datos de verdad (Postgres, que Render
también ofrece gratis) o un "Persistent Disk" de pago en Render. Dime si
quieres que lo cambiemos a Postgres — no es mucho más código.

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
