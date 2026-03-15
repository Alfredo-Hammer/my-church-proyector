import {useParams, useNavigate, useLocation} from "react-router-dom";
import {useState, useEffect} from "react";
import himnosData from "../data/himnos.json";
import vidacristianaData from "../data/vidacristiana.json";
import {
  FaProjectDiagram,
  FaHeart,
  FaRegHeart,
  FaStop,
  FaVolumeUp,
  FaArrowLeft,
  FaArrowRight,
  FaMusic,
  FaBible,
  FaCross,
  FaTimes,
  FaCheck,
  FaUndo,
  FaRedo,
  FaHome,
  FaBroadcastTower,
} from "react-icons/fa";

const HimnoDetalle = () => {
  const {id, numero} = useParams();
  const {state} = useLocation();
  const [himno, setHimno] = useState(null);
  const [selectedParrafo, setSelectedParrafo] = useState(0);
  const [favoritos, setFavoritos] = useState(new Set());
  const [isProyectando, setIsProyectando] = useState(false);
  const [historial, setHistorial] = useState([0]);
  const [posicionHistorial, setPosicionHistorial] = useState(0);
  const [toasts, setToasts] = useState([]);

  const API_BASE = "http://localhost:3001";
  const navigate = useNavigate();

  useEffect(() => {
    const cargarEstadoFavoritos = async () => {
      try {
        if (id) {
          const himnoDB = await window.electron?.obtenerHimnoPorId?.(id);
          if (himnoDB) {
            setFavoritos(
              Boolean(himnoDB.favorito)
                ? new Set([Number(himnoDB.numero)])
                : new Set(),
            );
          } else {
            setFavoritos(new Set());
          }
          return;
        }

        const tipoApi = state?.tipo === "vidaCristiana" ? "vida" : "moravo";
        const res = await fetch(
          `${API_BASE}/api/himnos/favoritos?tipo=${tipoApi}`,
          {method: "GET", headers: {Accept: "application/json"}},
        );
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok || !Array.isArray(json?.himnos)) {
          throw new Error(json?.error || `Error HTTP ${res.status}`);
        }
        setFavoritos(
          new Set(
            json.himnos
              .map((h) => h?.numero)
              .filter((n) => n !== undefined && n !== null),
          ),
        );
      } catch (error) {
        console.warn("⚠️ Error cargando favoritos:", error);
        setFavoritos(new Set());
      }
    };
    cargarEstadoFavoritos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, state?.tipo]);

  const addToast = (message, type = "success", duration = 3000) => {
    const toastId = Date.now();
    setToasts((prev) => [...prev, {id: toastId, message, type}]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, duration);
  };

  const removeToast = (toastId) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

  const Toast = ({toast}) => {
    const configs = {
      success: {icon: <FaCheck />, bar: "bg-emerald-500", text: "text-emerald-400"},
      info:    {icon: <FaMusic />, bar: "bg-blue-500",    text: "text-blue-400"},
      warning: {icon: <FaVolumeUp />, bar: "bg-amber-500", text: "text-amber-400"},
      error:   {icon: <FaTimes />, bar: "bg-red-500",    text: "text-red-400"},
    };
    const cfg = configs[toast.type] || configs.success;
    return (
      <div className="relative overflow-hidden flex items-start gap-3 bg-slate-900/95 backdrop-blur border border-white/10 rounded-2xl px-4 py-3 shadow-2xl min-w-[240px] max-w-xs">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.bar}`} />
        <span className={`${cfg.text} mt-0.5 shrink-0 text-sm`}>{cfg.icon}</span>
        <p className="text-sm text-white/90 font-medium leading-snug flex-1">{toast.message}</p>
        <button onClick={() => removeToast(toast.id)} className="text-white/40 hover:text-white/80 transition-colors shrink-0">
          <FaTimes className="text-xs" />
        </button>
      </div>
    );
  };

  useEffect(() => {
    const cargarHimno = async () => {
      try {
        if (numero) {
          if (state?.tipo === "vidaCristiana") {
            const h = vidacristianaData.find((h) => h.numero.toString() === numero);
            if (h) { setHimno(h); return; }
          } else {
            const h = himnosData.find((h) => h.numero.toString() === numero);
            if (h) { setHimno(h); return; }
          }
        }
        if (id) {
          const himnoDB = await window.electron?.obtenerHimnoPorId(id);
          if (himnoDB) {
            setHimno({numero: himnoDB.numero, titulo: himnoDB.titulo, parrafos: himnoDB.letra});
            return;
          }
        }
        throw new Error("Himno no encontrado");
      } catch (error) {
        console.error("Error al cargar el himno:", error);
        setHimno(null);
      }
    };
    cargarHimno();
  }, [id, numero, state]);

  const proyectarHimno = () => {
    if (himno && window.electron) {
      window.electron.abrirProyector();
      window.electron.enviarHimno({
        parrafo: himno.parrafos[selectedParrafo],
        titulo: himno.titulo,
        numero: himno.numero,
        origen: "himno",
      });
      setIsProyectando(true);
      addToast(`Proyectando: ${himno.titulo}`, "success");
    }
  };

  const limpiarProyeccion = () => {
    if (window.electron) {
      window.electron.enviarVersiculo({parrafo: "", titulo: "", numero: "", origen: "clear"});
      setIsProyectando(false);
      addToast("Proyección limpiada", "info");
    }
  };

  const toggleFavorito = async () => {
    if (!himno) return;
    const prev = new Set(favoritos);
    const esAgregar = !prev.has(himno.numero);
    const next = new Set(prev);
    if (esAgregar) next.add(himno.numero);
    else next.delete(himno.numero);
    setFavoritos(next);
    try {
      if (id) {
        if (!window.electron?.marcarFavorito) throw new Error("IPC no disponible");
        await window.electron.marcarFavorito(id, esAgregar);
      } else {
        const tipoApi = state?.tipo === "vidaCristiana" ? "vida" : "moravo";
        const himnoId = `base:${tipoApi}:${String(himno.numero)}`;
        const res = await fetch(`${API_BASE}/api/himnos/${encodeURIComponent(himnoId)}/favorito`, {
          method: "POST",
          headers: {Accept: "application/json", "Content-Type": "application/json"},
          body: JSON.stringify({favorito: esAgregar}),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
      }
      addToast(esAgregar ? `"${himno.titulo}" en favoritos` : `Removido de favoritos`, esAgregar ? "success" : "info");
    } catch (error) {
      console.warn("❌ Error actualizando favorito:", error);
      setFavoritos(prev);
      addToast("No se pudo actualizar favorito", "error");
    }
  };

  const cambiarParrafo = (indice, agregarAlHistorial = true) => {
    if (!himno) return;
    if (agregarAlHistorial) {
      const nuevoHistorial = historial.slice(0, posicionHistorial + 1);
      nuevoHistorial.push(indice);
      setHistorial(nuevoHistorial);
      setPosicionHistorial(nuevoHistorial.length - 1);
    }
    setSelectedParrafo(indice);
    if (window.electron && isProyectando) {
      window.electron.enviarHimno({
        parrafo: himno.parrafos[indice],
        titulo: himno.titulo,
        numero: himno.numero,
      });
    }
  };

  const irAtras = () => {
    if (posicionHistorial > 0) {
      const nuevaPosicion = posicionHistorial - 1;
      setPosicionHistorial(nuevaPosicion);
      cambiarParrafo(historial[nuevaPosicion], false);
    }
  };

  const irAdelante = () => {
    if (posicionHistorial < historial.length - 1) {
      const nuevaPosicion = posicionHistorial + 1;
      setPosicionHistorial(nuevaPosicion);
      cambiarParrafo(historial[nuevaPosicion], false);
    }
  };

  const handleKeyDown = (e) => {
    if (!himno) return;
    switch (e.key) {
      case "Escape": limpiarProyeccion(); break;
      case " ": e.preventDefault(); proyectarHimno(); break;
      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault();
        cambiarParrafo(Math.max(0, selectedParrafo - 1));
        break;
      case "ArrowDown":
      case "ArrowRight":
        e.preventDefault();
        cambiarParrafo(Math.min(himno.parrafos.length - 1, selectedParrafo + 1));
        break;
      case "Home": e.preventDefault(); cambiarParrafo(0); break;
      case "End":  e.preventDefault(); cambiarParrafo(himno.parrafos.length - 1); break;
      default: break;
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [himno, selectedParrafo, isProyectando, historial, posicionHistorial]);

  const esFavorito = favoritos.has(himno?.numero);
  const progreso = himno ? ((selectedParrafo + 1) / Math.max(1, himno.parrafos.length)) * 100 : 0;

  /* ─── Estado de carga / error ─── */
  if (!himno) {
    return (
      <div className="bg-slate-950 text-slate-100 h-full flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <FaMusic className="text-3xl text-white/20" />
          </div>
          <h3 className="text-xl font-bold text-white/80 mb-2">Himno no encontrado</h3>
          <p className="text-white/40 text-sm mb-6">El himno que buscas no está disponible.</p>
          <button
            onClick={() => navigate("/himnos")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 text-sm font-medium transition-colors"
          >
            <FaHome className="text-white/60" /> Volver a himnos
          </button>
        </div>
      </div>
    );
  }

  const isVidaCristiana = state?.tipo === "vidaCristiana";

  return (
    <div className="bg-slate-950 text-slate-100 h-full flex flex-col relative overflow-hidden">

      {/* Fondo decorativo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-500/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/4 blur-3xl" />
      </div>

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 items-end">
        {toasts.map((t) => <Toast key={t.id} toast={t} />)}
      </div>

      {/* ── HEADER ── */}
      <header className="relative z-30 shrink-0 bg-slate-900/80 backdrop-blur-xl border-b border-white/8">
        <div className="px-3 xl:px-5 py-2.5 flex items-center justify-between gap-3">

          {/* Izquierda: volver + info + título */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="shrink-0 w-9 h-9 rounded-xl bg-white/6 hover:bg-white/10 border border-white/8 flex items-center justify-center transition-colors text-white/70 hover:text-white"
              title="Volver"
            >
              <FaArrowLeft className="text-xs" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-white/40">
                  {isVidaCristiana ? <FaCross className="text-[8px]" /> : <FaBible className="text-[8px]" />}
                  {isVidaCristiana ? "Vida Cristiana" : "Himno Moravo"}
                </span>
                <span className="text-white/20 text-[10px]">·</span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400/80">
                  #{himno.numero}
                </span>
                {isProyectando && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    EN VIVO
                  </span>
                )}
              </div>
              <h1 className="text-sm sm:text-base xl:text-lg font-bold truncate leading-tight text-white">
                {himno.titulo}
              </h1>
            </div>
          </div>

          {/* Derecha: controles */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Historial */}
            <button
              onClick={irAtras}
              disabled={posicionHistorial <= 0}
              className="w-8 h-8 xl:w-9 xl:h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center transition-colors disabled:opacity-30 text-white/60 hover:text-white disabled:cursor-not-allowed"
              title="Atrás en historial"
            >
              <FaUndo className="text-[10px]" />
            </button>
            <button
              onClick={irAdelante}
              disabled={posicionHistorial >= historial.length - 1}
              className="w-8 h-8 xl:w-9 xl:h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center transition-colors disabled:opacity-30 text-white/60 hover:text-white disabled:cursor-not-allowed"
              title="Adelante en historial"
            >
              <FaRedo className="text-[10px]" />
            </button>

            <div className="w-px h-5 bg-white/10 mx-1" />

            {/* Favorito */}
            <button
              onClick={toggleFavorito}
              className={`w-8 h-8 xl:w-9 xl:h-9 rounded-lg border flex items-center justify-center transition-all ${
                esFavorito
                  ? "bg-rose-500/20 border-rose-500/30 text-rose-400 hover:bg-rose-500/30"
                  : "bg-white/5 border-white/8 text-white/50 hover:text-rose-400 hover:bg-white/10"
              }`}
              title={esFavorito ? "Quitar favorito" : "Agregar favorito"}
            >
              {esFavorito ? <FaHeart className="text-xs" /> : <FaRegHeart className="text-xs" />}
            </button>

            <div className="w-px h-5 bg-white/10 mx-1" />

            {/* Limpiar */}
            <button
              onClick={limpiarProyeccion}
              className="w-8 h-8 xl:w-9 xl:h-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 flex items-center justify-center transition-all"
              title="Limpiar proyector (Esc)"
            >
              <FaStop className="text-[10px]" />
            </button>

            {/* Proyectar */}
            <button
              onClick={proyectarHimno}
              className="inline-flex items-center gap-2 h-8 xl:h-9 px-3 xl:px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 border border-emerald-500/30 text-white font-semibold text-xs xl:text-sm transition-all shadow-lg shadow-emerald-900/40"
              title="Proyectar (Espacio)"
            >
              <FaBroadcastTower className="text-[10px] xl:text-xs" />
              <span className="hidden sm:inline">Proyectar</span>
            </button>
          </div>
        </div>

        {/* Barra de progreso en el header */}
        <div className="h-0.5 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300 ease-out"
            style={{width: `${progreso}%`}}
          />
        </div>
      </header>

      {/* ── CONTENIDO ── */}
      <main className="relative z-10 flex-1 min-h-0 overflow-hidden">
        <div className="h-full p-2 xl:p-3 grid grid-cols-1 md:grid-cols-12 md:grid-rows-[1fr] gap-2 xl:gap-3">

          {/* ── SIDEBAR: lista de párrafos ── */}
          <aside className="order-2 md:order-1 md:col-span-4 xl:col-span-3 min-h-0 flex flex-col max-h-[40vh] md:max-h-none">
            <div className="h-full min-h-0 rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm flex flex-col overflow-hidden">

              {/* Cabecera sidebar */}
              <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-white/8 border border-white/8 flex items-center justify-center">
                    <FaMusic className="text-[9px] text-white/50" />
                  </div>
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Párrafos</span>
                </div>
                <span className="text-xs text-white/30 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">
                  {selectedParrafo + 1} / {himno.parrafos.length}
                </span>
              </div>

              {/* Lista */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
                {himno.parrafos.map((parrafo, index) => {
                  const isActive = selectedParrafo === index;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => cambiarParrafo(index)}
                      className={`w-full text-left rounded-xl border transition-all group ${
                        isActive
                          ? "border-emerald-500/35 bg-gradient-to-br from-emerald-500/12 to-emerald-600/6 shadow-lg shadow-emerald-900/20"
                          : "border-white/6 bg-white/3 hover:bg-white/6 hover:border-white/12"
                      }`}
                    >
                      <div className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          {/* Número */}
                          <span className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold border transition-colors ${
                            isActive
                              ? "bg-emerald-500 border-emerald-400/50 text-white"
                              : "bg-white/6 border-white/10 text-white/50 group-hover:text-white/70"
                          }`}>
                            {index + 1}
                          </span>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                            isActive ? "text-emerald-300/80" : "text-white/30 group-hover:text-white/40"
                          }`}>
                            Párrafo
                          </span>
                          {isActive && isProyectando && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                        </div>
                        <p className={`text-xs leading-relaxed line-clamp-3 transition-colors ${
                          isActive ? "text-white/85" : "text-white/45 group-hover:text-white/60"
                        }`}>
                          {parrafo}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer del sidebar: navegación rápida */}
              <div className="px-3 py-2.5 border-t border-white/6 flex items-center justify-between gap-2 shrink-0">
                <button
                  onClick={() => cambiarParrafo(Math.max(0, selectedParrafo - 1))}
                  disabled={selectedParrafo === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-white/50 hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-medium"
                >
                  <FaArrowLeft className="text-[10px]" /> Anterior
                </button>
                <button
                  onClick={() => cambiarParrafo(Math.min(himno.parrafos.length - 1, selectedParrafo + 1))}
                  disabled={selectedParrafo === himno.parrafos.length - 1}
                  className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-white/50 hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-medium"
                >
                  Siguiente <FaArrowRight className="text-[10px]" />
                </button>
              </div>
            </div>
          </aside>

          {/* ── MAIN: texto del párrafo ── */}
          <div className="order-1 md:order-2 md:col-span-8 xl:col-span-9 min-h-0 flex flex-col min-h-[44vh] md:min-h-0">
            <section className="flex-1 min-h-0 rounded-2xl border border-white/12 bg-gradient-to-br from-slate-800/70 via-slate-900/85 to-slate-800/50 backdrop-blur-sm flex flex-col overflow-hidden relative shadow-2xl shadow-black/50">

              {/* Luz de fondo suave centrada */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2/3 bg-gradient-to-b from-emerald-500/18 via-emerald-600/10 to-transparent blur-2xl" />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/30 via-transparent to-slate-800/20" />
              </div>

              {/* Indicador superior — siempre visible */}
              <div className="relative z-10 px-4 xl:px-5 py-2.5 flex items-center justify-between shrink-0 border-b border-white/6 bg-white/3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1 flex-wrap">
                    {himno.parrafos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => cambiarParrafo(i)}
                        className={`h-1.5 rounded-full transition-all ${
                          i === selectedParrafo
                            ? "bg-emerald-400 w-6"
                            : "bg-white/20 hover:bg-white/40 w-1.5"
                        }`}
                        title={`Párrafo ${i + 1}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-white/40 font-medium tabular-nums">
                    {selectedParrafo + 1} / {himno.parrafos.length}
                  </span>
                </div>

                {isProyectando && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Proyectando</span>
                  </div>
                )}
              </div>

              {/* Card interna con gradiente para el texto */}
              <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-4 xl:px-8 py-3 xl:py-5 overflow-hidden">
                <div className="w-full max-w-4xl mx-auto min-h-0 flex flex-col">
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-700/40 via-slate-800/30 to-slate-700/20 shadow-inner shadow-black/30 px-5 sm:px-8 xl:px-12 py-5 xl:py-8 min-h-0 overflow-y-auto">
                    <p className="whitespace-pre-line text-center text-2xl sm:text-3xl xl:text-4xl 2xl:text-5xl font-medium leading-relaxed xl:leading-loose text-white/93 tracking-wide drop-shadow-sm">
                      {himno.parrafos[selectedParrafo]}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer: atajos de teclado — siempre visible */}
              <div className="relative z-10 px-4 xl:px-5 py-2 border-t border-white/6 bg-white/2 flex items-center justify-center gap-3 shrink-0">
                <span className="text-[10px] text-white/25 flex items-center gap-3 flex-wrap justify-center">
                  <span><kbd className="px-1.5 py-0.5 rounded bg-white/8 border border-white/12 font-mono text-white/35">Espacio</kbd> proyectar</span>
                  <span><kbd className="px-1.5 py-0.5 rounded bg-white/8 border border-white/12 font-mono text-white/35">← →</kbd> cambiar</span>
                  <span><kbd className="px-1.5 py-0.5 rounded bg-white/8 border border-white/12 font-mono text-white/35">Esc</kbd> limpiar</span>
                </span>
              </div>
            </section>
          </div>

        </div>
      </main>

      <style jsx>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default HimnoDetalle;
