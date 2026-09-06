const cloudinary = require("../config/cloudinary");

const MAX_ATTACHMENTS = 5;
const MAX_BASE64_SIZE_MB = 8;

/**
 * Recibe attachments como: [{ filename: "foto.png", base64: "data:image/png;base64,..." }]
 * Los sube a Cloudinary y devuelve: [{ filename, url }]
 */
async function uploadAttachments(attachments = []) {
  if (!Array.isArray(attachments) || attachments.length === 0) return [];

  if (attachments.length > MAX_ATTACHMENTS) {
    throw new Error(`Máximo ${MAX_ATTACHMENTS} adjuntos por correo.`);
  }

  const uploads = attachments.map(async (att) => {
    if (!att.base64 || !att.filename) {
      throw new Error("Cada adjunto necesita 'filename' y 'base64'.");
    }

    const sizeMB = (att.base64.length * 0.75) / (1024 * 1024);
    if (sizeMB > MAX_BASE64_SIZE_MB) {
      throw new Error(`El adjunto ${att.filename} supera ${MAX_BASE64_SIZE_MB}MB.`);
    }

    const result = await cloudinary.uploader.upload(att.base64, {
      resource_type: "auto",
      folder: "mail-relay-attachments",
      public_id: `${Date.now()}-${att.filename.replace(/\.[^/.]+$/, "")}`,
    });

    return { filename: att.filename, url: result.secure_url };
  });

  return Promise.all(uploads);
}

module.exports = { uploadAttachments };
