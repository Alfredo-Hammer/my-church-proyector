import {cargarLibro} from "./cargarLibro";

afterEach(() => {
  delete global.fetch;
});

test("RV1960 se pide a /data/biblia (la misma copia que usa el servidor)", async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => 'export default [["Porque de tal manera amó Dios al mundo"]];\n',
  });
  const libro = await cargarLibro("juan", "rv1960");
  expect(global.fetch).toHaveBeenCalledWith("/data/biblia/juan.js");
  expect(libro[0][0]).toMatch(/^Porque de tal manera/);
});

test("RV1909 se pide al servidor de la app y se lee como JSON", async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => 'export default [["En el principio era el Verbo."]];\n',
  });
  const libro = await cargarLibro("1_juan", "rv1909");
  expect(global.fetch).toHaveBeenCalledWith("/data/biblia_rv1909/1_juan.js");
  expect(libro[0][0]).toBe("En el principio era el Verbo.");
});

test("un nombre de libro raro no hace ninguna petición", async () => {
  global.fetch = vi.fn();
  expect(await cargarLibro("../../etc/passwd", "rv1909")).toEqual([]);
  expect(global.fetch).not.toHaveBeenCalled();
});

test("si el servidor falla devuelve una lista vacía", async () => {
  global.fetch = vi.fn().mockResolvedValue({ok: false, status: 404});
  vi.spyOn(console, "error").mockImplementation(() => {});
  expect(await cargarLibro("rut", "rv1909")).toEqual([]);
});
