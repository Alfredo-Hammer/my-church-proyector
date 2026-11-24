import {
  obtenerVersionBiblia,
  cambiarVersionBiblia,
  alCambiarVersionBiblia,
  versionValida,
} from "./versionBiblia";

beforeEach(() => {
  localStorage.clear();
  window.electron = {actualizarConfiguracionPorClave: vi.fn()};
});

test("por defecto usa la Reina-Valera 1960", () => {
  expect(obtenerVersionBiblia()).toBe("rv1960");
});

test("cambiar la versión la guarda, la avisa y la manda a la configuración", () => {
  const escucha = vi.fn();
  const quitar = alCambiarVersionBiblia(escucha);
  expect(cambiarVersionBiblia("rv1909")).toBe("rv1909");
  expect(obtenerVersionBiblia()).toBe("rv1909");
  expect(escucha).toHaveBeenCalledWith("rv1909");
  expect(window.electron.actualizarConfiguracionPorClave).toHaveBeenCalledWith("bibliaVersion", "rv1909");
  quitar();
});

test("una versión desconocida vuelve a RV1960", () => {
  expect(versionValida("nvi")).toBe("rv1960");
  localStorage.setItem("biblia-version:v1", "inventada");
  expect(obtenerVersionBiblia()).toBe("rv1960");
});
