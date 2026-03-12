import React, {useState, useEffect} from "react";
import {Link} from "react-router-dom";
import {
  FaHeart,
  FaPlay,
  FaMagnifyingGlass,
  FaFilter,
  FaCheck,
  FaXmark,
  FaList,
  FaHeadphones,
  FaBookBible,
} from "react-icons/fa6";
import {FaTh} from "react-icons/fa";
import himnosData from "../data/himnos.json";

const Himnos = () => {
  const API_BASE = "http://localhost:3001";

  const [busqueda, setBusqueda] = useState("");
  const [himnos, setHimnos] = useState(himnosData);
  const [vistaGrid, setVistaGrid] = useState(false);
  const [ordenamiento, setOrdenamiento] = useState("numero");
  const [favoritos, setFavoritos] = useState(new Set());

  // ✨ ESTADO PARA TOASTS
  const [toasts, setToasts] = useState([]);

  // ✨ ESTADO PARA EL LOGO Y CONFIGURACIÓN DE LA IGLESIA
  const [logoIglesia, setLogoIglesia] = useState(null);

  useEffect(() => {
    const inicializar = async () => {
      await Promise.all([
        cargarHimnosDesdeServidor(),
        cargarConfiguracionIglesia(),
      ]);
    };

    inicializar();
  }, []);

  const cargarHimnosDesdeServidor = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/himnos?tipo=moravo`, {
        method: "GET",
        headers: {Accept: "application/json"},
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok || !Array.isArray(json?.himnos)) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      const normalizados = json.himnos
        .map((h) => ({
          id: h?.id,
          numero: h?.numero,
          titulo: h?.titulo,
          parrafos: Array.isArray(h?.parrafos) ? h.parrafos : [],
          favorito: Boolean(h?.favorito),
          fuente: h?.fuente,
        }))
        .filter((h) => h?.titulo);

      setHimnos(normalizados);
      setFavoritos(
        new Set(normalizados.filter((h) => h.favorito).map((h) => h.numero)),
      );
    } catch (error) {
      console.warn("⚠️ No se pudo cargar himnos desde servidor:", error);
      setHimnos(himnosData);
      // Favoritos se verán según el backend cuando esté disponible.
      setFavoritos(new Set());
    }
  };

  // ✨ FUNCIÓN PARA CARGAR CONFIGURACIÓN (usando la misma interfaz que Configuracion.jsx)
  const cargarConfiguracionIglesia = async () => {
    try {
      console.log("🔄 Cargando configuración de la iglesia...");

      // ✅ USAR LA MISMA INTERFAZ QUE EN CONFIGURACION.JSX
      if (!window.electron?.obtenerConfiguracion) {
        console.warn("⚠️ Funciones de configuración no disponibles");
        return;
      }

      const configuracion = await window.electron.obtenerConfiguracion();
      console.log("📋 Configuración obtenida:", configuracion);

      if (configuracion) {
        // Usar logoUrl o el logo por defecto
        const logo = configuracion.logoUrl || "/images/icon-256.png";
        setLogoIglesia(logo);
        console.log("🖼️ Logo cargado:", logo);
      } else {
        console.warn("⚠️ No se obtuvo configuración");
        // Usar logo por defecto
        setLogoIglesia("/images/icon-256.png");
      }
    } catch (error) {
      console.error("❌ Error cargando configuración:", error);
    }
  };

  // ✨ FUNCIÓN PARA AGREGAR TOAST
  const addToast = (message, type = "success", duration = 3000) => {
    const id = Date.now();
    const newToast = {id, message, type};

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  };

  // ✨ FUNCIÓN PARA REMOVER TOAST
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const toggleFavorito = async (himno) => {
    const numero = himno?.numero;
    const id = himno?.id || `base:moravo:${String(numero)}`;
    if (!numero) return;

    const prevFavoritos = new Set(favoritos);
    const esAgregar = !prevFavoritos.has(numero);
    const nuevosFavoritos = new Set(prevFavoritos);

    if (esAgregar) nuevosFavoritos.add(numero);
    else nuevosFavoritos.delete(numero);

    // Optimista
    setFavoritos(nuevosFavoritos);
    setHimnos((prev) =>
      (Array.isArray(prev) ? prev : []).map((h) =>
        h?.numero === numero ? {...h, favorito: esAgregar} : h,
      ),
    );

    try {
      const res = await fetch(
        `${API_BASE}/api/himnos/${encodeURIComponent(String(id))}/favorito`,
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

      if (esAgregar) {
        addToast(`❤️ "${himno?.titulo}" agregado a favoritos`, "success");
      } else {
        addToast(`💔 "${himno?.titulo}" removido de favoritos`, "info");
      }
    } catch (error) {
      console.warn("❌ Error actualizando favorito (backend):", error);
      // Rollback y refresco
      setFavoritos(prevFavoritos);
      setHimnos((prev) =>
        (Array.isArray(prev) ? prev : []).map((h) =>
          h?.numero === numero
            ? {...h, favorito: prevFavoritos.has(numero)}
            : h,
        ),
      );
      addToast("❌ No se pudo actualizar favorito (servidor)", "info");
    }
  };

  // ✨ COMPONENTE TOAST
  const Toast = ({toast}) => {
    const getIcon = () => {
      switch (toast.type) {
        case "success":
          return <FaCheck className="text-green-400" />;
        case "info":
          return <FaHeart className="text-blue-400" />;
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
          <FaXmark className="text-xs" />
        </button>
      </div>
    );
  };

  const ui = {
    surface: "bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl",
    btn: "inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors",
    btnIcon:
      "w-10 h-10 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors",
  };

  const filtrados = himnos
    .filter(
      (himno) =>
        himno.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        himno.numero.toString().includes(busqueda),
    )
    .sort((a, b) => {
      switch (ordenamiento) {
        case "titulo":
          return a.titulo.localeCompare(b.titulo);
        case "favoritos":
          const aEsFavorito = favoritos.has(a.numero);
          const bEsFavorito = favoritos.has(b.numero);
          if (aEsFavorito && !bEsFavorito) return -1;
          if (!aEsFavorito && bEsFavorito) return 1;
          return a.numero - b.numero;
        default:
          return a.numero - b.numero;
      }
    });

  const estadisticas = {
    total: himnos.length,
    filtrados: filtrados.length,
    favoritos: favoritos.size,
  };

  return (
    <>
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 min-h-screen overflow-y-auto">
        {/* ✨ CONTENEDOR DE TOASTS */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} />
          ))}
        </div>

        {/* Header */}
        <div className="bg-black/30 backdrop-blur border-b border-white/10 sticky top-0 z-40">
          <div className="max-w-[96vw] mx-auto px-3 py-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
                    <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10">
                      <FaBookBible /> Himnario
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-semibold">
                    Himnario Moravo
                  </h1>
                  <p className="text-white/60">
                    {estadisticas.filtrados} himnos disponibles para adoración
                  </p>
                </div>
              </div>

              {/* Estadísticas y Logo */}
              <div className="flex items-center gap-6">
                {/* Estadísticas modernas */}
                <div className="flex gap-4">
                  <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/20 text-center min-w-[92px]">
                    <div className="text-xl font-semibold text-white">
                      {estadisticas.total}
                    </div>
                    <div className="text-xs text-white/50">Total</div>
                  </div>
                  <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/20 text-center min-w-[92px]">
                    <div className="text-xl font-semibold text-white">
                      {estadisticas.favoritos}
                    </div>
                    <div className="text-xs text-white/50">Favoritos</div>
                  </div>
                </div>

                {/* Logo de la iglesia - siempre visible */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-2 border border-white/10">
                  <img
                    src={logoIglesia || "/images/icon-256.png"}
                    alt="Logo Iglesia"
                    className="w-12 h-12 object-cover rounded-lg"
                    onError={(e) => {
                      console.error("❌ Error cargando logo:", logoIglesia);
                      e.target.src = "/images/icon-256.png";
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Barra de búsqueda mejorada */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 relative">
                  <FaMagnifyingGlass className="absolute left-3 top-3 text-white/40" />
                  <input
                    type="text"
                    placeholder="Buscar himnos por título o número..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <FaFilter className="text-white/40" />
                  <select
                    value={ordenamiento}
                    onChange={(e) => setOrdenamiento(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    <option value="numero" className="bg-gray-800">
                      Por Número
                    </option>
                    <option value="titulo" className="bg-gray-800">
                      Por Título
                    </option>
                    <option value="favoritos" className="bg-gray-800">
                      Favoritos Primero
                    </option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVistaGrid(false)}
                    className={`${ui.btnIcon} ${
                      !vistaGrid
                        ? "bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30"
                        : "text-white/70"
                    }`}
                    title="Vista lista"
                  >
                    <FaList />
                  </button>
                  <button
                    onClick={() => setVistaGrid(true)}
                    className={`${ui.btnIcon} ${
                      vistaGrid
                        ? "bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30"
                        : "text-white/70"
                    }`}
                    title="Vista grid"
                  >
                    <FaTh />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-white/60">
                <span>
                  Mostrando {estadisticas.filtrados} de {estadisticas.total}{" "}
                  himnos
                </span>
                {busqueda && (
                  <span className="bg-white/5 border border-white/10 text-white/70 px-3 py-1 rounded-full">
                    Búsqueda: "{busqueda}"
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[96vw] mx-auto px-3 py-6">
          {/* Lista/Grid de himnos */}
          {filtrados.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-10 border border-white/10 shadow-xl">
                <h3 className="text-2xl font-bold text-gray-300 mb-4">
                  No se encontraron himnos
                </h3>
                <p className="text-gray-400 mb-6">
                  Intenta con otros términos de búsqueda o ajusta los filtros
                </p>
                <button
                  onClick={() => setBusqueda("")}
                  className={`${ui.btn} px-5 py-3 mx-auto`}
                >
                  <FaMagnifyingGlass />
                  Ver todos los himnos
                </button>
              </div>
            </div>
          ) : vistaGrid ? (
            /* Vista Grid moderna */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtrados.map((himno) => (
                <div
                  key={himno.numero}
                  className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 shadow-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-1 bg-white/5 border border-white/10 text-white/70 rounded-full">
                        #{himno.numero}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleFavorito(himno);
                      }}
                      className={`transition-colors ${
                        favoritos.has(himno.numero)
                          ? "text-red-400 hover:text-red-300"
                          : "text-white/50 hover:text-red-400"
                      }`}
                    >
                      <FaHeart
                        className={
                          favoritos.has(himno.numero) ? "fill-current" : ""
                        }
                      />
                    </button>
                  </div>

                  <Link to={`/himno/${himno.numero}`} className="block">
                    <h3 className="text-base font-semibold text-white mb-4 line-clamp-2">
                      {himno.titulo}
                    </h3>

                    <div className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors">
                      <FaPlay className="text-sm" />
                      <span>Ver Himno</span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            /* Vista Lista moderna */
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-lg overflow-hidden">
              {filtrados.map((himno, index) => (
                <div
                  key={himno.numero}
                  className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${
                    index !== filtrados.length - 1
                      ? "border-b border-white/10"
                      : ""
                  }`}
                >
                  <Link
                    to={`/himno/${himno.numero}`}
                    className="flex items-center space-x-4 flex-1"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white/5 border border-white/10 text-white text-sm font-semibold px-3 py-2 rounded-lg min-w-[60px] text-center">
                        {himno.numero}
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="font-medium text-white">{himno.titulo}</h3>
                    </div>

                    <div className="flex items-center gap-2 text-white/50">
                      <FaHeadphones />
                      <span className="text-sm">Reproducir</span>
                    </div>
                  </Link>

                  <button
                    onClick={() => toggleFavorito(himno)}
                    className={`ml-4 p-2 rounded-full transition-colors ${
                      favoritos.has(himno.numero)
                        ? "text-red-400 hover:text-red-300"
                        : "text-white/50 hover:text-red-400"
                    }`}
                  >
                    <FaHeart
                      className={
                        favoritos.has(himno.numero) ? "fill-current" : ""
                      }
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <style jsx>{`
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}</style>
      </div>
    </>
  );
};

export default Himnos;
