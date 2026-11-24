import {
  obtenerHimnario,
  cambiarHimnario,
  alCambiarHimnario,
  datosHimnario,
  idBaseHimno,
  sincronizarHimnario,
} from "./himnario";

beforeEach(() => {
  localStorage.clear();
  window.electron = {actualizarConfiguracionPorClave: vi.fn(), obtenerConfiguracionPorClave: vi.fn()};
});

test("por defecto es el Himnario Moravo", () => {
  expect(obtenerHimnario()).toBe("moravo");
  expect(datosHimnario().nombre).toBe("Himnario Moravo");
  expect(datosHimnario().himnos).toHaveLength(381);
});

test("elegir Adventista lo guarda, lo avisa y lo manda a la configuración", () => {
  const escucha = vi.fn();
  const quitar = alCambiarHimnario(escucha);
  expect(cambiarHimnario("adventista")).toBe("adventista");
  expect(obtenerHimnario()).toBe("adventista");
  expect(datosHimnario().himnos).toHaveLength(236);
  expect(idBaseHimno(12)).toBe("base:adventista:12");
  expect(escucha).toHaveBeenCalledWith("adventista");
  expect(window.electron.actualizarConfiguracionPorClave).toHaveBeenCalledWith("himnario", "adventista");
  quitar();
});

test("un valor desconocido vuelve al Moravo", () => {
  expect(cambiarHimnario("inventado")).toBe("moravo");
  localStorage.setItem("himnario:v1", "otro");
  expect(obtenerHimnario()).toBe("moravo");
});

test("al abrir, manda lo que dice la configuración", async () => {
  window.electron.obtenerConfiguracionPorClave.mockResolvedValue("adventista");
  await sincronizarHimnario();
  expect(obtenerHimnario()).toBe("adventista");
  expect(window.electron.actualizarConfiguracionPorClave).not.toHaveBeenCalled();
});

test("si la configuración no lo tiene, guarda el de esta compu", async () => {
  localStorage.setItem("himnario:v1", "adventista");
  window.electron.obtenerConfiguracionPorClave.mockResolvedValue(null);
  await sincronizarHimnario();
  expect(window.electron.actualizarConfiguracionPorClave).toHaveBeenCalledWith("himnario", "adventista");
});
