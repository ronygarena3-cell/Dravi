 s.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite peticiones sin origin (ej: Postman, servidores a servidor)
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Origen no permitido por CORS"));
    },
  })
);

// --- Límite anti-abuso general por IP (además del límite por API key) ---
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PER_MINUTE || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas peticiones, espera un momento." },
});
app.use(limiter);

// --- Rutas ---
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "mail-relay-server" });
});

app.use("/api/keys", keysRouter);
app.use("/api/send", sendRouter);

// --- Manejo de errores no capturados ---
app.use((err, req, res, next) => {
  console.error("Error no manejado:", err.message);
  res.status(500).json({ error: "Error interno del servidor." });
});

module.exports = app;
