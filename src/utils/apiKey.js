const crypto = require("crypto");

/**
 * Genera una API key nueva con un prefijo identificable.
 * Ej: mrk_live_3f9a1c2e8b7d4f6a9c0e1b2d3f4a5b6c
 */
function generateApiKey() {
  const raw = crypto.randomBytes(24).toString("hex");
  return `mrk_live_${raw}`;
}

/**
 * Nunca guardamos la key en texto plano en Firestore.
 * Guardamos su hash SHA-256 y comparamos hashes al validar.
 */
function hashApiKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Devuelve solo los últimos 4 caracteres, para mostrar en el panel
 * algo como "mrk_live_••••••••ab12" sin exponer la key completa.
 */
function maskApiKey(key) {
  return `${key.slice(0, 12)}••••••••${key.slice(-4)}`;
}

module.exports = { generateApiKey, hashApiKey, maskApiKey };
