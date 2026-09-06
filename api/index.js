const app = require("../src/app");

// Vercel ejecuta esta función en cada petición.
// Express ya sabe manejar (req, res) directamente, no hace falta nada extra.
module.exports = (req, res) => app(req, res);
