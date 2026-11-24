const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const raiz = path.join(__dirname, "..");
const ids = [...fs.readFileSync(path.join(raiz, "src/utils/libros.js"), "utf8").matchAll(/id: "([a-z0-9_]+)"/g)].map((m) => m[1]);

// Igual que el servidor (/api/biblia/capitulo): quita "export default" y evalúa el array.
function leerLibro(carpeta, id) {
  const txt = fs.readFileSync(path.join(raiz, carpeta, `${id}.js`), "utf8");
  const arr = txt.replace(/^\s*(export\s+default|module\.exports\s*=)\s*/, "").trim().replace(/;+\s*$/, "");
  return vm.runInNewContext(`(${arr})`, Object.create(null));
}

test("libros.js tiene los 66 libros", () => {
  assert.equal(ids.length, 66);
  assert.equal(new Set(ids).size, 66);
});

for (const [version, carpeta] of [["RV1960", "public/data/biblia"], ["RV1909", "public/data/biblia_rv1909"]]) {
  test(`${version}: los 66 libros se leen y no tienen versículos vacíos`, () => {
    let total = 0;
    for (const id of ids) {
      const libro = leerLibro(carpeta, id);
      assert.ok(Array.isArray(libro) && libro.length > 0, `${id} vacío`);
      for (const [i, cap] of libro.entries()) {
        assert.ok(Array.isArray(cap) && cap.length > 0, `${id} cap ${i + 1} vacío`);
        for (const v of cap) assert.equal(typeof v, "string");
        total += cap.length;
      }
    }
    assert.ok(total > 31000, `solo ${total} versículos`);
  });
}

// La pantalla (src/utils/cargarLibro.js) lee los libros con JSON.parse: tienen que ser JSON puro.
// Hay UNA sola copia por versión (public/data/...), compartida con el servidor de la app móvil.
for (const carpeta of ["public/data/biblia", "public/data/biblia_rv1909"]) {
  test(`${carpeta}: los 66 libros son JSON puro (igual a lo que lee el servidor)`, () => {
    for (const id of ids) {
      const txt = fs.readFileSync(path.join(raiz, carpeta, `${id}.js`), "utf8");
      const json = JSON.parse(txt.replace(/^\s*export\s+default\s+/, "").trim().replace(/;+\s*$/, ""));
      assert.equal(JSON.stringify(json), JSON.stringify(leerLibro(carpeta, id)), id);
    }
  });
}

test("Juan 3:16 en las dos versiones", () => {
  assert.match(leerLibro("public/data/biblia", "juan")[2][15], /^Porque de tal manera amó Dios al mundo, que ha dado a su/);
  assert.match(leerLibro("public/data/biblia_rv1909", "juan")[2][15], /^Porque de tal manera amó Dios al mundo/);
});

test("no volvió la copia duplicada en src/data/biblia", () => {
  assert.ok(!fs.existsSync(path.join(raiz, "src/data/biblia")), "la RVR60 vive solo en public/data/biblia");
});

test("ningún versículo trae marcas sueltas como /n", () => {
  for (const carpeta of ["public/data/biblia", "public/data/biblia_rv1909"]) {
    for (const id of ids) {
      for (const cap of leerLibro(carpeta, id)) {
        for (const v of cap) assert.ok(!v.includes("/n"), `${carpeta}/${id}: ${v.slice(0, 60)}`);
      }
    }
  }
});
