const admin = require("firebase-admin");

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error(
    "Falta FIREBASE_SERVICE_ACCOUNT en el .env (credenciales del service account de Firebase)"
  );
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (err) {
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT no es un JSON válido. Revisa que esté todo en una sola línea y entre comillas simples."
  );
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
