const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("../db");

test("guarda y lee la clave de Pixabay y la versión de la Biblia", () => {
  assert.ok(db.actualizarConfiguracion("pixabayApiKey", "clave-de-prueba"));
  assert.equal(db.obtenerConfiguracion("pixabayApiKey"), "clave-de-prueba");
  assert.ok(db.actualizarConfiguracion("pixabayApiKey", ""));
  assert.equal(db.obtenerConfiguracion("pixabayApiKey"), "");

  assert.ok(db.actualizarConfiguracion("bibliaVersion", "rv1909"));
  assert.equal(db.obtenerConfiguracion("bibliaVersion"), "rv1909");
});

test("una clave que no existe devuelve null", () => {
  assert.equal(db.obtenerConfiguracion("no-existe-xyz"), null);
});
