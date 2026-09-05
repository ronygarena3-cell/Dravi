# Estado del proyecto — actualizar cada vez que se trabaje aquí

Última actualización: 2026-09-04 (sesión inicial con Claude)

## ✅ Hecho
- [x] Estructura de carpetas del proyecto
- [x] Documentación de arquitectura (GUIA.md)
- [x] Modelo de datos de Firestore definido
- [x] Reglas de seguridad de Firestore (firestore.rules)
- [x] Cloud Function principal: recibir formulario (submitForm.js)
- [x] Helper de subida a Cloudinary (cloudinary.js)
- [x] Validación anti-spam básica: honeypot (spam.js)
- [x] package.json con dependencias
- [x] Dashboard completo en un solo archivo: public/index.html (login, crear
      formularios, ver envíos en tiempo real)

## 🚧 Pendiente (en orden recomendado)
1. [ ] Configurar proyecto real de Firebase (`firebase init`) — falta ejecutar en un
      proyecto de Firebase real, esto solo tiene el código, no está desplegado.
2. [ ] Rellenar `firebaseConfig` real en `public/index.html` (ahora tiene valores
      de ejemplo tipo "TU_API_KEY") y la constante `APP_DOMAIN` con el dominio
      real donde quede desplegado el Hosting.
3. [ ] Activar en Firebase: Authentication → método "Correo/contraseña", y
      Firestore (modo producción, usa firestore.rules ya incluido).
4. [ ] Crear el índice compuesto que pedirá Firestore la primera vez que corra
      la query de `loadForms()` (Firestore te da un link directo en la consola
      del navegador la primera vez que falle — solo hay que hacer clic).
5. [ ] Crear cuenta de Cloudinary y poner las credenciales reales en
      `firebase functions:config:set` (ver .env.example)
6. [ ] Integrar envío de emails (email.js está con un TODO — falta elegir proveedor
      y añadir la API key). Recomendado: Resend (más simple que SendGrid para esto).
7. [ ] Rate limiting real (ahora mismo NO hay límite de envíos por formulario —
      cualquiera puede mandar spam ilimitado. Prioridad alta antes de producción).
8. [ ] Planes de pago (Stripe) — no empezado, es lo último de todo.

## 🖥️ Dashboard (public/index.html)
Ya existe, es UN SOLO archivo HTML (sin build, sin npm, sin framework) que usa el
SDK de Firebase directo desde CDN. Incluye:
- Login / registro con email y contraseña (Firebase Auth)
- Crear formularios (guarda en Firestore `forms/{id}`)
- Listar formularios del usuario con su endpoint público y botón "Copiar"
- Ver los envíos de un formulario en tiempo real (onSnapshot)
- Marcar un envío como leído al abrirlo

Para probarlo en local: activa Firebase Hosting con `firebase emulators:start`
o simplemente abre el archivo en el navegador una vez tengas `firebaseConfig`
real relleno (no necesita servidor propio, Firebase Auth/Firestore funcionan
igual abriendo el HTML directo, aunque para producción sí conviene servirlo
con Firebase Hosting por el rewrite de `/f/**` → Cloud Function).

## 🧠 Decisiones tomadas (para no repetir la discusión)
- Cloudinary se usa SOLO desde el backend (Cloud Function), nunca desde el cliente,
  para no exponer el `api_secret`.
- Los formularios no requieren que el dueño tenga cuenta para RECIBIR envíos, pero
  sí para crear el formulario y ver el dashboard.
- El endpoint público es `POST /f/:formId` (sin autenticación — así funciona Formspree).

## ⚠️ Notas para la siguiente sesión
- El código de submitForm.js está completo pero NO PROBADO contra un proyecto de
  Firebase real (no hay acceso a red en este entorno de desarrollo).
- Antes de desplegar, revisar que `allowedOrigins` en cada formulario se valide
  correctamente contra el header `Origin` del request (está el código pero conviene
  testear con un form real).
