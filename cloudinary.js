/**
 * cloudinary.js
 * -------------
 * Sube archivos adjuntos de un envío de formulario a Cloudinary.
 * IMPORTANTE: esto SIEMPRE corre en el backend (Cloud Function).
 * Nunca expongas CLOUDINARY_API_SECRET al cliente.
 */

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Sube un buffer de archivo a Cloudinary dentro de una carpeta por formId,
 * para mantener los adjuntos organizados por formulario.
 *
 * @param {Buffer} buffer - contenido del archivo
 * @param {string} filename - nombre original del archivo
 * @param {string} formId - id del formulario, se usa como carpeta
 * @returns {Promise<{url: string, publicId: string}>}
 */
async function uploadAttachment(buffer, filename, formId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `formmail/${formId}`,
        resource_type: "auto", // detecta imagen/pdf/video automáticamente
        filename_override: filename,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Sube varios archivos en paralelo. Si alguno falla, lanza el error
 * (decisión: preferimos fallar todo el envío antes que guardar un
 * envío con adjuntos a medias — se puede cambiar según necesidad).
 */
async function uploadAttachments(files, formId) {
  const uploads = files.map((f) => uploadAttachment(f.buffer, f.filename, formId));
  return Promise.all(uploads);
}

module.exports = { uploadAttachment, uploadAttachments };
