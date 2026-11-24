// Pistas del Himnario Adventista (servidor/rutas/pistas.js) con un Firebase simulado: sin internet.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {crearPistas} = require(path.join(__dirname, "..", "servidor/rutas/pistas.js"));

// Firebase de mentira: tiene audios/001.mp3 y 003.mp3
function firebaseFalso() {
  const pedidos = [];
  const audios = {"001.mp3": Buffer.from("ID3 pista uno"), "003.mp3": Buffer.from("ID3 pista tres!")};
  const fetchImpl = async (url) => {
    pedidos.push(url);
    const nombre = decodeURIComponent(url.split("/o/")[1].split("?")[0]).replace("audios/", "");
    const datos = audios[nombre];
    if (!datos) return {ok: false, status: 404, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0)};
    return {
      ok: true,
      status: 200,
      json: async () => ({size: String(datos.length), contentType: "audio/mpeg"}),
      arrayBuffer: async () => datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.length),
    };
  };
  return {fetchImpl, pedidos};
}

const nueva = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gloryview-pistas-"));
  const fb = firebaseFalso();
  return {dir, fb, pistas: crearPistas({fs, path, dir, fetchImpl: fb.fetchImpl})};
};

test("consulta si un himno tiene pista (y recuerda la respuesta)", async () => {
  const {pistas, fb} = nueva();
  assert.deepEqual(await pistas.consultar(1), {disponible: true, bytes: 13});
  assert.deepEqual(await pistas.consultar(2), {disponible: false, bytes: 0});
  await pistas.consultar(1);
  assert.equal(fb.pedidos.length, 2);
});

test("baja la pista una sola vez y la guarda en la compu", async () => {
  const {pistas, fb, dir} = nueva();
  const [a, b] = await Promise.all([pistas.bajar(3), pistas.bajar(3)]);
  assert.equal(a && b, true);
  assert.equal(fb.pedidos.filter((u) => u.includes("alt=media")).length, 1);
  assert.equal(fs.readFileSync(path.join(dir, "adventista", "003.mp3"), "utf8"), "ID3 pista tres!");
  assert.equal(await pistas.bajar(3), true);
  assert.equal(fb.pedidos.length, 1); // ya estaba guardada: no vuelve a internet
  assert.equal(pistas.descargada(3), 15);
});

test("un himno sin pista no deja archivos", async () => {
  const {pistas, dir} = nueva();
  assert.equal(await pistas.bajar(2), false);
  assert.deepEqual(fs.readdirSync(path.join(dir, "adventista")), []);
});

test("sin internet: disponible queda sin saber (null) y no se recuerda", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gloryview-pistas-"));
  let caido = true;
  const fb = firebaseFalso();
  const pistas = crearPistas({fs, path, dir, fetchImpl: (u) => (caido ? Promise.reject(new Error("sin red")) : fb.fetchImpl(u))});
  assert.deepEqual(await pistas.consultar(1), {disponible: null, bytes: 0});
  await assert.rejects(pistas.bajar(1));
  caido = false;
  assert.deepEqual(await pistas.consultar(1), {disponible: true, bytes: 13});
});

test("bajar todas, resumen y borrar", async () => {
  const {pistas} = nueva();
  pistas.descargarTodas();
  for (let i = 0; i < 200 && pistas.estadoDescarga().activa; i++) await new Promise((r) => setTimeout(r, 5));
  const e = pistas.estadoDescarga();
  assert.equal(e.activa, false);
  assert.equal(e.revisadas, 236);
  assert.equal(e.bajadas, 2);
  assert.equal(e.sinPista, 234);
  assert.deepEqual(pistas.resumen(), {descargadas: 2, bytes: 28});
  pistas.borrarTodas();
  assert.deepEqual(pistas.resumen(), {descargadas: 0, bytes: 0});
});
