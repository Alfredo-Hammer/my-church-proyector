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
} from "react-icons/fa";

const temasFondo = [
  {
    nombre: "Oscuro",
    clase: "bg-slate-950",
    texto: "text-slate-100",
  },
  {
    nombre: "Grafito",
    clase: "bg-slate-900",
    texto: "text-slate-100",
  },
  {
    nombre: "Índigo",
    clase: "bg-indigo-950",
    texto: "text-slate-100",
  },
];

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
        // Himnos personalizados (DB): se lee desde SQLite vía IPC
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

        // Himnos base (Moravo / Vida): se lee desde backend (config)
        const tipoApi = state?.tipo === "vidaCristiana" ? "vida" : "moravo";
        const res = await fetch(
          `${API_BASE}/api/himnos/favoritos?tipo=${tipoApi}`,
          {
            method: "GET",
            headers: {Accept: "application/json"},
          },
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
        console.warn("⚠️ Error cargando favoritos de himnos (backend):", error);
        setFavoritos(new Set());
      }
    };

    cargarEstadoFavoritos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, state?.tipo]);

  // ✨ FUNCIÓN PARA TOASTS
  const addToast = (message, type = "success", duration = 3000) => {
    const id = Date.now();
    const newToast = {id, message, type};
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // ✨ COMPONENTE TOAST
  const Toast = ({toast}) => {
    const getIcon = () => {
      switch (toast.type) {
        case "success":
          return <FaCheck className="text-green-400" />;
        case "info":
          return <FaMusic className="text-blue-400" />;
        case "warning":
          return <FaVolumeUp className="text-yellow-400" />;
        case "error":
          return <FaTimes className="text-red-400" />;
        default:
          return <FaCheck className="text-green-400" />;
      }
    };

    const getAccent = () => {
      switch (toast.type) {
        case "success":
          return "border-l-green-500";
        case "info":
          return "border-l-blue-500";
        case "warning":
          return "border-l-yellow-500";
        case "error":
          return "border-l-red-500";
        default:
          return "border-l-green-500";
      }
    };

    return (
      <div
        className={`bg-slate-900/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-lg flex items-start gap-3 border border-white/10 border-l-4 ${getAccent()}`}
      >
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 text-sm font-medium leading-snug">
          {toast.message}
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
        >
          <FaTimes className="text-xs" />
        </button>
      </div>
    );
  };

  const ui = {
    btnBase:
      "inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
    btnIcon:
      "w-9 h-9 sm:w-10 sm:h-10 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
    btnPrimary:
      "inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-600/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
    btnDanger:
      "inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-600 hover:bg-red-500 active:bg-red-600/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  };

  useEffect(() => {
    const cargarHimno = async () => {
      try {
        if (numero) {
          if (state?.tipo === "vidaCristiana") {
            const vidaCristianaHimno = vidacristianaData.find(
              (h) => h.numero.toString() === numero,
            );
            if (vidaCristianaHimno) {
              setHimno(vidaCristianaHimno);
              return;
            }
          } else {
            const jsonHimno = himnosData.find(
              (h) => h.numero.toString() === numero,
            );
            if (jsonHimno) {
              setHimno(jsonHimno);
              return;
            }
          }
        }

        if (id) {
          const himnoDB = await window.electron?.obtenerHimnoPorId(id);
          if (himnoDB) {
            setHimno({
              numero: himnoDB.numero,
              titulo: himnoDB.titulo,
              parrafos: himnoDB.letra,
            });
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
      addToast(`🎵 Proyectando: ${himno.titulo}`, "success");
    }
  };

  const limpiarProyeccion = () => {
    if (window.electron) {
      window.electron.enviarVersiculo({
        parrafo: "",
        titulo: "",
        numero: "",
        origen: "clear",
      });
      setIsProyectando(false);
      addToast("🧹 Proyección limpiada", "info");
    }
  };

  // ✨ Toggle de favoritos sincronizado (escritorio <-> móvil)
  const toggleFavorito = async () => {
    if (!himno) return;

    const prev = new Set(favoritos);
    const esAgregar = !prev.has(himno.numero);
    const next = new Set(prev);
    if (esAgregar) next.add(himno.numero);
    else next.delete(himno.numero);
    setFavoritos(next);

    try {
      // Himno personalizado (DB): IPC
      if (id) {
        if (!window.electron?.marcarFavorito)
          throw new Error("IPC no disponible");
        await window.electron.marcarFavorito(id, esAgregar);
      } else {
        // Himno base: backend
        const tipoApi = state?.tipo === "vidaCristiana" ? "vida" : "moravo";
        const himnoId = `base:${tipoApi}:${String(himno.numero)}`;
        const res = await fetch(
          `${API_BASE}/api/himnos/${encodeURIComponent(himnoId)}/favorito`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({favorito: esAgregar}),
          },
        );
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `Error HTTP ${res.status}`);
        }
      }

      if (esAgregar) {
        addToast(`❤️ "${himno.titulo}" agregado a favoritos`, "success");
      } else {
        addToast(`💔 "${himno.titulo}" removido de favoritos`, "info");
      }
    } catch (error) {
      console.warn("❌ Error actualizando favorito:", error);
      setFavoritos(prev);
      addToast("❌ No se pudo actualizar favorito", "error");
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
      addToast("⬅️ Párrafo anterior", "info");
    }
  };

  const irAdelante = () => {
    if (posicionHistorial < historial.length - 1) {
      const nuevaPosicion = posicionHistorial + 1;
      setPosicionHistorial(nuevaPosicion);
      cambiarParrafo(historial[nuevaPosicion], false);
      addToast("➡️ Párrafo siguiente", "info");
    }
  };

  const handleKeyDown = (e) => {
    if (!himno) return;

    switch (e.key) {
      case "Escape":
        limpiarProyeccion();
        break;
      case " ":
        e.preventDefault();
        proyectarHimno();
        break;
      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault();
        const prevIndex = Math.max(0, selectedParrafo - 1);
        cambiarParrafo(prevIndex);
        break;
      case "ArrowDown":
      case "ArrowRight":
        e.preventDefault();
        const nextIndex = Math.min(
          himno.parrafos.length - 1,
          selectedParrafo + 1,
        );
        cambiarParrafo(nextIndex);
        break;
      case "Home":
        e.preventDefault();
        cambiarParrafo(0);
        break;
      case "End":
        e.preventDefault();
        cambiarParrafo(himno.parrafos.length - 1);
        break;
      default:
        // No action for other keys
        break;
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [himno, selectedParrafo, isProyectando, historial, posicionHistorial]);

  if (!himno) {
    return (
      <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center justify-center px-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-xl text-center max-w-md w-full">
          <FaMusic className="mx-auto text-6xl text-gray-600 mb-6" />
          <h3 className="text-2xl font-bold text-gray-300 mb-4">
            Himno no encontrado
          </h3>
          <p className="text-gray-400 mb-6">
            El himno que buscas no está disponible
          </p>
          <button
            onClick={() => navigate("/himnos")}
            className={`${ui.btnBase} px-5 py-3 mx-auto`}
          >
            <FaHome />
            Volver a himnos
          </button>
        </div>
      </div>
    );
  }

  const temaActual = temasFondo[0];

  return (
    <div
      className={`${temaActual.clase} ${temaActual.texto} min-h-screen relative flex flex-col`}
    >
      {/* ✨ CONTENEDOR DE TOASTS */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>

      {/* Header limpio */}
      <header className="sticky top-0 z-30 bg-black/30 backdrop-blur border-b border-white/10">
        <div className="max-w-[96vw] mx-auto px-2 py-2 sm:px-3 sm:py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className={ui.btnIcon}
                title="Volver"
              >
                <FaArrowLeft />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  {state?.tipo === "vidaCristiana" ? (
                    <span className="inline-flex items-center gap-1">
                      <FaCross /> Vida Cristiana
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <FaBible /> Moravo
                    </span>
                  )}
                  <span className="text-white/30">•</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                    Himno #{himno.numero}
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-semibold truncate leading-tight">
                  {himno.titulo}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={irAtras}
                disabled={posicionHistorial <= 0}
                className={ui.btnIcon}
                title="Atrás"
              >
                <FaUndo />
              </button>
              <button
                onClick={irAdelante}
                disabled={posicionHistorial >= historial.length - 1}
                className={ui.btnIcon}
                title="Adelante"
              >
                <FaRedo />
              </button>

              <button
                onClick={limpiarProyeccion}
                className={`${ui.btnDanger} w-9 h-9 sm:w-10 sm:h-10`}
                title="Limpiar (Esc)"
              >
                <FaStop />
              </button>

              <button
                onClick={proyectarHimno}
                className={`${ui.btnPrimary} w-9 h-9 sm:w-10 sm:h-10`}
                title="Proyectar (Espacio)"
              >
                <FaProjectDiagram />
              </button>

              <button
                onClick={toggleFavorito}
                className={
                  favoritos.has(himno.numero)
                    ? `${ui.btnIcon} bg-red-600 hover:bg-red-500 border-red-500/30`
                    : ui.btnIcon
                }
                title="Favoritos"
              >
                {favoritos.has(himno.numero) ? <FaHeart /> : <FaRegHeart />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 max-w-[96vw] mx-auto px-2 py-2 sm:px-3 sm:py-3 grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3">
          {/* Mini-cards (izquierda) */}
          <aside className="order-2 md:order-1 md:col-span-4 min-h-0">
            <section className="h-full min-h-0 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-3 sm:p-4 flex flex-col">
              <div className="flex items-center justify-between gap-4 mb-2 sm:mb-3">
                <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                  <FaMusic className="text-white/60" />
                  Párrafos
                </h2>
                <span className="text-xs text-white/50">Clic para navegar</span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-400/20 scrollbar-track-transparent">
                {himno.parrafos.map((parrafo, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => cambiarParrafo(index)}
                    className={`w-full text-left rounded-xl border p-3 transition-colors ${
                      selectedParrafo === index
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="text-xs text-white/60">Párrafo</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md border ${
                          selectedParrafo === index
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                            : "border-white/10 bg-white/5 text-white/70"
                        }`}
                      >
                        {index + 1}
                      </span>
                    </div>
                    <p className="text-xs text-white/90 line-clamp-3 leading-relaxed">
                      {parrafo}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          {/* Letra principal (derecha) */}
          <div className="order-1 md:order-2 md:col-span-8 min-h-0 flex flex-col gap-2 sm:gap-3">
            {/* Tarjeta principal */}
            <section className="flex-1 min-h-0 w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-3 sm:p-4 flex flex-col">
              <div className="flex items-center justify-between gap-4 mb-2 sm:mb-3">
                <div className="text-sm text-white/60">
                  Párrafo{" "}
                  <span className="text-white/90">{selectedParrafo + 1}</span>{" "}
                  de{" "}
                  <span className="text-white/90">{himno.parrafos.length}</span>
                </div>
                {isProyectando && (
                  <span className="px-2.5 py-1 rounded-md text-xs border border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                    Proyectando
                  </span>
                )}
              </div>

              <div className="flex-1 min-h-0 flex items-center justify-center">
                <div className="w-full max-w-3xl mx-auto text-center">
                  <div className="px-1 sm:px-2 py-2 sm:py-4 max-h-[52vh] md:max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-400/20 scrollbar-track-transparent pr-1">
                    <div className="min-h-full flex items-center justify-center">
                      <p className="whitespace-pre-line font-medium">
                        <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-relaxed">
                          {himno.parrafos[selectedParrafo]}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-1.5 sm:mt-2 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                    <button
                      onClick={() =>
                        cambiarParrafo(Math.max(0, selectedParrafo - 1))
                      }
                      disabled={selectedParrafo === 0}
                      className={ui.btnIcon}
                      title="Anterior"
                    >
                      <FaArrowLeft />
                    </button>

                    <div className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-xs sm:text-sm text-white/70">
                      Atajos: <span className="text-white/90">Espacio</span>{" "}
                      proyectar · <span className="text-white/90">← →</span>{" "}
                      cambiar · <span className="text-white/90">Esc</span>{" "}
                      limpiar
                    </div>

                    <button
                      onClick={() =>
                        cambiarParrafo(
                          Math.min(
                            himno.parrafos.length - 1,
                            selectedParrafo + 1,
                          ),
                        )
                      }
                      disabled={selectedParrafo === himno.parrafos.length - 1}
                      className={ui.btnIcon}
                      title="Siguiente"
                    >
                      <FaArrowRight />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Progreso */}
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden shrink-0">
              <div
                className="h-full bg-emerald-500/80 transition-all duration-300 ease-out"
                style={{
                  width: `${
                    ((selectedParrafo + 1) /
                      Math.max(1, himno.parrafos.length)) *
                    100
                  }%`,
                }}
              />
            </div>
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
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        .scrollbar-thumb-slate-400\/20::-webkit-scrollbar-thumb {
          background-color: rgba(148, 163, 184, 0.2);
          border-radius: 0.375rem;
        }
        .scrollbar-track-transparent::-webkit-scrollbar-track {
          background-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default HimnoDetalle;
