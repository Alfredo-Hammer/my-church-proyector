import React, {useState, useEffect, useCallback} from "react";
import {
  FaPlus,
  FaTrash,
  FaTimes,
  FaSave,
  FaImages,
  FaImage,
  FaArrowUp,
  FaArrowDown,
  FaBroadcastTower,
  FaStop,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaUpload,
  FaEdit,
  FaArrowLeft,
} from "react-icons/fa";

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

export default function Diapositivas() {
  const [presentaciones, setPresentaciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [editorAbierto, setEditorAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({nombre: "", imagenes: []});
  const {toasts, add: mostrarMensaje} = useToast();

  const [proyectando, setProyectando] = useState(false);
  const [presentacionActivaId, setPresentacionActivaId] = useState(null);
  const [indiceActual, setIndiceActual] = useState(0);

  const [vistaPreviaId, setVistaPreviaId] = useState(null);

  // ── Cargar presentaciones guardadas ──────────────────────────────────────
  const cargarPresentaciones = useCallback(async () => {
    if (!window.electron?.obtenerPresentaciones) return;
    try {
      const lista = await window.electron.obtenerPresentaciones();
      setPresentaciones(Array.isArray(lista) ? lista : []);
    } catch {
      setPresentaciones([]);
    }
  }, []);

  useEffect(() => {
    cargarPresentaciones();
  }, [cargarPresentaciones]);

  // ── Editor ────────────────────────────────────────────────────────────────
  const abrirNueva = () => {
    setVistaPreviaId(null);
    setForm({nombre: "", imagenes: []});
    setEditandoId(null);
    setEditorAbierto(true);
  };

  const abrirEdicion = (p) => {
    setVistaPreviaId(null);
    setForm({nombre: p.nombre, imagenes: p.imagenes || []});
    setEditandoId(p.id);
    setEditorAbierto(true);
  };

  const cerrarEditor = () => {
    setEditorAbierto(false);
    setEditandoId(null);
  };

  // ── Vista previa (clasificador de diapositivas) ─────────────────────────────
  const abrirVistaPrevia = (p) => {
    setEditorAbierto(false);
    setEditandoId(null);
    setVistaPreviaId(p.id);
  };

  const cerrarVistaPrevia = () => setVistaPreviaId(null);

  const agregarImagenes = async () => {
    if (!window.electron?.seleccionarImagenes) return;
    setCargando(true);
    try {
      const sel = await window.electron.seleccionarImagenes();
      if (!sel?.success) return;

      const resultado = await window.electron.procesarArchivosPorRuta(
        sel.filePaths,
      );
      const nuevas = (resultado?.resultados || [])
        .filter((r) => r.success && r.tipo === "imagen")
        .map((r) => ({url: r.url, nombre: r.nombre}));

      if (nuevas.length === 0) {
        mostrarMensaje("No se pudieron agregar las imágenes", "error");
      } else {
        setForm((f) => ({...f, imagenes: [...f.imagenes, ...nuevas]}));
        mostrarMensaje(
          `${nuevas.length} imagen${nuevas.length > 1 ? "es" : ""} agregada${nuevas.length > 1 ? "s" : ""}`,
          "success",
        );
      }
    } catch {
      mostrarMensaje("Error al agregar imágenes", "error");
    } finally {
      setCargando(false);
    }
  };

  const moverImagen = (idx, dir) => {
    setForm((f) => {
      const arr = [...f.imagenes];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return f;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return {...f, imagenes: arr};
    });
  };

  const quitarImagen = (idx) => {
    setForm((f) => ({...f, imagenes: f.imagenes.filter((_, i) => i !== idx)}));
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      mostrarMensaje("Ponle un nombre a la presentación", "error");
      return;
    }
    if (form.imagenes.length === 0) {
      mostrarMensaje("Agrega al menos una imagen", "error");
      return;
    }
    setCargando(true);
    try {
      if (editandoId) {
        await window.electron.actualizarPresentacion({
          id: editandoId,
          nombre: form.nombre,
          imagenes: form.imagenes,
        });
      } else {
        await window.electron.agregarPresentacion({
          nombre: form.nombre,
          imagenes: form.imagenes,
        });
      }
      mostrarMensaje("Presentación guardada", "success");
      cerrarEditor();
      await cargarPresentaciones();
    } catch {
      mostrarMensaje("Error al guardar la presentación", "error");
    } finally {
      setCargando(false);
    }
  };

  const eliminar = async (p) => {
    if (!window.confirm(`¿Eliminar "${p.nombre}"?`)) return;
    try {
      await window.electron.eliminarPresentacion(p.id);
      if (presentacionActivaId === p.id) detenerProyeccion();
      mostrarMensaje("Presentación eliminada", "success");
      await cargarPresentaciones();
    } catch {
      mostrarMensaje("Error al eliminar", "error");
    }
  };

  // ── Proyección ────────────────────────────────────────────────────────────
  const enviarSlide = useCallback((presentacion, idx) => {
    const img = presentacion.imagenes[idx];
    if (!img) return;
    const slideData = {
      tipo: "slide",
      slide: {
        id: `pres-${presentacion.id}-${idx}`,
        backgroundImage: img.url,
        renderMode: "pptx",
      },
      presentation: {
        currentIndex: idx,
        totalSlides: presentacion.imagenes.length,
      },
    };
    localStorage.setItem("proyector-slide-data:v1", JSON.stringify(slideData));
    try {
      window.electron?.ipcRenderer?.send?.("proyectar-slide-data", slideData);
    } catch {
      // noop
    }
    // Avisar al proceso principal cuál diapositiva quedó en pantalla, para
    // que el control remoto de la app móvil sepa el estado real.
    window.electron?.actualizarDiapositivaActiva?.({
      presentacionId: presentacion.id,
      indice: idx,
      totalSlides: presentacion.imagenes.length,
    });
  }, []);

  const proyectar = (p) => {
    if (!p.imagenes?.length) return;
    window.electron?.abrirProyector?.();
    setProyectando(true);
    setPresentacionActivaId(p.id);
    setIndiceActual(0);
    enviarSlide(p, 0);
  };

  // Saltar directo a una diapositiva específica desde el clasificador de vista previa
  const saltarASlide = (p, idx) => {
    if (!p.imagenes?.[idx]) return;
    window.electron?.abrirProyector?.();
    setProyectando(true);
    setPresentacionActivaId(p.id);
    setIndiceActual(idx);
    enviarSlide(p, idx);
  };

  const detenerProyeccion = () => {
    setProyectando(false);
    setPresentacionActivaId(null);
    setIndiceActual(0);
    localStorage.removeItem("proyector-slide-data:v1");
    window.electron?.actualizarDiapositivaActiva?.(null);
    window.electron?.limpiarProyector?.();
  };

  const irASlide = useCallback(
    (nuevoIndice) => {
      const p = presentaciones.find((x) => x.id === presentacionActivaId);
      if (!p || !p.imagenes?.length) return;
      const total = p.imagenes.length;
      const idx = ((nuevoIndice % total) + total) % total;
      setIndiceActual(idx);
      enviarSlide(p, idx);
    },
    [presentaciones, presentacionActivaId, enviarSlide],
  );

  // Navegación con flechas/espacio mientras se proyecta (compatible con clickers remotos)
  useEffect(() => {
    if (!proyectando) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        irASlide(indiceActual + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        irASlide(indiceActual - 1);
      } else if (e.key === "Escape") {
        detenerProyeccion();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectando, indiceActual, irASlide]);

  // La ventana del proyector no tiene el teclado enfocado casi nunca (vive en
  // el segundo monitor), pero si el operador hace clic ahí y usa las
  // flechas, Proyector.jsx avisa acá por localStorage — mismo mecanismo de
  // "proyector-slide-data:v1" (ver comentario en Proyector.jsx: el ipcRenderer
  // real no está expuesto en preload.js, este fallback es el único camino).
  useEffect(() => {
    if (!proyectando) return;
    const handler = (e) => {
      if (e.key !== "proyector-slide-nav:v1" || !e.newValue) return;
      try {
        const {action} = JSON.parse(e.newValue);
        if (action === "next") irASlide(indiceActual + 1);
        else if (action === "prev") irASlide(indiceActual - 1);
        else if (action === "stop") detenerProyeccion();
      } catch {
        // noop
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectando, indiceActual, irASlide]);

  const presentacionActiva = presentaciones.find(
    (p) => p.id === presentacionActivaId,
  );
  const vistaPrevia = presentaciones.find((p) => p.id === vistaPreviaId);

  return (
    <div className="bg-[#080c14] text-slate-100 h-full flex flex-col overflow-hidden">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border shadow-xl text-xs min-w-[180px]
            ${
              t.tipo === "success"
                ? "bg-slate-900/95 border-l-2 border-l-emerald-500 border-white/10"
                : "bg-slate-900/95 border-l-2 border-l-red-500 border-white/10"
            }`}
          >
            {t.tipo === "success" ? (
              <FaCheck className="text-emerald-400 text-[10px]" />
            ) : (
              "⚠"
            )}{" "}
            {t.msg}
          </div>
        ))}
      </div>

      {/* ── Header ── */}
      <div className="shrink-0 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/50 flex-wrap gap-y-2">
        <div className="flex items-center gap-2 min-w-0">
          {vistaPrevia ? (
            <>
              <button
                type="button"
                onClick={cerrarVistaPrevia}
                className="size-7 shrink-0 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                title="Volver"
              >
                <FaArrowLeft className="text-[10px]" />
              </button>
              <span className="text-sm font-semibold text-white truncate">
                {vistaPrevia.nombre}
              </span>
              <span className="text-xs text-slate-500 shrink-0">
                {vistaPrevia.imagenes?.length || 0}{" "}
                {vistaPrevia.imagenes?.length === 1 ? "imagen" : "imágenes"}
              </span>
            </>
          ) : (
            <>
              <FaImages className="text-violet-400 shrink-0" />
              <span className="text-sm font-semibold text-white">
                Diapositivas
              </span>
              <span className="text-xs text-slate-500">
                {presentaciones.length}{" "}
                {presentaciones.length === 1
                  ? "presentación"
                  : "presentaciones"}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {proyectando && presentacionActiva ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => irASlide(indiceActual - 1)}
                disabled={presentacionActiva.imagenes.length <= 1}
                className="size-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <FaChevronLeft className="text-[9px]" />
              </button>
              <span className="text-[11px] text-violet-300 tabular-nums px-1 font-mono">
                {indiceActual + 1}/{presentacionActiva.imagenes.length}
              </span>
              <button
                type="button"
                onClick={() => irASlide(indiceActual + 1)}
                disabled={presentacionActiva.imagenes.length <= 1}
                className="size-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <FaChevronRight className="text-[9px]" />
              </button>
              <button
                type="button"
                onClick={detenerProyeccion}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition-colors"
              >
                <FaStop className="text-[9px]" /> Detener
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={abrirNueva}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 border border-violet-500/30 text-white text-xs font-semibold transition-colors"
          >
            <FaPlus className="text-[9px]" /> Nueva
          </button>
        </div>
      </div>

      {/* ── Cuerpo ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {vistaPrevia ? (
          /* ── Clasificador de diapositivas: miniaturas grandes, clic para saltar ── */
          <div className="flex-1 min-w-0 overflow-y-auto p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {(vistaPrevia.imagenes || []).map((img, idx) => {
                const esActual =
                  proyectando &&
                  presentacionActivaId === vistaPrevia.id &&
                  indiceActual === idx;
                return (
                  <button
                    key={`${img.url}-${idx}`}
                    type="button"
                    onClick={() => saltarASlide(vistaPrevia, idx)}
                    className={`relative aspect-video rounded-xl border-2 overflow-hidden transition-all duration-200 text-left
                      ${
                        esActual
                          ? "ring-2 ring-offset-2 ring-offset-slate-950 ring-violet-500 border-violet-500/60"
                          : "border-white/10 hover:border-violet-500/40 hover:scale-[1.02]"
                      }
                    `}
                  >
                    <img
                      src={img.url}
                      alt={img.nombre}
                      className="absolute inset-0 size-full object-cover"
                    />
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-white bg-black/60 backdrop-blur-sm size-5 rounded-full flex items-center justify-center">
                      {idx + 1}
                    </span>
                    {esActual && (
                      <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/30 border border-violet-500/50 text-violet-200">
                        <span className="size-1 rounded-full bg-violet-300 animate-pulse" />
                        EN VIVO
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
        /* ── Izquierda: grid de presentaciones ── */
        <div className="flex-1 min-w-0 overflow-y-auto p-3">
          {presentaciones.length === 0 && !editorAbierto && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FaImages className="text-4xl text-slate-700 mb-4" />
              <h3 className="text-base font-semibold text-slate-400 mb-2">
                Sin presentaciones
              </h3>
              <p className="text-slate-500 text-sm mb-4 max-w-sm">
                Sube varias imágenes (por ejemplo, las diapositivas exportadas
                de un PowerPoint) y proyéctalas en secuencia, avanzando con
                flechas o control remoto.
              </p>
              <button
                type="button"
                onClick={abrirNueva}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 border border-violet-500/30 text-white text-sm font-semibold transition-colors"
              >
                <FaPlus className="text-xs" /> Crear primera presentación
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {presentaciones.map((p) => {
              const enVivo = proyectando && presentacionActivaId === p.id;
              const portada = p.imagenes?.[0]?.url;
              return (
                <div key={p.id} className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => abrirVistaPrevia(p)}
                    title="Ver diapositivas"
                    className={`relative aspect-video rounded-2xl border-2 overflow-hidden transition-all duration-300 text-left cursor-pointer
                      ${enVivo ? "ring-2 ring-offset-2 ring-offset-slate-950 ring-violet-500 border-violet-500/60" : "border-white/10 hover:border-violet-500/40"}
                    `}
                  >
                    {portada ? (
                      <img
                        src={portada}
                        alt={p.nombre}
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                        <FaImage className="text-3xl text-slate-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                    <span className="absolute top-2 right-2 text-[9px] font-semibold text-white/80 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
                      {p.imagenes?.length || 0}{" "}
                      {p.imagenes?.length === 1 ? "imagen" : "imágenes"}
                    </span>
                    {enVivo && (
                      <span className="absolute top-2 left-2 flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300">
                        <span className="size-1.5 rounded-full bg-violet-400 animate-pulse" />
                        EN VIVO
                      </span>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2">
                      <p className="text-sm text-white font-semibold truncate">
                        {p.nombre}
                      </p>
                    </div>
                  </button>

                  {/* Controles bajo la card — una sola barra cohesiva */}
                  <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-white/[0.03] border border-white/8">
                    <button
                      type="button"
                      onClick={() => proyectar(p)}
                      disabled={!p.imagenes?.length}
                      className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg text-[10px] font-semibold text-violet-400 hover:bg-violet-500/15 disabled:opacity-30 transition-colors"
                      title="Proyectar"
                    >
                      <FaBroadcastTower className="text-xs" /> Proyectar
                    </button>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => abrirEdicion(p)}
                      className="size-6 rounded-md hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                      title="Editar"
                    >
                      <FaEdit className="text-[10px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(p)}
                      className="size-6 rounded-md hover:bg-red-500/20 flex items-center justify-center text-white/35 hover:text-red-400 transition-colors"
                      title="Eliminar"
                    >
                      <FaTrash className="text-[10px]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* ── Derecha: editor ── */}
        {editorAbierto && (
          <div className="w-80 xl:w-96 shrink-0 border-l border-slate-800 flex flex-col bg-slate-900/40 overflow-y-auto">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaImages className="text-violet-400 text-sm" />
                <span className="text-sm font-semibold text-white">
                  {editandoId ? "Editar" : "Nueva"} presentación
                </span>
              </div>
              <button
                type="button"
                onClick={cerrarEditor}
                className="size-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <FaTimes className="text-[10px]" />
              </button>
            </div>

            <div className="flex-1 p-4 space-y-4">
              <div>
                <label
                  htmlFor="presentacion-nombre"
                  className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5"
                >
                  Nombre
                </label>
                <input
                  id="presentacion-nombre"
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((f) => ({...f, nombre: e.target.value}))
                  }
                  placeholder="Ej: Mensaje del domingo"
                  className="w-full bg-slate-800 border border-slate-600/60 focus:border-violet-500/70 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Imágenes ({form.imagenes.length})
                  </label>
                  <button
                    type="button"
                    onClick={agregarImagenes}
                    disabled={cargando}
                    className="flex items-center gap-1 text-[10px] font-semibold text-violet-400 hover:text-violet-300 disabled:opacity-40 transition-colors"
                  >
                    <FaUpload className="text-[9px]" /> Agregar
                  </button>
                </div>

                {form.imagenes.length === 0 ? (
                  <button
                    type="button"
                    onClick={agregarImagenes}
                    disabled={cargando}
                    className="w-full py-8 rounded-xl border-2 border-dashed border-white/10 hover:border-violet-500/40 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-violet-300 transition-colors"
                  >
                    <FaUpload className="text-lg" />
                    <span className="text-xs font-medium">
                      Selecciona imágenes exportadas de tu presentación
                    </span>
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    {form.imagenes.map((img, idx) => (
                      <div
                        key={`${img.url}-${idx}`}
                        className="flex items-center gap-2 bg-white/[0.03] border border-white/8 rounded-lg p-1.5"
                      >
                        <span className="w-5 text-center text-[10px] text-slate-500 font-mono shrink-0">
                          {idx + 1}
                        </span>
                        <img
                          src={img.url}
                          alt={img.nombre}
                          className="size-10 rounded-md object-cover shrink-0 bg-slate-800"
                        />
                        <span className="flex-1 min-w-0 text-xs text-slate-300 truncate">
                          {img.nombre}
                        </span>
                        <button
                          type="button"
                          onClick={() => moverImagen(idx, -1)}
                          disabled={idx === 0}
                          className="size-6 rounded-md hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-20 transition-colors shrink-0"
                        >
                          <FaArrowUp className="text-[9px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moverImagen(idx, 1)}
                          disabled={idx === form.imagenes.length - 1}
                          className="size-6 rounded-md hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white disabled:opacity-20 transition-colors shrink-0"
                        >
                          <FaArrowDown className="text-[9px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => quitarImagen(idx)}
                          className="size-6 rounded-md hover:bg-red-500/20 flex items-center justify-center text-white/35 hover:text-red-400 transition-colors shrink-0"
                        >
                          <FaTrash className="text-[9px]" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={guardar}
                disabled={cargando}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 border border-violet-500/30 text-white text-sm font-semibold transition-colors"
              >
                <FaSave className="text-xs" /> Guardar presentación
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
