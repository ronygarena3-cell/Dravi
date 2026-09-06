const { auth } = require("../config/firebase");

/**
 * Valida el token de sesión que manda el frontend (después del login normal
 * con Firebase Authentication: email/password, Google, etc).
 * El frontend debe mandar: Authorization: Bearer <idToken>
 */
async function firebaseAuth(req, res, next) {
  try {
    const header = req.header("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Falta el token de sesión (Bearer token)." });
    }

    const decoded = await auth.verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch (err) {
    console.error("Error verificando sesión:", err.message);
    res.status(401).json({ error: "Sesión inválida o expirada. Inicia sesión de nuevo." });
  }
}

module.exports = { firebaseAuth };
