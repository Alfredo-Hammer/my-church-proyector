import React, { useState, useEffect, useCallback } from "react";
import {
  FaEye,
  FaEyeSlash,
  FaSave,
  FaEdit,
  FaTrash,
  FaUserTie,
  FaIdBadge,
  FaIdCard,
  FaStopwatch,
  FaBookOpen,
  FaTimes,
} from "react-icons/fa";

const ipcOk = () => Boolean(window.electron?.obtenerOradores);

// Clave de la tabla `configuracion` donde se recuerdan los ajustes de estilo
// entre transmisiones (diseño, color, animación, auto-ocultar).
const CLAVE_AJUSTES = "tercioInferiorAjustes";

// Debe coincidir con TERCIO_PLANTILLAS en main.js (id, nombre, color de muestra)
const PLANTILLAS = [
  { id: "dorado", nombre: "Dorado Clásico", color: "#d4af37" },
  { id: "esmeralda", nombre: "Esmeralda", color: "#2fbf8f" },
  { id: "borgona", nombre: "Borgoña Real", color: "#8a2f44" },
  { id: "plata", nombre: "Plata Elegante", color: "#c9cdd6" },
];

// Debe coincidir con TERCIO_DISENOS en main.js. `Muestra` dibuja un boceto del layout.
const Barra = ({ className = "", style }) => (
  <div className={`absolute bg-amber-300/80 ${className}`} style={style} />
);
const DISENOS = [
  {
    id: "clasico",
    nombre: "Clásico",
    descripcion: "Franja que se desvanece",
    Muestra: () => (
      <>
        <div className="absolute left-2 bottom-2 size-4 rounded-full border border-amber-300 bg-slate-700 z-10" />
        <div className="absolute left-4 right-0 bottom-2 h-4 bg-gradient-to-r from-amber-300/50 to-transparent" />
      </>
    ),
  },
  {
    id: "minimal",
    nombre: "Minimalista",
    descripcion: "Solo texto y una línea",
    Muestra: () => (
      <>
        <Barra className="left-3 bottom-2 w-0.5 h-5" />
        <Barra className="left-5 bottom-[26px] h-1.5 w-12 !bg-white/80" />
        <Barra className="left-5 bottom-[18px] h-1 w-8" />
      </>
    ),
  },
  {
    id: "tarjeta",
    nombre: "Tarjeta",
    descripcion: "Caja compacta con logo",
    Muestra: () => (
      <div className="absolute left-3 bottom-2 h-6 w-16 rounded-md border-l-2 border-amber-300 bg-slate-600/80 flex items-center gap-1 pl-1">
        <div className="size-3.5 rounded-sm bg-slate-400" />
        <div className="h-1 w-7 bg-white/70 rounded" />
      </div>
    ),
  },
  {
    id: "banda",
    nombre: "Banda completa",
    descripcion: "Franja de borde a borde",
    Muestra: () => (
      <>
        <div className="absolute inset-x-0 bottom-0 h-6 bg-slate-600/80 border-t-2 border-amber-300" />
        <div className="absolute left-2 bottom-1 size-4 rounded-full bg-slate-400" />
        <div className="absolute left-8 bottom-3 h-1 w-10 bg-white/70 rounded" />
      </>
    ),
  },
  {
    id: "cristal",
    nombre: "Cristal",
    descripcion: "Píldora translúcida",
    Muestra: () => (
      <div className="absolute left-3 bottom-2 h-6 w-16 rounded-full border border-white/40 bg-slate-600/70 flex items-center gap-1 pl-0.5">
        <div className="size-5 rounded-full border border-amber-300 bg-slate-400" />
        <div className="h-1 w-6 bg-white/70 rounded" />
      </div>
    ),
  },
  {
    id: "moderno",
    nombre: "Moderno",
    descripcion: "Bloques con corte diagonal",
    Muestra: () => (
      <>
        <div className="absolute left-3 bottom-2 size-7 bg-slate-500" />
        <div
          className="absolute left-10 bottom-[22px] h-3.5 w-16 bg-amber-300"
          style={{ clipPath: "polygon(0 0,100% 0,85% 100%,0 100%)" }}
        />
        <div
          className="absolute left-10 bottom-2 h-3 w-12 bg-slate-600"
          style={{ clipPath: "polygon(0 0,100% 0,82% 100%,0 100%)" }}
        />
      </>
    ),
  },
];

export default function TercioInferior() {
  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("");
  const [tema, setTema] = useState("");
  const [plantilla, setPlantilla] = useState("dorado");
  const [diseno, setDiseno] = useState("clasico");
  const [duracionEntrada, setDuracionEntrada] = useState(700);
  const [duracionSalida, setDuracionSalida] = useState(600);
  const [autoOcultar, setAutoOcultar] = useState(false);
  const [autoOcultarMs, setAutoOcultarMs] = useState(6000);
  const [autoMostrar, setAutoMostrar] = useState(false);
  const [oradores, setOradores] = useState([]);
  const [oradorSeleccionadoId, setOradorSeleccionadoId] = useState("");
  const [visible, setVisible] = useState(false);
  const [mensaje, setMensaje] = useState(null); // {texto, tipo}
  const [cargando, setCargando] = useState(false);
  const [ajustesCargados, setAjustesCargados] = useState(false);

  const mostrarMensaje = useCallback((texto, tipo = "success") => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 2500);
  }, []);

  const cargarOradores = useCallback(async () => {
    if (!ipcOk()) return;
    try {
      const lista = await window.electron.obtenerOradores();
      setOradores(Array.isArray(lista) ? lista : []);
    } catch {
      setOradores([]);
    }
  }, []);

  useEffect(() => {
    cargarOradores();
  }, [cargarOradores]);

  // Restaurar los ajustes de la última vez
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const crudo = await window.electron?.obtenerConfiguracionPorClave?.(CLAVE_AJUSTES);
        const a = crudo ? JSON.parse(crudo) : null;
        if (a && !cancelado) {
          if (PLANTILLAS.some((p) => p.id === a.plantilla)) setPlantilla(a.plantilla);
          if (DISENOS.some((d) => d.id === a.diseno)) setDiseno(a.diseno);
          if (Number(a.duracionEntrada) > 0) setDuracionEntrada(Number(a.duracionEntrada));
          if (Number(a.duracionSalida) > 0) setDuracionSalida(Number(a.duracionSalida));
          if (typeof a.autoOcultar === "boolean") setAutoOcultar(a.autoOcultar);
          if (Number(a.autoOcultarMs) > 0) setAutoOcultarMs(Number(a.autoOcultarMs));
          if (typeof a.autoMostrar === "boolean") setAutoMostrar(a.autoMostrar);
          if (typeof a.tema === "string") setTema(a.tema);
        }
      } catch {
        // sin ajustes guardados o dañados: se usan los valores por defecto
      } finally {
        if (!cancelado) setAjustesCargados(true);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  // Guardar automáticamente cada cambio (con una pequeña espera mientras se escribe)
  useEffect(() => {
    if (!ajustesCargados) return;
    const t = setTimeout(() => {
      window.electron
        ?.actualizarConfiguracionPorClave?.(
          CLAVE_AJUSTES,
          JSON.stringify({
            plantilla,
            diseno,
            duracionEntrada: Number(duracionEntrada) || 700,
            duracionSalida: Number(duracionSalida) || 600,
            autoOcultar,
            autoOcultarMs: Number(autoOcultarMs) || 6000,
            autoMostrar,
            tema,
          }),
        )
        ?.catch?.(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [ajustesCargados, plantilla, diseno, duracionEntrada, duracionSalida, autoOcultar, autoOcultarMs, autoMostrar, tema]);

  // `datos` permite mostrar a una persona recién elegida sin esperar a que
  // se actualicen los campos del formulario.
  const mostrar = async (datos) => {
    const n = (datos?.nombre ?? nombre).trim();
    const c = (datos?.cargo ?? cargo).trim();
    const t = tema.trim();
    if (!n && !t) {
      mostrarMensaje("Escribe un nombre o un tema/evento.", "error");
      return;
    }
    if (!ipcOk() && !window.electron?.mostrarTercioInferior) {
      mostrarMensaje("No se pudo conectar con la app.", "error");
      return;
    }
    setCargando(true);
    try {
      await window.electron.mostrarTercioInferior({
        nombre: n,
        cargo: c,
        tema: t,
        plantilla,
        diseno,
        duracionEntrada: Number(duracionEntrada) || 700,
        duracionSalida: Number(duracionSalida) || 600,
        autoOcultarMs: autoOcultar ? Number(autoOcultarMs) || 0 : 0,
      });
      setVisible(true);
      mostrarMensaje("Tercio inferior mostrado en OBS.");
    } catch {
      mostrarMensaje("No se pudo mostrar.", "error");
    } finally {
      setCargando(false);
    }
  };

  const seleccionarOrador = (id) => {
    setOradorSeleccionadoId(id);
    if (!id) return;
    const orador = oradores.find((o) => String(o.id) === String(id));
    if (orador) {
      setNombre(orador.nombre || "");
      setCargo(orador.cargo || "");
      if (autoMostrar) mostrar({ nombre: orador.nombre || "", cargo: orador.cargo || "" });
    }
  };

  const elegirPlantilla = async (id) => {
    setPlantilla(id);
    if (visible) {
      try {
        await window.electron?.cambiarPlantillaTercioInferior?.(id);
      } catch {}
    }
  };

  const elegirDiseno = async (id) => {
    setDiseno(id);
    if (visible) {
      try {
        await window.electron?.cambiarDisenoTercioInferior?.(id);
      } catch {}
    }
  };

  const ocultar = async () => {
    setCargando(true);
    try {
      await window.electron?.ocultarTercioInferior?.();
      setVisible(false);
      mostrarMensaje("Tercio inferior ocultado.");
    } catch {
      mostrarMensaje("No se pudo ocultar.", "error");
    } finally {
      setCargando(false);
    }
  };

  const guardarPersona = async () => {
    const n = nombre.trim();
    const c = cargo.trim();
    if (!n) {
      mostrarMensaje("Escribe un nombre antes de guardar.", "error");
      return;
    }
    // Evita duplicados: si ya hay alguien guardado con ese nombre, no se crea otro
    const existente = oradores.find(
      (o) => (o.nombre || "").trim().toLowerCase() === n.toLowerCase(),
    );
    if (existente) {
      setOradorSeleccionadoId(String(existente.id));
      if ((existente.cargo || "").trim() === c) {
        mostrarMensaje("Esta persona ya está guardada.");
        return;
      }
      const r = await window.electron?.actualizarOrador?.({
        id: Number(existente.id),
        nombre: n,
        cargo: c,
      });
      if (r?.success) {
        mostrarMensaje("Cargo actualizado en la persona guardada.");
        await cargarOradores();
      } else {
        mostrarMensaje("No se pudo actualizar.", "error");
      }
      return;
    }
    const resultado = await window.electron?.agregarOrador?.({ nombre: n, cargo: c });
    if (resultado?.success) {
      mostrarMensaje("Persona guardada.");
      await cargarOradores();
      setOradorSeleccionadoId(String(resultado.id));
    } else {
      mostrarMensaje("No se pudo guardar.", "error");
    }
  };

  const actualizarPersona = async () => {
    if (!oradorSeleccionadoId) {
      mostrarMensaje("Selecciona una persona guardada primero.", "error");
      return;
    }
    const n = nombre.trim();
    if (!n) {
      mostrarMensaje("Escribe un nombre.", "error");
      return;
    }
    const resultado = await window.electron?.actualizarOrador?.({
      id: Number(oradorSeleccionadoId),
      nombre: n,
      cargo: cargo.trim(),
    });
    if (resultado?.success) {
      mostrarMensaje("Persona actualizada.");
      await cargarOradores();
    } else {
      mostrarMensaje("No se pudo actualizar.", "error");
    }
  };

  const eliminarPersona = async () => {
    if (!oradorSeleccionadoId) {
      mostrarMensaje("Selecciona una persona guardada primero.", "error");
      return;
    }
    const resultado = await window.electron?.eliminarOrador?.(Number(oradorSeleccionadoId));
    if (resultado?.success) {
      mostrarMensaje("Persona eliminada.");
      setOradorSeleccionadoId("");
      setNombre("");
      setCargo("");
      await cargarOradores();
    } else {
      mostrarMensaje("No se pudo eliminar.", "error");
    }
  };

  const etiqueta =
    "block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5";
  const campo =
    "w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50";
  const botonIcono =
    "size-9 shrink-0 flex items-center justify-center rounded-lg border text-sm transition disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="p-4 sm:p-5 max-w-6xl mx-auto">
      {mensaje && (
        <div
          role="status"
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium border shadow-lg backdrop-blur ${
            mensaje.tipo === "error"
              ? "bg-red-950/90 border-red-500/40 text-red-200"
              : "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FaIdCard className="text-amber-400" />
            Tercio Inferior
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Nombre y cargo sobre la transmisión en OBS. La URL está en
            Servidor / OBS.
          </p>
        </div>
        <div
          className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border ${
            visible
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-white/5 border-white/10 text-slate-400"
          }`}
        >
          <span
            className={`size-2 rounded-full ${visible ? "bg-amber-400 animate-pulse" : "bg-slate-600"}`}
          />
          {visible ? "VISIBLE EN OBS" : "OCULTO"}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        {/* ── Contenido ── */}
        <section className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
          <div>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <label
                className="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                htmlFor="ti-persona"
              >
                Personas guardadas
              </label>
              <label
                className="flex items-center gap-1.5 cursor-pointer select-none"
                title="Al elegir una persona, se muestra en OBS sin pulsar MOSTRAR"
              >
                <input
                  type="checkbox"
                  checked={autoMostrar}
                  onChange={(e) => setAutoMostrar(e.target.checked)}
                  className="size-3.5 accent-amber-500"
                />
                <span className="text-[11px] text-slate-300">Mostrar al elegir</span>
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                id="ti-persona"
                value={oradorSeleccionadoId}
                onChange={(e) => seleccionarOrador(e.target.value)}
                disabled={oradores.length === 0}
                className={`${campo} min-w-0 flex-1 disabled:opacity-60`}
              >
                <option value="">
                  {oradores.length === 0
                    ? "Aún no hay personas guardadas"
                    : "— Elegir persona guardada —"}
                </option>
                {oradores.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                    {o.cargo ? ` — ${o.cargo}` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={guardarPersona}
                title="Guardar (si ya existe con ese nombre, no se duplica)"
                aria-label="Guardar persona"
                className={`${botonIcono} bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/30 text-emerald-300`}
              >
                <FaSave />
              </button>
              <button
                type="button"
                onClick={actualizarPersona}
                disabled={!oradorSeleccionadoId}
                title="Actualizar la persona seleccionada"
                aria-label="Actualizar la persona seleccionada"
                className={`${botonIcono} bg-sky-600/20 hover:bg-sky-600/30 border-sky-500/30 text-sky-300`}
              >
                <FaEdit />
              </button>
              <button
                type="button"
                onClick={eliminarPersona}
                disabled={!oradorSeleccionadoId}
                title="Eliminar la persona seleccionada"
                aria-label="Eliminar la persona seleccionada"
                className={`${botonIcono} bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-300`}
              >
                <FaTrash />
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={etiqueta} htmlFor="ti-nombre">
                <FaUserTie className="inline mr-1.5 mb-0.5" />
                Nombre
              </label>
              <input
                id="ti-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && mostrar()}
                placeholder="Juan Pérez"
                className={campo}
              />
            </div>
            <div>
              <label className={etiqueta} htmlFor="ti-cargo">
                <FaIdBadge className="inline mr-1.5 mb-0.5" />
                Cargo
              </label>
              <input
                id="ti-cargo"
                type="text"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && mostrar()}
                placeholder="Pastor"
                className={campo}
              />
            </div>
          </div>

          <div>
            <label className={etiqueta} htmlFor="ti-tema">
              <FaBookOpen className="inline mr-1.5 mb-0.5" />
              Tema o evento <span className="normal-case font-normal text-slate-500">(opcional)</span>
            </label>
            <div className="relative">
              <input
                id="ti-tema"
                type="text"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && mostrar()}
                placeholder="Tema de la prédica o nombre del evento"
                className={`${campo} ${tema ? "pr-9" : ""}`}
              />
              {tema && (
                <button
                  type="button"
                  onClick={() => setTema("")}
                  title="Borrar el tema"
                  aria-label="Borrar el tema"
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <FaTimes className="text-xs" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Se recuerda para la próxima vez; bórralo cuando cambie. Si dejas el nombre vacío, se muestra solo el tema o evento.
            </p>
          </div>

          <div>
            <span className={etiqueta}>
              <FaStopwatch className="inline mr-1.5 mb-0.5" />
              Animación (milisegundos)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-1">Aparición</span>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={duracionEntrada}
                  onChange={(e) => setDuracionEntrada(e.target.value)}
                  className={campo}
                />
              </label>
              <label className="block">
                <span className="block text-[10px] text-slate-500 mb-1">Desaparición</span>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={duracionSalida}
                  onChange={(e) => setDuracionSalida(e.target.value)}
                  className={campo}
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-slate-800/40 border border-white/10 rounded-lg px-3 py-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoOcultar}
                onChange={(e) => setAutoOcultar(e.target.checked)}
                className="size-4 accent-amber-500"
              />
              <span className="text-xs font-medium text-slate-300">
                Ocultar automáticamente
              </span>
            </label>
            {autoOcultar ? (
              <label className="flex items-center gap-2 ml-auto">
                <span className="text-[10px] text-slate-500">después de</span>
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={autoOcultarMs}
                  onChange={(e) => setAutoOcultarMs(e.target.value)}
                  className={`${campo} !w-24 !py-1`}
                />
                <span className="text-[10px] text-slate-500">ms</span>
              </label>
            ) : (
              <span className="text-[10px] text-slate-500 ml-auto">
                Visible hasta que toques OCULTAR
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => mostrar()}
              disabled={cargando}
              className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-lg transition disabled:opacity-50"
            >
              <FaEye /> MOSTRAR
            </button>
            <button
              onClick={ocultar}
              disabled={cargando}
              className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-lg transition disabled:opacity-50"
            >
              <FaEyeSlash /> OCULTAR
            </button>
          </div>
        </section>

        {/* ── Estilo ── */}
        <section className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
          <div>
            <span className={etiqueta}>Diseño</span>
            <div className="grid grid-cols-3 gap-2">
              {DISENOS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => elegirDiseno(d.id)}
                  title={d.descripcion}
                  aria-pressed={diseno === d.id}
                  className={`text-left rounded-lg border p-1.5 transition ${
                    diseno === d.id
                      ? "border-amber-400/70 bg-amber-500/10"
                      : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <div className="relative h-11 w-full overflow-hidden rounded bg-slate-900">
                    <d.Muestra />
                  </div>
                  <div className="mt-1 px-0.5 text-xs font-medium text-white leading-tight truncate">
                    {d.nombre}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={etiqueta}>Color</span>
            <div className="grid grid-cols-2 gap-2">
              {PLANTILLAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => elegirPlantilla(p.id)}
                  aria-pressed={plantilla === p.id}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition ${
                    plantilla === p.id
                      ? "border-white/40 bg-white/10"
                      : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <span
                    className="size-4 shrink-0 rounded-full border border-white/20"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-xs text-slate-200 leading-tight truncate">
                    {p.nombre}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Tus ajustes se guardan solos y se recuerdan en la próxima
            transmisión. Los cambios de diseño y color se aplican al instante
            si el tercio ya está visible en OBS.
          </p>
        </section>
      </div>
    </div>
  );
}
