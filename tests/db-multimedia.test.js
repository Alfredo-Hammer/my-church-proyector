const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const db = require("../db");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gloryview-media-"));
const carpeta = path.join(tmp, "multimedia");
const miniaturas = path.join(tmp, "thumbs");
fs.mkdirSync(carpeta);
fs.mkdirSync(miniaturas);
const opciones = { carpetas: [carpeta], carpetaMiniaturas: miniaturas };

function agregar(nombre, ruta, tipo = "video") {
  const r = db.agregarMultimedia({
    nombre, tipo, tamaño: 1, ruta_archivo: ruta, url: `/multimedia/${nombre}`,
    extension: path.extname(nombre), favorito: false, reproducido: 0,
    fecha_agregado: new Date().toISOString(),
  });
  const id = r?.id ?? r?.lastInsertRowid;
  assert.ok(id, `no se creó el registro: ${JSON.stringify(r)}`);
  return id;
}

test("eliminar borra el archivo y su miniatura", () => {
  const archivo = path.join(carpeta, "culto.mp4");
  fs.writeFileSync(archivo, "x");
  const id = agregar("culto.mp4", archivo);
  const mini = path.join(miniaturas, `thumb_${id}.jpg`);
  fs.writeFileSync(mini, "x");

  const r = db.eliminarMultimedia(id, opciones);
  assert.equal(r.success, true);
  assert.equal(r.archivo, true);
  assert.equal(r.miniatura, true);
  assert.equal(fs.existsSync(archivo), false);
  assert.equal(fs.existsSync(mini), false);
});

test("no borra un archivo que está fuera de las carpetas de la app", () => {
  const externo = path.join(tmp, "mis-videos", "boda.mp4");
  fs.mkdirSync(path.dirname(externo), { recursive: true });
  fs.writeFileSync(externo, "x");
  const id = agregar("boda.mp4", externo);
  const r = db.eliminarMultimedia(id, opciones);
  assert.equal(r.success, true);
  assert.equal(r.archivo, false);
  assert.equal(fs.existsSync(externo), true);
});

test("subir el mismo archivo dos veces no crea un registro duplicado", () => {
  const archivo = path.join(carpeta, "compartido.mp4");
  fs.writeFileSync(archivo, "x");
  const a = agregar("compartido.mp4", archivo);
  const b = agregar("compartido.mp4", archivo);
  assert.equal(b, a);
  db.eliminarMultimedia(a, opciones);
  assert.equal(fs.existsSync(archivo), false);
});

test("una ruta con ../ no escapa de la carpeta", () => {
  const fuera = path.join(tmp, "secreto.txt");
  fs.writeFileSync(fuera, "x");
  const id = agregar("secreto.txt", path.join(carpeta, "..", "secreto.txt"), "imagen");
  db.eliminarMultimedia(id, { carpetas: [path.join(carpeta, "sub")] });
  assert.equal(fs.existsSync(fuera), true);
});

test("los enlaces de YouTube se eliminan sin tocar el disco", () => {
  const id = agregar("video", "https://www.youtube.com/watch?v=abc", "youtube");
  const r = db.eliminarMultimedia(id, opciones);
  assert.equal(r.success, true);
  assert.equal(r.archivo, false);
});

test("eliminar un id que no existe responde con error, sin lanzar", () => {
  const r = db.eliminarMultimedia(999999, opciones);
  assert.equal(r.success, false);
});
