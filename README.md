# Mail Relay Server

Tu propio servicio de envío de correos (tipo Formspree / SendGrid).
Flujo: el usuario inicia sesión normal (Firebase Auth) → genera una API key →
usa esa key en cualquier web/app externa → tu servidor recibe la petición,
valida el límite diario, sube adjuntos a Cloudinary si los hay, y envía el
correo real (vía Resend o Gmail).

## 1. Instalación

```bash
npm install
cp .env.example .env
```

Rellena el `.env` con tus credenciales (ver detalles abajo).

```bash
npm run dev   # desarrollo (con nodemon)
npm start     # producción
```

## 2. Configurar Firebase

1. Crea un proyecto en https://console.firebase.google.com
2. Activa **Authentication** (Email/Password o Google) para el login de tus usuarios.
3. Activa **Firestore Database**.
4. Ve a *Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada*.
5. Copia el contenido del JSON descargado en `FIREBASE_SERVICE_ACCOUNT` (una sola línea).

**Colecciones de Firestore que se crean solas:**
- `apiKeys` → una por cada key generada (userId, keyHash, dailyLimit, sentToday, active...)
- `logs` → un documento por cada intento de envío (éxito o fallo)

## 3. Configurar el envío de correo

**Opción recomendada: Resend** (no bloquea cuentas, gratis hasta 3000/mes)
1. Crea cuenta en https://resend.com
2. Verifica tu dominio (o usa el de pruebas que ellos dan)
3. Copia tu API key a `RESEND_API_KEY`

**Opción alternativa: Gmail SMTP**
1. Activa verificación en 2 pasos en tu cuenta de Gmail
2. Genera una "Contraseña de aplicación" en https://myaccount.google.com/apppasswords
3. Ponla en `GMAIL_APP_PASSWORD`
4. Cambia `MAIL_PROVIDER=gmail` en el `.env`
5. ⚠️ Límite real de Gmail: ~500 correos/día y riesgo de bloqueo si detecta uso tipo servicio masivo.

## 4. Configurar Cloudinary (adjuntos)

1. Crea cuenta gratis en https://cloudinary.com
2. Copia `Cloud name`, `API Key` y `API Secret` desde el dashboard a tu `.env`

## 5. Flujo de uso desde el frontend (panel del usuario)

```js
// Después de loguear al usuario con Firebase Auth en tu frontend:
const idToken = await firebase.auth().currentUser.getIdToken();

// Generar una API key nueva
const res = await fetch("https://tu-servidor.com/api/keys", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  },
  body: JSON.stringify({ label: "Mi web principal" }),
});
const { apiKey } = await res.json();
// apiKey se muestra UNA sola vez -> el usuario debe guardarla
```

## 6. Cómo la usan las webs/apps externas para mandar correos

Esto es lo que reemplaza a Formspree en el sitio del usuario final:

```js
await fetch("https://tu-servidor.com/api/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "mrk_live_xxxxxxxxxxxxxxxxxxxx",
  },
  body: JSON.stringify({
    to: "destinatario@ejemplo.com",
    subject: "Nuevo mensaje de contacto",
    message: "Hola, este es el contenido del correo.",
    replyTo: "quien_escribio@ejemplo.com",
    attachments: [
      // opcional, máximo 5, 8MB c/u
      { filename: "foto.png", base64: "data:image/png;base64,iVBORw0KG..." },
    ],
  }),
});
```

Respuesta si todo va bien:
```json
{ "success": true, "remaining": 97 }
```

Respuesta si se acabó el límite diario:
```json
{ "error": "Límite diario de envíos alcanzado para esta API key.", "limit": 100 }
```

## 7. Seguridad ya incluida

- Las API keys se guardan **hasheadas** (SHA-256), nunca en texto plano.
- Límite diario de envíos por API key (configurable, se resetea cada día).
- Límite anti-abuso por IP (30 peticiones/minuto por defecto).
- CORS restringido a los orígenes que tú definas en `ALLOWED_ORIGINS`.
- Cada envío queda registrado en `logs` (éxito/fallo) para auditoría.
- Las API keys se pueden desactivar (`revoke`) sin borrar el historial.

## 8. Desplegar en Vercel

Este proyecto ya está adaptado para funcionar como función serverless de Vercel:

```
gmail-server/
├── api/
│   └── index.js      ← esto es lo que Vercel ejecuta
├── src/
│   ├── app.js         ← toda la app de Express (rutas, middleware)
│   └── index.js       ← solo se usa para correrlo en TU computadora (local)
└── vercel.json         ← le dice a Vercel que mande todo a /api
```

**Pasos:**

1. Sube este proyecto completo a tu repositorio de GitHub (`Dravi` en tu caso), respetando la misma estructura de carpetas.
2. En Vercel, entra a tu proyecto → **Settings → Git** → conecta el repositorio.
3. Ve a **Settings → Environment Variables** y agrega TODAS las variables que tienes en tu `.env` local (Vercel no lee el archivo `.env`, necesitas pegarlas ahí una por una: `FIREBASE_SERVICE_ACCOUNT`, `RESEND_API_KEY`, `MAIL_FROM`, `CLOUDINARY_CLOUD_NAME`, etc.)
4. Haz `git push` → Vercel despliega automáticamente.
5. Tu API quedará disponible en `https://dravi.vercel.app/api/send`, `https://dravi.vercel.app/api/keys`, etc.

**Para probarlo en tu computadora antes de subirlo** (recomendado):
```bash
npm install
npm run dev
```
Esto sigue funcionando igual, usando `src/index.js` con tu `.env` local.

⚠️ Nota: en el plan gratuito de Vercel, las funciones serverless tienen un límite de tiempo de ejecución (10 segundos). El envío de correos normalmente tarda 1-2 segundos, así que no debería ser problema salvo con adjuntos muy pesados.

## 9. Próximos pasos sugeridos

- Añadir planes de pago (aumentar `dailyLimit` según plan).
- Panel visual en React/Next.js que consuma `/api/keys` y `/api/send/logs`.
- Webhooks para notificar al usuario cuando un correo falla.
- Plantillas de correo (HTML) reutilizables guardadas en Firestore.
