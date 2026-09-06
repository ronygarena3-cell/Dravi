 return "El campo 'to' no es un correo válido.";
  if (subject.length > 200) return "El asunto es demasiado largo (máx 200 caracteres).";
  if (message.length > 20000) return "El mensaje es demasiado largo (máx 20000 caracteres).";
  return null;
}

/**
 * POST /api/send
 * Headers: x-api-key: <la key del usuario>
 * Body: { to, subject, message, html?, replyTo?, attachments?: [{filename, base64}] }
 *
 * Este es el endpoint que la web/app externa del usuario llama,
 * como si fuera Formspree/SendGrid.
 */
router.post("/", apiKeyAuth, async (req, res) => {
  const { to, subject, message, html, replyTo, attachments } = req.body;

  const validationError = validateBody({ to, subject, message });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const apiKeyDoc = req.apiKeyDoc;

  try {
    const uploaded = attachments ? await uploadAttachments(attachments) : [];

    const result = await sendMail({
      to,
      subject,
      text: message,
      html,
      replyTo,
      attachments: uploaded,
    });

    // Incrementamos el contador de la cuota SOLO si el envío tuvo éxito
    await apiKeyDoc.ref.update({
      sentToday: apiKeyDoc.sentToday + 1,
      lastUsedAt: new Date().toISOString(),
    });

    // Log del envío, útil para mostrar historial en el panel del usuario
    await db.collection("logs").add({
      userId: apiKeyDoc.userId,
      apiKeyId: apiKeyDoc.id,
      to,
      subject,
      status: "sent",
      provider: result.provider,
      providerId: result.id || null,
      attachmentsCount: uploaded.length,
      createdAt: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      remaining: apiKeyDoc.dailyLimit - (apiKeyDoc.sentToday + 1),
    });
  } catch (err) {
    console.error("Error enviando correo:", err.message);

    await db.collection("logs").add({
      userId: apiKeyDoc.userId,
      apiKeyId: apiKeyDoc.id,
      to,
      subject,
      status: "failed",
      error: err.message,
      createdAt: new Date().toISOString(),
    });

    res.status(502).json({ error: "No se pudo enviar el correo.", detail: err.message });
  }
});

module.exports = router;
