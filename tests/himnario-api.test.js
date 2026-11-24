// API de himnos con el himnario en miskito elegido (Moravo o Adventista).
// La app móvil (también la vieja) pide ?tipo=moravo y debe recibir el que eligió la iglesia.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..");
const registrar = require(path.join(raiz, "servidor/rutas/himnos.js"));

function montar(configInicial = {}) {
  const config = {...configInicial};
  const rutas = {};
  const app = {};
  for (const m of ["get", "post", "put", "delete"]) app[m] = (ruta, fn) => (rutas[`${m} ${ruta}`] = fn);
  registrar(app, {
    path,
    fs,
    buildDir: path.join(raiz, "public"),
    obtenerConfiguracion: async (k) => config[k] ?? null,
    actualizarConfiguracion: async (k, v) => ((config[k] = v), true),
    obtenerHimnos: async () => [],
    actualizarFavoritoHimno: async () => true,
    crearHimno: async () => 1,
    actualizarHimno: async () => true,
    eliminarHimno: async () => true,
  });
  const llamar = async (clave, {query = {}, params = {}, body = {}} = {}) => {
    let salida;
    const res = {status: () => res, json: (j) => ((salida = j), res)};
    await rutas[clave]({query, params, body}, res);
    return salida;
  };
  return {config, llamar};
}

test("sin elegir, tipo=moravo entrega el Himnario Moravo (como siempre)", async () => {
  const {llamar} = montar();
  const r = await llamar("get /api/himnos", {query: {tipo: "moravo"}});
  assert.equal(r.ok, true);
  assert.equal(r.himnos.length, 381);
  assert.equal(r.himnos[0].id, "base:moravo:1");
  assert.equal(r.himnario.id, "moravo");
});

test("con Adventista elegido, tipo=moravo entrega el Himnario Adventista", async () => {
  const {llamar} = montar({himnario: "adventista"});
  const r = await llamar("get /api/himnos", {query: {tipo: "moravo"}});
  assert.equal(r.himnos.length, 236);
  assert.equal(r.himnos[0].id, "base:adventista:1");
  assert.equal(r.himnos[0].fuente, "adventista");
  assert.equal(r.himnos[0].titulo, "WAN DAWAN KARA BAL");
  assert.equal(r.himnario.nombre, "Himnario Adventista");
  // Vida Cristiana no cambia
  const v = await llamar("get /api/himnos", {query: {tipo: "vida"}});
  assert.equal(v.himnos.length, 350);
});

test("los favoritos de cada himnario van por separado", async () => {
  const {config, llamar} = montar({himnario: "adventista", himnos_favoritos_moravo: JSON.stringify(["base:moravo:7"])});
  const ok = await llamar("post /api/himnos/:id/favorito", {params: {id: "base:adventista:5"}, body: {favorito: true}});
  assert.equal(ok.ok, true);
  assert.deepEqual(JSON.parse(config.himnos_favoritos_adventista), ["base:adventista:5"]);
  assert.deepEqual(JSON.parse(config.himnos_favoritos_moravo), ["base:moravo:7"]);

  const fav = await llamar("get /api/himnos/favoritos", {query: {tipo: "all"}});
  assert.deepEqual(fav.himnos.map((h) => h.id), ["base:adventista:5"]);
  const lista = await llamar("get /api/himnos", {query: {tipo: "moravo"}});
  assert.equal(lista.himnos.find((h) => h.numero === 5).favorito, true);

  // Volviendo al Moravo, aparecen sus favoritos de antes
  config.himnario = "moravo";
  const favM = await llamar("get /api/himnos/favoritos", {query: {tipo: "moravo"}});
  assert.deepEqual(favM.himnos.map((h) => h.id), ["base:moravo:7"]);
});

test("datos del Himnario Adventista: 236 himnos completos, texto corrido (como el Moravo), misma copia en src y public", () => {
  const pub = fs.readFileSync(path.join(raiz, "public/data/himnos_adventista.json"), "utf8");
  const src = fs.readFileSync(path.join(raiz, "src/data/himnos_adventista.json"), "utf8");
  assert.equal(pub, src);
  const himnos = JSON.parse(pub);
  assert.equal(himnos.length, 236);
  assert.deepEqual(himnos.map((h) => h.numero), Array.from({length: 236}, (_, i) => i + 1));
  for (const h of himnos) {
    assert.ok(h.titulo.trim(), `#${h.numero} sin título`);
    assert.ok(h.parrafos.length > 0, `#${h.numero} sin estrofas`);
    for (const p of h.parrafos) assert.ok(p.trim() && !/\/n|\r|\t|\n|  /.test(p), `#${h.numero}: ${JSON.stringify(p)}`);
  }
});
