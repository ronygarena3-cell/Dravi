/**
 * spam.js
 * -------
 * Validaciones anti-spam básicas.
 * TODO (ver ESTADO.md): esto NO incluye rate limiting todavía. Es solo
 * la primera línea de defensa (honeypot). Antes de producción, añadir
 * límite de envíos por IP/formId usando Firestore o Firebase App Check.
 */

/**
 * Honeypot: el formulario del cliente debe incluir un campo oculto
 * (ej. <input type="text" name="_gotcha" style="display:none">).
 * Los bots suelen rellenar todos los campos, los humanos no ven este campo.
 * Si viene relleno, es casi seguro spam.
 */
function isHoneypotTriggered(fields) {
  return Boolean(fields._gotcha || fields._honeypot);
}

/**
 * Valida que el origen del request esté en la lista blanca del formulario
 * (si el dueño configuró allowedOrigins). Si no configuró ninguno,
 * se permite cualquier origen (comportamiento tipo Formspree por defecto).
 */
function isOriginAllowed(originHeader, allowedOrigins) {
  if (!allowedOrigins || allowedOrigins.length === 0) return true;
  if (!originHeader) return false;
  return allowedOrigins.some((allowed) => originHeader.includes(allowed));
}

module.exports = { isHoneypotTriggered, isOriginAllowed };
