const { db } = require("../config/firebase");
const { hashApiKey } = require("../utils/apiKey");

function todayString() {
  return new Date().toISOString().slice(0, 10); // "2026-09-06"
}

/**
 * Middleware que:
 * 1. Lee la API key del header "x-api-key"
 * 2. Busca la key en Firestore (por su hash, nunca en texto plano)
 * 3. Verifica que esté activa
 * 4. Reinicia el contador si cambió el día
 * 5. Verifica que no haya superado su límite diario
 * 6. Adjunta la info de la key a req.apiKeyDoc para usarla luego
 */
async function apiKeyAuth(req, res, next) {
  try {
    const key = req.header("x-api-key");

    if (!key) {
      return res.status(401).json({
        error: "Falta la API key. Envíala en el header 'x-api-key'.",
      });
    }

    const keyHash = hashApiKey(key);
    const snapshot = await db
      .collection("apiKeys")
      .where("keyHash", "==", keyHash)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({ error: "API key inválida." });
    }

    const docRef = snapshot.docs[0].ref;
    const data = snapshot.docs[0].data();

    if (!data.active) {
      return res.status(403).json({ error: "Esta API key fue desactivada." });
    }

    const today = todayString();
    let sentToday = data.sentToday || 0;

    // Si es un día distinto al del último reseteo, reiniciamos el contador
    if (data.lastReset !== today) {
      sentToday = 0;
      await docRef.update({ sentToday: 0, lastReset: today });
    }

    const dailyLimit = data.dailyLimit || Number(process.env.DEFAULT_DAILY_LIMIT || 100);

    if (sentToday >= dailyLimit) {
      return res.status(429).json({
        error: "Límite diario de envíos alcanzado para esta API key.",
        limit: dailyLimit,
        resetsAt: "00:00 UTC",
      });
    }

    // Adjuntamos todo lo necesario para el siguiente middleware/ruta
    req.apiKeyDoc = { ref: docRef, id: docRef.id, ...data, sentToday, dailyLimit };
    next();
  } catch (err) {
    console.error("Error en apiKeyAuth:", err);
    res.status(500).json({ error: "Error interno validando la API key." });
  }
}

module.exports = { apiKeyAuth, todayString };
    
