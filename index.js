/**
 * index.js
 * --------
 * Punto de entrada de las Cloud Functions. Firebase busca aquí
 * (según "main" en package.json) todas las funciones exportadas.
 *
 * Para añadir una función nueva: crear su archivo en src/, exportarla
 * ahí, e importarla/reexportarla aquí.
 */

const admin = require("firebase-admin");
admin.initializeApp();

const { submitForm } = require("./submitForm");

// La ruta real será algo como:
//   https://REGION-TU_PROYECTO.cloudfunctions.net/f/ABC123
// configurado con un rewrite en firebase.json para que se vea como
// "/f/:formId" en vez de "/submitForm?formId=ABC123".
exports.f = submitForm;
