const nodemailer = require("nodemailer");

let resendClient = null;
let gmailTransport = null;

function getResend() {
  if (!resendClient) {
    const { Resend } = require("resend");
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function getGmailTransport() {
  if (!gmailTransport) {
    gmailTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // Contraseña de aplicación, no la normal
      },
    });
  }
  return gmailTransport;
}

/**
 * Envía un correo. attachments: [{ filename, url }] (urls ya subidas a Cloudinary)
 */
async function sendMail({ to, subject, text, html, attachments = [], replyTo }) {
  const provider = process.env.MAIL_PROVIDER || "resend";

  if (provider === "resend") {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: process.env.MAIL_FROM,
      to,
      subject,
      text,
      html,
      reply_to: replyTo,
      attachments: attachments.map((a) => ({ filename: a.filename, path: a.url })),
    });
    if (error) throw new Error(error.message || "Error enviando con Resend");
    return { provider: "resend", id: data?.id };
  }

  if (provider === "gmail") {
    const transporter = getGmailTransport();
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      text,
      html,
      replyTo,
      attachments: attachments.map((a) => ({ filename: a.filename, path: a.url })),
    });
    return { provider: "gmail", id: info.messageId };
  }

  throw new Error(`MAIL_PROVIDER desconocido: ${provider}`);
}

module.exports = { sendMail };
