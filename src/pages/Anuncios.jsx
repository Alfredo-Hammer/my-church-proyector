import React, {useState, useEffect, useRef, useCallback} from "react";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaSave,
  FaTimes,
  FaStop,
  FaArrowUp,
  FaArrowDown,
  FaBroadcastTower,
  FaToggleOn,
  FaToggleOff,
  FaBullhorn,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaEye,
  FaPalette,
  FaLayerGroup,
} from "react-icons/fa";

// ── Persistencia ─────────────────────────────────────────────────────────────
const LS_KEY = "gloryview_anuncios_v1";
const lsCargar = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
};
const lsGuardar = (a) => localStorage.setItem(LS_KEY, JSON.stringify(a));
const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);
const ipcOk = () => Boolean(window.electron?.obtenerAnuncios);

// ── Plantillas ───────────────────────────────────────────────────────────────
export const PLANTILLAS = {
  moderno: {
    nombre: "Moderno",
    icono: "✦",
    // Proyector
    backgroundColor: "#0f172a",
    textColor: "#e2e8f0",
    titleColor: "#34d399",
    overlayColor: "rgba(15,23,42,0.85)",
    // Operador preview
    previewClass: "from-slate-900 via-slate-800 to-slate-900",
    borderClass: "border-emerald-500/50",
    accentClass: "text-emerald-400",
    glowClass: "shadow-emerald-900/60",
    animClass: "anim-pulse-emerald",
  },
  dorado: {
    nombre: "Iglesia Dorado",
    icono: "✝",
    backgroundColor: "#1c0a00",
    textColor: "#fde68a",
    titleColor: "#f59e0b",
    overlayColor: "rgba(28,10,0,0.80)",
    previewClass: "from-amber-950 via-yellow-950 to-stone-950",
    borderClass: "border-amber-500/50",
    accentClass: "text-amber-400",
    glowClass: "shadow-amber-900/60",
    animClass: "anim-pulse-amber",
  },
  celestial: {
    nombre: "Celestial",
    icono: "★",
    backgroundColor: "#06082b",
    textColor: "#e0e7ff",
    titleColor: "#818cf8",
    overlayColor: "rgba(6,8,43,0.82)",
    previewClass: "from-indigo-950 via-blue-950 to-violet-950",
    borderClass: "border-indigo-400/50",
    accentClass: "text-indigo-300",
    glowClass: "shadow-indigo-900/60",
    animClass: "anim-pulse-indigo",
  },
  naturaleza: {
    nombre: "Naturaleza",
    icono: "🌿",
    backgroundColor: "#022c1a",
    textColor: "#d1fae5",
    titleColor: "#34d399",
    overlayColor: "rgba(2,44,26,0.80)",
    previewClass: "from-green-950 via-teal-950 to-emerald-950",
    borderClass: "border-green-500/50",
    accentClass: "text-green-400",
    glowClass: "shadow-green-900/60",
    animClass: "anim-pulse-green",
  },
  amanecer: {
    nombre: "Amanecer",
    icono: "☀",
    backgroundColor: "#1c0700",
    textColor: "#fef3c7",
    titleColor: "#fb923c",
    overlayColor: "rgba(28,7,0,0.80)",
    previewClass: "from-orange-950 via-red-950 to-rose-950",
    borderClass: "border-orange-500/50",
    accentClass: "text-orange-400",
    glowClass: "shadow-orange-900/60",
    animClass: "anim-pulse-orange",
  },
  majestad: {
    nombre: "Majestad",
    icono: "♦",
    backgroundColor: "#1a0533",
    textColor: "#f3e8ff",
    titleColor: "#c084fc",
    overlayColor: "rgba(26,5,51,0.82)",
    previewClass: "from-purple-950 via-violet-950 to-fuchsia-950",
    borderClass: "border-purple-500/50",
    accentClass: "text-purple-400",
    glowClass: "shadow-purple-900/60",
    animClass: "anim-pulse-purple",
  },
};

// ── Proyectar slide ───────────────────────────────────────────────────────────
// El proyector aplica la plantilla GSAP global automáticamente si está activa.
// Para anuncios usamos el canal enviarVersiculo para aprovechar el pipeline global.
function proyectarSlide(anuncio) {
  window.electron?.abrirProyector?.();
  // Enviar como versículo/himno para que pase por el pipeline de PlantillaGSAP global
  window.electron?.enviarVersiculo?.({
    parrafo: anuncio.texto,
    titulo: anuncio.titulo ? `${anuncio.titulo}` : " ",
    numero: " ",
    origen: "himno",
  });
}

function limpiarProyeccion() {
  localStorage.removeItem("proyector-slide-data");
  window.electron?.enviarVersiculo?.({
    parrafo: "",
    titulo: " ",
    numero: " ",
    origen: "clear",
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, tipo = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, {id, msg, tipo}]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  }, []);
  return {toasts, add};
}

// ── API con fallback ──────────────────────────────────────────────────────────
async function apiAnuncios(method, data) {
  if (!ipcOk()) return null;
  try {
    switch (method) {
      case "list":
        return await window.electron.obtenerAnuncios();
      case "add":
        return await window.electron.agregarAnuncio(data);
      case "update":
        return await window.electron.actualizarAnuncio(data);
      case "delete":
        return await window.electron.eliminarAnuncio(data);
      case "sort":
        return await window.electron.reordenarAnuncios(data);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ── Componente PreviewCard ─────────────────────────────────────────────────────
const PreviewCard = ({anuncio, plt, enVivo, onClick, seleccionado}) => (
  <div
    onClick={onClick}
    className={`relative rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-hidden
      ${
        seleccionado
          ? plt.borderClass + " scale-[1.02] shadow-xl " + plt.glowClass
          : "border-white/10 hover:border-white/30 hover:scale-[1.01]"
      }
      ${enVivo ? "ring-2 ring-offset-2 ring-offset-slate-950 ring-orange-500" : ""}
    `}
    style={{minHeight: "140px"}}
  >
    {/* Fondo animado */}
    <div
      className={`absolute inset-0 bg-gradient-to-br ${plt.previewClass} ${plt.animClass}`}
    />

    {/* Marco decorativo */}
    <div
      className={`absolute inset-[6px] rounded-xl border ${plt.borderClass} pointer-events-none`}
    />
    <div
      className={`absolute inset-[10px] rounded-lg border ${plt.borderClass} opacity-40 pointer-events-none`}
    />

    {/* Esquinas decorativas */}
    <CornerDecos color={plt.accentClass} />

    {/* Contenido */}
    <div
      className="relative z-10 flex flex-col items-center justify-center p-4 text-center h-full"
      style={{minHeight: "140px"}}
    >
      {!anuncio.activo && (
        <span className="absolute top-2 right-2 text-[9px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded-full">
          Inactivo
        </span>
      )}
      {enVivo && (
        <span className="absolute top-2 left-2 flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          EN VIVO
        </span>
      )}
      {anuncio.titulo && (
        <p className={`text-xs font-bold mb-1 ${plt.accentClass}`}>
          {plt.icono} {anuncio.titulo}
        </p>
      )}
      <p className="text-sm font-medium text-white/90 leading-snug line-clamp-3">
        {anuncio.texto}
      </p>
      <p className={`text-[10px] mt-2 ${plt.accentClass} opacity-70`}>
        {plt.nombre}
      </p>
    </div>
  </div>
);

const CornerDecos = ({color}) => (
  <>
    {[
      ["top-1.5 left-1.5", "border-t border-l"],
      ["top-1.5 right-1.5", "border-t border-r"],
      ["bottom-1.5 left-1.5", "border-b border-l"],
      ["bottom-1.5 right-1.5", "border-b border-r"],
    ].map(([pos, bord], i) => (
      <div
        key={i}
        className={`absolute ${pos} w-3 h-3 ${bord} ${color} opacity-60 pointer-events-none`}
      />
    ))}
  </>
);

// ── Selector de plantillas ────────────────────────────────────────────────────
const SelectorPlantilla = ({valor, onChange}) => (
  <div className="grid grid-cols-3 gap-2">
    {Object.entries(PLANTILLAS).map(([id, plt]) => (
      <button
        key={id}
        onClick={() => onChange(id)}
        className={`relative rounded-xl border-2 p-3 text-center transition-all overflow-hidden
          ${
            valor === id
              ? plt.borderClass + " scale-105 shadow-lg " + plt.glowClass
              : "border-white/10 hover:border-white/25 hover:scale-[1.02]"
          }`}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br ${plt.previewClass} opacity-80`}
        />
        <div className="relative z-10">
          <p className={`text-lg mb-0.5 ${plt.accentClass}`}>{plt.icono}</p>
          <p className="text-[10px] text-white/80 font-semibold leading-tight">
            {plt.nombre}
          </p>
          {valor === id && (
            <div
              className={`mt-1 mx-auto w-1.5 h-1.5 rounded-full bg-current ${plt.accentClass}`}
            />
          )}
        </div>
      </button>
    ))}
  </div>
);

// ── Componente principal ──────────────────────────────────────────────────────
export default function Anuncios() {
  const [anuncios, setAnuncios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [usandoLocal, setUsandoLocal] = useState(false);
  const [selId, setSelId] = useState(null); // anuncio seleccionado para editar
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    texto: "",
    titulo: "",
    plantilla: "moderno",
  });
  const [modoNuevo, setModoNuevo] = useState(false);

  const [proyectando, setProyectando] = useState(false);
  const [indiceActual, setIndiceActual] = useState(0);
  const [intervaloSeg, setIntervaloSeg] = useState(8);
  const timerRef = useRef(null);
  const activosRef = useRef([]);

  const {toasts, add: toast} = useToast();
  const activos = anuncios.filter((a) => a.activo);
  activosRef.current = activos;

  // ── Carga inicial ──
  useEffect(() => {
    (async () => {
      const dbData = await apiAnuncios("list");
      if (Array.isArray(dbData)) {
        setAnuncios(
          dbData.map((a) => ({
            ...a,
            activo: Boolean(a.activo),
            plantilla: a.plantilla || "moderno",
          })),
        );
        lsGuardar(dbData);
      } else {
        setAnuncios(lsCargar());
        setUsandoLocal(true);
      }
      setCargando(false);
    })();
  }, []);

  // ── Auto-avance ──
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!proyectando || activos.length === 0) return;
    timerRef.current = setInterval(() => {
      setIndiceActual((prev) => {
        const next = (prev + 1) % activosRef.current.length;
        proyectarSlide(activosRef.current[next]);
        return next;
      });
    }, intervaloSeg * 1000);
    return () => clearInterval(timerRef.current);
  }, [proyectando, activos.length, intervaloSeg]);

  // ── Proyección ──
  const iniciarProyeccion = () => {
    if (activos.length === 0) return;
    setIndiceActual(0);
    proyectarSlide(activos[0]);
    setProyectando(true);
  };

  const detenerProyeccion = () => {
    clearInterval(timerRef.current);
    setProyectando(false);
    limpiarProyeccion();
  };

  const proyectarIndice = (idx) => {
    setIndiceActual(idx);
    proyectarSlide(activos[idx]);
  };

  // ── CRUD ──
  const guardar = async () => {
    if (!form.texto.trim()) return;
    const selAnuncio = anuncios.find((a) => a.id === selId);

    if (editando && selAnuncio) {
      const updated = {...selAnuncio, ...form};
      const res = await apiAnuncios("update", updated);
      const arr = anuncios.map((a) => (a.id === selId ? updated : a));
      setAnuncios(arr);
      lsGuardar(arr);
      if (!res?.success) setUsandoLocal(true);
      toast("Anuncio actualizado");
    } else {
      const res = await apiAnuncios("add", {...form, activo: true});
      let nuevo;
      if (res?.success && res.id) {
        nuevo = {id: res.id, ...form, activo: true, orden: anuncios.length};
      } else {
        nuevo = {id: genId(), ...form, activo: true, orden: anuncios.length};
        setUsandoLocal(true);
        toast("Guardado localmente", "warning");
      }
      const arr = [...anuncios, nuevo];
      setAnuncios(arr);
      lsGuardar(arr);
      if (res?.success) toast("Anuncio guardado");
    }
    setEditando(false);
    setModoNuevo(false);
    setSelId(null);
  };

  const eliminar = async (id) => {
    if (!window.confirm("¿Eliminar este anuncio?")) return;
    await apiAnuncios("delete", id);
    const arr = anuncios.filter((a) => a.id !== id);
    setAnuncios(arr);
    lsGuardar(arr);
    if (selId === id) {
      setSelId(null);
      setEditando(false);
    }
    toast("Eliminado", "info");
  };

  const toggleActivo = async (a) => {
    const updated = {...a, activo: !a.activo};
    await apiAnuncios("update", updated);
    const arr = anuncios.map((x) => (x.id === a.id ? updated : x));
    setAnuncios(arr);
    lsGuardar(arr);
  };

  const mover = async (idx, dir) => {
    const arr = [...anuncios];
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    setAnuncios(arr);
    lsGuardar(arr);
    await apiAnuncios(
      "sort",
      arr.map((a) => a.id),
    );
  };

  const abrirNuevo = () => {
    setForm({texto: "", titulo: "", plantilla: "moderno"});
    setSelId(null);
    setEditando(false);
    setModoNuevo(true);
  };

  const abrirEdicion = (a) => {
    setForm({
      texto: a.texto,
      titulo: a.titulo || "",
      plantilla: a.plantilla || "moderno",
    });
    setSelId(a.id);
    setEditando(true);
    setModoNuevo(false);
  };

  if (cargando)
    return (
      <div className="bg-slate-950 h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-transparent border-t-orange-400 animate-spin" />
      </div>
    );

  const formularioAbierto = modoNuevo || editando;

  return (
    <div className="bg-[#080c14] text-slate-100 h-full flex flex-col overflow-hidden">
      {/* CSS de animaciones */}
      <style>{`
        @keyframes pulseEmerald { 0%,100%{opacity:1} 50%{opacity:0.85} }
        @keyframes pulseAmber   { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes gradShift    { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }

        .anim-pulse-emerald { animation: pulseEmerald 4s ease-in-out infinite; }
        .anim-pulse-amber   { background-size:200% 200%; animation: gradShift 6s ease infinite; }
        .anim-pulse-indigo  { background-size:200% 200%; animation: gradShift 5s ease infinite; }
        .anim-pulse-green   { background-size:200% 200%; animation: gradShift 7s ease infinite; }
        .anim-pulse-orange  { background-size:200% 200%; animation: gradShift 5s ease infinite; }
        .anim-pulse-purple  { background-size:200% 200%; animation: gradShift 6s ease infinite; }
      `}</style>

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border shadow-xl text-xs min-w-[180px]
            ${
              t.tipo === "success"
                ? "bg-slate-900/95 border-l-2 border-l-emerald-500 border-white/10"
                : t.tipo === "warning"
                  ? "bg-slate-900/95 border-l-2 border-l-amber-500 border-white/10"
                  : "bg-slate-900/95 border-l-2 border-l-blue-500 border-white/10"
            }`}
          >
            {t.tipo === "success" ? (
              <FaCheck className="text-emerald-400 text-[10px]" />
            ) : (
              "ℹ"
            )}{" "}
            {t.msg}
          </div>
        ))}
      </div>

      {/* Banner localStorage */}
      {usandoLocal && (
        <div className="shrink-0 px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
          <span className="text-amber-400 text-xs">⚠</span>
          <p className="text-xs text-amber-300">
            Guardando localmente — reinicia la app para sincronizar con la base
            de datos.
          </p>
        </div>
      )}

      {/* ── Header ── */}
      <div className="shrink-0 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/50 flex-wrap gap-y-2">
        <div className="flex items-center gap-2">
          <FaBullhorn className="text-orange-400" />
          <span className="text-sm font-semibold text-white">Anuncios</span>
          <span className="text-xs text-slate-500">
            {activos.length} activos
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Intervalo */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700/60 rounded-lg px-2 py-1.5">
            <span className="text-[10px] text-slate-400">Cada</span>
            <input
              type="number"
              min={3}
              max={60}
              value={intervaloSeg}
              onChange={(e) =>
                setIntervaloSeg(Math.max(3, parseInt(e.target.value) || 8))
              }
              className="w-8 bg-transparent text-white text-xs text-center focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">seg</span>
          </div>

          {/* Controles */}
          {proyectando ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  proyectarIndice(
                    (indiceActual - 1 + activos.length) % activos.length,
                  )
                }
                disabled={activos.length <= 1}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <FaChevronLeft className="text-[9px]" />
              </button>
              <span className="text-[11px] text-orange-300 tabular-nums px-1 font-mono">
                {indiceActual + 1}/{activos.length}
              </span>
              <button
                onClick={() =>
                  proyectarIndice((indiceActual + 1) % activos.length)
                }
                disabled={activos.length <= 1}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <FaChevronRight className="text-[9px]" />
              </button>
              <button
                onClick={detenerProyeccion}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition-colors"
              >
                <FaStop className="text-[9px]" /> Detener
              </button>
            </div>
          ) : (
            <button
              onClick={iniciarProyeccion}
              disabled={activos.length === 0}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 border border-orange-500/30 text-white text-xs font-semibold transition-colors"
              title={
                activos.length === 0 ? "Agrega al menos un anuncio activo" : ""
              }
            >
              <FaBroadcastTower className="text-[10px]" /> Proyectar
            </button>
          )}

          <button
            onClick={abrirNuevo}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 text-white text-xs font-semibold transition-colors"
          >
            <FaPlus className="text-[9px]" /> Nuevo
          </button>
        </div>
      </div>

      {/* ── Cuerpo: dos columnas ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Izquierda: lista de anuncios ── */}
        <div className="flex-1 min-w-0 overflow-y-auto p-3">
          {anuncios.length === 0 && !formularioAbierto && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FaBullhorn className="text-4xl text-slate-700 mb-4" />
              <h3 className="text-base font-semibold text-slate-400 mb-2">
                Sin anuncios
              </h3>
              <p className="text-slate-500 text-sm mb-4 max-w-xs">
                Crea anuncios con plantillas visuales para proyectarlos de forma
                rotativa.
              </p>
              <button
                onClick={abrirNuevo}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 text-white text-sm font-semibold transition-colors"
              >
                <FaPlus className="text-xs" /> Crear primer anuncio
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {anuncios.map((a, idx) => {
              const plt = PLANTILLAS[a.plantilla] || PLANTILLAS.moderno;
              const enVivo = proyectando && activos[indiceActual]?.id === a.id;
              return (
                <div key={a.id} className="flex flex-col gap-1.5">
                  <PreviewCard
                    anuncio={a}
                    plt={plt}
                    enVivo={enVivo}
                    seleccionado={selId === a.id}
                    onClick={() => {
                      if (selId === a.id && editando) {
                        setSelId(null);
                        setEditando(false);
                      } else abrirEdicion(a);
                    }}
                  />
                  {/* Controles bajo la card */}
                  <div className="flex items-center gap-1 px-1">
                    <button
                      onClick={() => toggleActivo(a)}
                      className="w-7 h-6 flex items-center justify-center text-base transition-colors hover:scale-110"
                      title={a.activo ? "Desactivar" : "Activar"}
                    >
                      {a.activo ? (
                        <FaToggleOn className="text-emerald-400" />
                      ) : (
                        <FaToggleOff className="text-slate-600" />
                      )}
                    </button>
                    {proyectando && a.activo && (
                      <button
                        onClick={() =>
                          proyectarIndice(
                            activos.findIndex((x) => x.id === a.id),
                          )
                        }
                        className="w-6 h-6 rounded-md bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/25 flex items-center justify-center text-orange-400 transition-colors"
                        title="Proyectar ahora"
                      >
                        <FaEye className="text-[9px]" />
                      </button>
                    )}
                    <div className="flex-1" />
                    <button
                      onClick={() => mover(idx, -1)}
                      disabled={idx === 0}
                      className="w-6 h-6 rounded-md bg-white/4 hover:bg-white/10 border border-white/6 flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                    >
                      <FaArrowUp className="text-[9px]" />
                    </button>
                    <button
                      onClick={() => mover(idx, 1)}
                      disabled={idx === anuncios.length - 1}
                      className="w-6 h-6 rounded-md bg-white/4 hover:bg-white/10 border border-white/6 flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
                    >
                      <FaArrowDown className="text-[9px]" />
                    </button>
                    <button
                      onClick={() => eliminar(a.id)}
                      className="w-6 h-6 rounded-md bg-white/4 hover:bg-red-500/20 border border-white/6 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <FaTrash className="text-[9px]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Derecha: editor ── */}
        {formularioAbierto && (
          <div className="w-72 xl:w-80 shrink-0 border-l border-slate-800 flex flex-col bg-slate-900/40 overflow-y-auto">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaPalette
                  className={`text-sm ${PLANTILLAS[form.plantilla]?.accentClass || "text-slate-400"}`}
                />
                <span className="text-sm font-semibold text-white">
                  {editando ? "Editar" : "Nuevo"} anuncio
                </span>
              </div>
              <button
                onClick={() => {
                  setModoNuevo(false);
                  setEditando(false);
                  setSelId(null);
                }}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <FaTimes className="text-[10px]" />
              </button>
            </div>

            <div className="flex-1 p-4 space-y-4">
              {/* Título opcional */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">
                  Título (opcional)
                </label>
                <input
                  value={form.titulo}
                  onChange={(e) =>
                    setForm((f) => ({...f, titulo: e.target.value}))
                  }
                  placeholder="Ej: Culto Juvenil"
                  className="w-full bg-slate-800 border border-slate-600/60 focus:border-orange-500/70 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Texto */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">
                  Texto del anuncio *
                </label>
                <textarea
                  autoFocus
                  value={form.texto}
                  onChange={(e) =>
                    setForm((f) => ({...f, texto: e.target.value}))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                      guardar();
                  }}
                  placeholder="Ej: Este viernes 8pm - Sala principal"
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-600/60 focus:border-orange-500/70 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none resize-none"
                />
                <p className="text-[10px] text-slate-600 mt-1">
                  Ctrl+Enter para guardar
                </p>
              </div>

              {/* Plantilla */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                  <FaLayerGroup className="text-[9px]" /> Plantilla visual
                </label>
                <SelectorPlantilla
                  valor={form.plantilla}
                  onChange={(v) => setForm((f) => ({...f, plantilla: v}))}
                />
              </div>

              {/* Preview miniatura */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">
                  Vista previa
                </label>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{aspectRatio: "16/9"}}
                >
                  {(() => {
                    const plt =
                      PLANTILLAS[form.plantilla] || PLANTILLAS.moderno;
                    return (
                      <div
                        className={`w-full h-full bg-gradient-to-br ${plt.previewClass} ${plt.animClass} relative flex flex-col items-center justify-center text-center p-3`}
                      >
                        <div
                          className={`absolute inset-[4px] rounded-lg border ${plt.borderClass}`}
                        />
                        <CornerDecos color={plt.accentClass} />
                        {form.titulo && (
                          <p
                            className={`relative text-[10px] font-bold mb-1 ${plt.accentClass}`}
                          >
                            {plt.icono} {form.titulo}
                          </p>
                        )}
                        <p className="relative text-xs text-white/90 font-medium leading-snug">
                          {form.texto || (
                            <span className="text-white/30 italic">
                              Escribe el texto...
                            </span>
                          )}
                        </p>
                        <p
                          className={`relative text-[8px] mt-1.5 ${plt.accentClass} opacity-60`}
                        >
                          {plt.nombre}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="px-4 py-3 border-t border-slate-800 flex gap-2">
              <button
                onClick={guardar}
                disabled={!form.texto.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 border border-emerald-500/30 text-white text-sm font-semibold transition-colors"
              >
                <FaSave className="text-[10px]" /> Guardar
              </button>
              {editando && (
                <button
                  onClick={() => {
                    const a = anuncios.find((x) => x.id === selId);
                    if (a) proyectarSlide(a);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-orange-600/80 hover:bg-orange-600 border border-orange-500/30 text-white text-sm font-semibold transition-colors"
                  title="Proyectar ahora"
                >
                  <FaBroadcastTower className="text-[10px]" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
