# FormMail — Clon de Formspree con Firebase + Cloudinary

## 🎯 Qué es esto
Un servicio tipo Formspree: el usuario pone un `<form action="https://.../f/ABC123">` en su web
estática, nosotros recibimos el POST, guardamos el envío, subimos archivos a Cloudinary,
y notificamos por email al dueño del formulario.

## 📌 Estado actual (ver también ESTADO.md)
Lee siempre primero `ESTADO.md` — ahí está el checklist de qué está hecho y qué falta,
actualizado por la última persona/sesión que trabajó en esto.

## 🏗️ Arquitectura

```
Usuario final rellena <form> en su web
        ↓ POST
Cloud Function (functions/src/submitForm.js)
        ↓
   ├── Guarda en Firestore (forms/{formId}/submissions/{submissionId})
   ├── Si hay archivos → sube a Cloudinary (functions/src/cloudinary.js)
   └── Envía email de notificación (functions/src/email.js)
        ↓
Redirige al usuario a página de "gracias" o devuelve JSON
```

## 📁 Estructura de carpetas

```
formmail-project/
├── GUIA.md              ← este archivo (arquitectura y visión general)
├── ESTADO.md            ← checklist de progreso, actualízalo siempre al terminar de trabajar
├── firestore.rules      ← reglas de seguridad de Firestore
├── .env.example         ← variables de entorno necesarias (copiar a .env, nunca subir el real)
├── public/
│   └── index.html       ← dashboard completo en un solo archivo (login + formularios + envíos)
└── functions/
    ├── package.json
    └── src/
        ├── index.js         ← exporta las Cloud Functions
        ├── submitForm.js    ← lógica principal: recibe el POST del formulario
        ├── cloudinary.js    ← helper para subir archivos a Cloudinary
        ├── email.js         ← helper para enviar notificaciones (Resend/SendGrid)
        └── spam.js          ← honeypot + validaciones anti-spam básicas
```

## 🗄️ Modelo de datos (Firestore)

```
users/{uid}
  - email, plan ("free" | "pro"), createdAt

forms/{formId}
  - ownerUid
  - name              (nombre que le puso el usuario, ej "Contacto web")
  - notifyEmail       (a dónde llegan las notificaciones)
  - allowedOrigins    (array de dominios permitidos, para seguridad)
  - createdAt

forms/{formId}/submissions/{submissionId}
  - data              (objeto con los campos del formulario)
  - files             (array de URLs de Cloudinary si hubo adjuntos)
  - ip, userAgent
  - createdAt
  - read (bool)
```

## 🔑 Variables de entorno necesarias (.env.example)
Ver archivo `.env.example`. Se configuran en Firebase con:
```
firebase functions:config:set cloudinary.cloud_name="..." cloudinary.api_key="..." cloudinary.api_secret="..."
```

## ▶️ Cómo continuar trabajando en esto (para otra sesión de Claude o un humano)
1. Lee `ESTADO.md` primero.
2. Instala dependencias: `cd functions && npm install`
3. Corre el emulador local: `firebase emulators:start`
4. Sigue el checklist de `ESTADO.md` en orden — cada tarea no tachada tiene una nota de
   qué falta y dónde.
5. Cuando termines algo, actualiza `ESTADO.md` marcándolo como hecho y anota decisiones
   importantes que tomaste (para que la siguiente sesión no las repita ni las contradiga).

## 🚧 Cosas pendientes de decidir (no bloquean el desarrollo, pero hay que decidirlas)
- ¿reCAPTCHA v3 o solo honeypot + rate limit?
- ¿Límite de envíos en plan gratis? (Formspree usa 50/mes)
- ¿Proveedor de email? (Resend es el más simple de integrar con Cloud Functions)
- ¿Dashboard en React/Next o algo más simple con Firebase Hosting + vanilla JS?
