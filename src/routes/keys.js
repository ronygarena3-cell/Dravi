const express = require("express");
const { db } = require("../config/firebase");
const { firebaseAuth } = require("../middleware/firebaseAuth");
const { generateApiKey, hashApiKey, maskApiKey } = require("../utils/apiKey");

const router = express.Router();
router.use(firebaseAuth); // todas las rutas de aquí requieren sesión iniciada

/**
 * POST /api/keys
 * Genera una nueva API key para el usuario logueado.
 * La key completa SOLO se devuelve una vez, en esta respuesta.
 */
router.post("/", async (req, res) => {
  try {
    const { label } = req.body; // ej: "Web principal", "App móvil"
    const key = generateApiKey();
    const keyHash = hashApiKey(key);

    const docRef = await db.collection("apiKeys").add({
      userId: req.user.uid,
      userEmail: req.user.email,
      label: label || "Sin nombre",
      keyHash,
      active: true,
      dailyLimit: Number(process.env.DEFAULT_DAILY_LIMIT || 100),
      sentToday: 0,
      lastReset: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      id: docRef.id,
      apiKey: key, // ⚠️ única vez que se muestra completa
      masked: maskApiKey(key),
      message: "Guarda esta key ahora, no podrás volver a verla completa.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo generar la API key." });
  }
});

/**
 * GET /api/keys
 * Lista las keys del usuario (enmascaradas, nunca en texto plano).
 */
router.get("/", async (req, res) => {
  try {
    const snapshot = await db
      .collection("apiKeys")
      .where("userId", "==", req.user.uid)
      .get();

    const keys = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        label: d.label,
        active: d.active,
        dailyLimit: d.dailyLimit,
        sentToday: d.sentToday,
        createdAt: d.createdAt,
      };
    });

    res.json({ keys });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudieron obtener las API keys." });
  }
});

/**
 * PATCH /api/keys/:id/revoke
 * Desactiva una API key (no se puede volver a usar para enviar correos).
 */
router.patch("/:id/revoke", async (req, res) => {
  try {
    const docRef = db.collection("apiKeys").doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().userId !== req.user.uid) {
      return res.status(404).json({ error: "API key no encontrada." });
    }

    await docRef.update({ active: false });
    res.json({ message: "API key desactivada." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo desactivar la API key." });
  }
});

module.exports = router;
      
