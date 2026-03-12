import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {
  FaClock,
  FaMapMarkerAlt,
  FaChurch,
  FaMusic,
  FaBook,
  FaHeart,
  FaFilm,
} from "react-icons/fa";
import {motion} from "framer-motion";
import StatWidget from "../components/StatWidget";
import QuickAccessButton from "../components/QuickAccessButton";
import {useMediaPlayer} from "../contexts/MediaPlayerContext";

const Inicio = () => {
  const navigate = useNavigate();
  let mediaContext = null;
  try {
    mediaContext = useMediaPlayer();
  } catch {
    // Si no estamos dentro de MediaPlayerProvider, mediaContext será null
    mediaContext = null;
  }
  const [mensaje, setMensaje] = useState("");
  const [fechaHora, setFechaHora] = useState("");

  // ✨ ESTADOS PARA ESTADÍSTICAS
  const [estadisticas, setEstadisticas] = useState({
    totalHimnos: 0,
    totalFavoritos: 0,
    totalMultimedia: 0,
    totalVidaCristiana: 0,
  });

  // ✨ ESTADOS PARA CONFIGURACIÓN
  const [configuracion, setConfiguracion] = useState({
    nombreIglesia: "",
    eslogan: "",
    direccion: "",
    logoUrl: "/images/icon-256.png",
  });
  const [configuracionCargada, setConfiguracionCargada] = useState(false);

  // ✨ FUNCIÓN PARA CARGAR CONFIGURACIÓN
  const cargarConfiguracion = async () => {
    try {
      if (window.electron?.obtenerConfiguracion) {
        const config = await window.electron.obtenerConfiguracion();
        if (config) {
          setConfiguracion((prevConfig) => ({
            ...prevConfig,
            ...config,
            logoUrl:
              config.logoUrl || prevConfig.logoUrl || "/images/icon-256.png",
          }));
        }
      }
    } catch (error) {
      console.error("❌ [Inicio] Error cargando configuración:", error);
    } finally {
      setConfiguracionCargada(true);
    }
  };

  // ✨ CARGAR ESTADÍSTICAS DESDE LOCALSTORAGE
  const cargarEstadisticas = () => {
    try {
      const himnosFav = localStorage.getItem("himnosFavoritos") || "[]";
      const vidaCristianaFav =
        localStorage.getItem("himnosVidaCristianaFavoritos") || "[]";
      const favoritosPersonalizados =
        localStorage.getItem("favoritosPersonalizados") || "[]";
      const favoritosBiblia = localStorage.getItem("favoritosBiblia") || "[]";

      const totalHimnosFav = JSON.parse(himnosFav).length;
      const totalVidaCristiana = JSON.parse(vidaCristianaFav).length;
      const totalPersonalizados = JSON.parse(favoritosPersonalizados).length;
      const totalBiblia = JSON.parse(favoritosBiblia).length;

      setEstadisticas({
        totalHimnos: totalHimnosFav,
        totalFavoritos: totalPersonalizados + totalBiblia,
        totalMultimedia: 0, // Se actualizará si hay datos de multimedia
        totalVidaCristiana: totalVidaCristiana,
      });
    } catch (error) {
      console.error("❌ [Inicio] Error cargando estadísticas:", error);
    }
  };

  // ✨ CARGAR CONFIGURACIÓN AL INICIAR
  useEffect(() => {
    cargarConfiguracion();
    cargarEstadisticas();

    // ✨ LISTENER PARA ACTUALIZACIONES EN TIEMPO REAL
    if (window.electron?.on) {
      window.electron.on("configuracion-actualizada", (event, nuevaConfig) => {
        console.log("🔄 [Inicio] Configuración actualizada:", nuevaConfig);
        setConfiguracion((prevConfig) => ({
          ...prevConfig,
          ...nuevaConfig,
        }));
      });
    }

    return () => {
      if (window.electron?.removeAllListeners) {
        window.electron.removeAllListeners("configuracion-actualizada");
      }
    };
  }, []);

  // Actualizar el mensaje de bienvenida según la hora
  useEffect(() => {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) {
      setMensaje("Buenos días");
    } else if (hora >= 12 && hora < 18) {
      setMensaje("Buenas tardes");
    } else {
      setMensaje("Buenas noches");
    }
  }, []);

  // Actualizar la fecha y hora cada segundo
  useEffect(() => {
    const intervalo = setInterval(() => {
      const ahora = new Date();
      const opcionesFecha = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      const fecha = ahora.toLocaleDateString("es-ES", opcionesFecha);
      const hora = ahora.toLocaleTimeString("es-ES");
      setFechaHora(`${fecha} - ${hora}`);
    }, 1000);

    return () => clearInterval(intervalo);
  }, []);

  // ✨ LOADER MODERNO
  if (!configuracionCargada) {
    return (
      <div className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-l border-white/5">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
        <div className="relative z-10 flex items-center justify-center text-white">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-emerald-400 border-r-emerald-400 mb-4 mx-auto"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-emerald-400/20"></div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Cargando</h3>
            <p className="text-white/60 animate-pulse text-sm">
              Preparando la experiencia...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✨ VARIANTES DE ANIMACIÓN
  const containerVariants = {
    hidden: {opacity: 0},
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: {opacity: 0, y: 20},
    visible: {opacity: 1, y: 0, transition: {duration: 0.4}},
  };

  return (
    <div className="relative w-full h-screen overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-l border-white/5">
      {/* Overlay suave para profundidad */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/25 pointer-events-none" />

      {/* Contenido principal scrolleable */}
      <div className="relative z-10 px-4 py-6 md:px-6">
        {/* Header Sticky - Mejorado */}
        <motion.header
          initial={{opacity: 0, y: -20}}
          animate={{opacity: 1, y: 0}}
          className="sticky top-0 z-40 bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-md border-b border-emerald-500/20 rounded-b-2xl mb-8 px-6 py-4 shadow-lg"
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            {/* Reloj (Izquierda) */}
            <div className="flex-1">
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2 w-fit">
                <FaClock className="text-emerald-400 text-sm" />
                <p className="text-xs md:text-sm font-mono text-white/80 whitespace-nowrap">
                  {fechaHora}
                </p>
              </div>
            </div>

            {/* Logo + Saludo (Derecha) */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm md:text-base font-semibold text-emerald-400">
                  {mensaje}
                </p>
                {configuracion.nombreIglesia && (
                  <p className="text-xs text-white/70">
                    {configuracion.nombreIglesia}
                  </p>
                )}
              </div>
              <div className="rounded-full p-1 bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/30">
                <img
                  src={
                    configuracion.logoUrl &&
                    configuracion.logoUrl !== "undefined"
                      ? configuracion.logoUrl
                      : "/images/icon-256.png"
                  }
                  alt={`Logo ${configuracion.nombreIglesia || "Iglesia"}`}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover"
                  onError={(e) => {
                    e.target.src = "/images/icon-256.png";
                  }}
                />
              </div>
            </div>
          </div>
        </motion.header>

        {/* Contenido Principal */}
        <motion.main
          className="max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* 2️⃣ SECCIÓN ESTADÍSTICAS */}
          <motion.section variants={itemVariants} className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">
              Tu Actividad
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatWidget
                icon={FaMusic}
                value={estadisticas.totalHimnos}
                label="Himnos Favoritos"
                accentColor="emerald"
              />
              <StatWidget
                icon={FaBook}
                value={estadisticas.totalVidaCristiana}
                label="Vida Cristiana"
                accentColor="amber"
              />
              <StatWidget
                icon={FaHeart}
                value={estadisticas.totalFavoritos}
                label="Otros Favoritos"
                accentColor="rose"
              />
              <StatWidget
                icon={FaFilm}
                value={estadisticas.totalMultimedia}
                label="Multimedia"
                accentColor="indigo"
              />
            </div>
          </motion.section>

          {/* 3️⃣ SECCIÓN ACCESOS RÁPIDOS */}
          <motion.section variants={itemVariants} className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">
              Accesos Rápidos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickAccessButton
                icon={FaMusic}
                label="Himnos"
                onClick={() => navigate("/himnos")}
                color="emerald"
              />
              <QuickAccessButton
                icon={FaBook}
                label="Biblia"
                onClick={() => navigate("/biblia")}
                color="indigo"
              />
              <QuickAccessButton
                icon={FaHeart}
                label="Favoritos"
                onClick={() => navigate("/favoritos")}
                color="rose"
              />
              <QuickAccessButton
                icon={FaFilm}
                label="Multimedia"
                onClick={() => navigate("/multimedia")}
                color="amber"
              />
            </div>
          </motion.section>

          {/* 5️⃣ SECCIÓN REPRODUCTOR DESTACADO */}
          {mediaContext?.currentMedia && (
            <motion.section variants={itemVariants} className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">
                Reproduciendo Ahora
              </h3>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <p className="text-white/80 text-center">
                  {mediaContext.currentMedia.title || "Sin título"}
                </p>
              </div>
            </motion.section>
          )}

          {/* Espacio final */}
          <div className="h-8" />
        </motion.main>
      </div>
    </div>
  );
};

export default Inicio;
