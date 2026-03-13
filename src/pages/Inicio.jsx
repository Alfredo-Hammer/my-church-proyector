import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {
  FaMapMarkerAlt,
  FaChurch,
  FaMusic,
  FaBook,
  FaHeart,
  FaFilm,
  FaPlay,
  FaPause,
  FaStop,
  FaVolumeUp,
  FaVolumeMute,
  FaTimes,
  FaVideo,
  FaYoutube,
} from "react-icons/fa";
import {motion} from "framer-motion";
import StatWidget from "../components/StatWidget";
import QuickAccessButton from "../components/QuickAccessButton";
import {useMediaPlayer} from "../contexts/MediaPlayerContext";

// Componente de barras animadas de reproducción
const AnimatedSoundBars = () => {
  return (
    <div className="flex items-end gap-0.5 h-3.5">
      <div
        className="w-0.5 bg-green-400 rounded-full"
        style={{
          animation: "soundBar 320ms ease-in-out infinite alternate",
          animationDelay: "0ms",
        }}
      />
      <div
        className="w-0.5 bg-green-400 rounded-full"
        style={{
          animation: "soundBar 480ms ease-in-out infinite alternate",
          animationDelay: "100ms",
        }}
      />
      <div
        className="w-0.5 bg-green-400 rounded-full"
        style={{
          animation: "soundBar 260ms ease-in-out infinite alternate",
          animationDelay: "200ms",
        }}
      />
      <div
        className="w-0.5 bg-green-400 rounded-full"
        style={{
          animation: "soundBar 410ms ease-in-out infinite alternate",
          animationDelay: "300ms",
        }}
      />
      <style>{`
        @keyframes soundBar {
          0% { height: 0.2rem; }
          100% { height: 0.875rem; }
        }
      `}</style>
    </div>
  );
};

// ✨ CITAS BÍBLICAS DIARIAS
const CITAS_BIBLICAS = [
  {
    texto:
      "Confía en el Señor de todo corazón y no dependas de tu propia inteligencia.",
    referencia: "Proverbios 3:5",
  },
  {
    texto:
      "Porque Dios no nos ha dado espíritu de cobardía, sino de poder, de amor y de dominio propio.",
    referencia: "2 Timoteo 1:7",
  },
  {
    texto:
      "He aquí, yo estoy con vosotros todos los días, hasta el fin del mundo.",
    referencia: "Mateo 28:20",
  },
  {
    texto:
      "Venid a mí, todos los que estáis trabajados y cargados, y yo os haré descansar.",
    referencia: "Mateo 11:28",
  },
  {
    texto:
      "Porque por gracia sois salvos por medio de la fe; y esto no de vosotros, pues es don de Dios.",
    referencia: "Efesios 2:8",
  },
  {
    texto: "El Señor es mi luz y mi salvación; ¿de quién temeré?",
    referencia: "Salmos 27:1",
  },
  {
    texto:
      "Deléitarte en el Señor, y he te concederá los deseos de tu corazón.",
    referencia: "Salmos 37:4",
  },
  {
    texto:
      "Dios es amor; y el que permanece en amor, permanece en Dios, y Dios en él.",
    referencia: "1 Juan 4:16",
  },
  {
    texto: "Todo lo puedo en Cristo que me fortalece.",
    referencia: "Filipenses 4:13",
  },
  {
    texto: "La paz os dejo, mi paz os doy; no os la doy como el mundo la da.",
    referencia: "Juan 14:27",
  },
  {
    texto:
      "Porque sabemos que a los que aman a Dios, todas las cosas les ayudan a bien.",
    referencia: "Romanos 8:28",
  },
  {
    texto: "Bienaventurados los que creen sin haber visto.",
    referencia: "Juan 20:29",
  },
  {
    texto:
      "Llamaré a ti en los tiempos de angustia; te libraré, y tú me honrarás.",
    referencia: "Salmos 50:15",
  },
  {
    texto:
      "Guarda tu corazón más que todas las cosas, porque de él mana la vida.",
    referencia: "Proverbios 4:23",
  },
  {
    texto: "Y conoceréis la verdad, y la verdad os hará libres.",
    referencia: "Juan 8:32",
  },
  {
    texto:
      "Mejor es un poco con el temor del Señor, que mucho tesoro con turbación.",
    referencia: "Proverbios 15:16",
  },
  {
    texto: "Levanta tus ojos al cielo, ¿quién creó estas cosas?",
    referencia: "Isaías 40:26",
  },
  {
    texto: "Pero los que esperan en el Señor tendrán nuevas fuerzas.",
    referencia: "Isaías 40:31",
  },
  {
    texto:
      "Engrandeceremos, porque grande es Jehová y digno de suprema alabanza.",
    referencia: "Salmos 48:1",
  },
  {
    texto: "La alegría del Señor es vuestra fortaleza.",
    referencia: "Nehemías 8:10",
  },
];

const Inicio = () => {
  const navigate = useNavigate();
  const mediaContext = useMediaPlayer(); // Hooks siempre deben llamarse en el nivel superior
  const [mensaje, setMensaje] = useState("");
  const [citaDelDia, setCitaDelDia] = useState(null);

  // ✨ FUNCIÓN PARA OBTENER CITA DEL DÍA
  const obtenerCitaDelDia = () => {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), 0, 1);
    const diff = hoy - inicio;
    const unDia = 1000 * 60 * 60 * 24;
    const diaDelAno = Math.floor(diff / unDia);
    const indice = diaDelAno % CITAS_BIBLICAS.length;
    return CITAS_BIBLICAS[indice];
  };
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
    // Cargar cita del día
    setCitaDelDia(obtenerCitaDelDia());
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

  // Helper functions para controles de multimedia
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getMediaIcon = () => {
    const media = mediaContext?.currentMedia;
    if (!media) return null;
    const tipo = media.tipo || media.type;
    switch (tipo) {
      case "audio":
        return <FaMusic className="text-green-400" size={16} />;
      case "youtube":
        return <FaYoutube className="text-red-400" size={16} />;
      case "video":
        return <FaVideo className="text-purple-400" size={16} />;
      default:
        return <FaMusic className="text-gray-400" size={16} />;
    }
  };

  const getMediaName = () => {
    const media = mediaContext?.currentMedia;
    return media?.nombre || media?.name || "Sin título";
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900 border-l border-white/5 flex flex-col">
      {/* Imagen de fondo */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{backgroundImage: "url(/fondos/imagen4.png)"}}
      />

      {/* Overlay oscuro para legibilidad */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none z-10" />

      {/* Header Sticky - Full Width */}
      <motion.header
        initial={{opacity: 0, y: -20}}
        animate={{opacity: 1, y: 0}}
        className="sticky top-0 z-50 backdrop-blur-md border-b border-emerald-500/20 shadow-lg overflow-hidden"
      >
        {/* Fondo base */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800" />

        {/* Fondo animado cuando se está reproduciendo */}
        {mediaContext?.isPlaying && (
          <>
            <div
              className="absolute inset-0 opacity-60"
              style={{
                background:
                  "linear-gradient(45deg, rgba(239, 68, 68, 0.4), rgba(16, 185, 129, 0.4), rgba(59, 130, 246, 0.4), rgba(168, 85, 247, 0.4))",
                backgroundSize: "400% 400%",
                animation: "gradientShift 8s ease infinite",
              }}
            />
            <style>{`
              @keyframes gradientShift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
              }
            `}</style>
          </>
        )}

        <div className="relative z-10 grid grid-cols-3 items-center gap-2 xl:gap-4 px-3 xl:px-6 py-2 xl:py-3">
          {/* Columna izquierda (vacía para balance) */}
          <div />

          {/* Controles de multimedia (centro) */}
          {mediaContext?.currentMedia ? (
            <div className="flex items-center gap-6 flex-1 min-w-0 justify-center">
              {/* Info del media */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative bg-gradient-to-br from-red-500/20 to-red-600/20 p-2 rounded-lg border border-red-500/40">
                  <div className="flex items-center gap-2">
                    {getMediaIcon()}
                    {mediaContext.isPlaying && <AnimatedSoundBars />}
                  </div>
                  {mediaContext.isPlaying && (
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-semibold truncate text-xs">
                    {getMediaName()}
                  </h3>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-400 text-xs capitalize">
                      {mediaContext.currentMedia?.tipo ||
                        mediaContext.currentMedia?.type}
                    </p>
                    {mediaContext.isPlaying && (
                      <span className="flex items-center gap-1 text-green-400 text-xs">
                        <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                        Reproduciendo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Controles de reproducción */}
              <div className="flex items-center gap-3">
                <button
                  onClick={mediaContext.togglePlayPause}
                  className="bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-2 rounded-lg transition-all transform hover:scale-105 shadow-md"
                  title={mediaContext.isPlaying ? "Pausar" : "Reproducir"}
                >
                  {mediaContext.isPlaying ? (
                    <FaPause size={12} />
                  ) : (
                    <FaPlay size={12} />
                  )}
                </button>

                <button
                  onClick={mediaContext.stop}
                  className="bg-gray-700/80 hover:bg-gray-600 text-white p-2 rounded-lg transition-all shadow-sm"
                  title="Detener"
                >
                  <FaStop size={12} />
                </button>
              </div>

              {/* Barra de progreso (solo para audio) */}
              {(mediaContext.currentMedia?.tipo === "audio" ||
                mediaContext.currentMedia?.type === "audio") && (
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <span className="text-xs text-gray-400 font-mono">
                    {formatTime(mediaContext.currentTime)}
                  </span>
                  <div className="flex-1 relative group">
                    <input
                      type="range"
                      min="0"
                      max={mediaContext.duration || 0}
                      value={mediaContext.currentTime}
                      onChange={(e) =>
                        mediaContext.seek(parseFloat(e.target.value))
                      }
                      className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-red-500"
                      style={{
                        background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${
                          (mediaContext.currentTime /
                            (mediaContext.duration || 1)) *
                          100
                        }%, #374151 ${
                          (mediaContext.currentTime /
                            (mediaContext.duration || 1)) *
                          100
                        }%, #374151 100%)`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 font-mono">
                    {formatTime(mediaContext.duration)}
                  </span>
                </div>
              )}

              {/* Control de volumen */}
              <div className="flex items-center gap-3 bg-gray-700/30 rounded-lg px-3 py-2">
                <button
                  onClick={() =>
                    mediaContext.setVolume(mediaContext.volume === 0 ? 50 : 0)
                  }
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {mediaContext.volume === 0 ? (
                    <FaVolumeMute size={12} />
                  ) : (
                    <FaVolumeUp size={12} />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={mediaContext.volume}
                  onChange={(e) =>
                    mediaContext.setVolume(parseInt(e.target.value))
                  }
                  className="w-16 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer accent-red-500"
                  style={{
                    background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${mediaContext.volume}%, #4b5563 ${mediaContext.volume}%, #4b5563 100%)`,
                  }}
                />
                <span className="text-xs text-gray-400 font-mono w-6 text-center">
                  {mediaContext.volume}%
                </span>
              </div>

              {/* Botón de cerrar */}
              <button
                onClick={mediaContext.stop}
                className="text-gray-400 hover:text-red-500 hover:bg-red-500/20 transition-all p-1.5 rounded-lg"
                title="Detener y cerrar reproductor"
              >
                <FaTimes size={14} />
              </button>
            </div>
          ) : (
            <div />
          )}

          {/* Logo + Saludo (Derecha) */}
          <div className="flex items-center gap-2 xl:gap-4 justify-end">
            <div className="text-right hidden lg:block">
              <p className="text-xs xl:text-sm font-semibold text-emerald-400">
                {mensaje}
              </p>
              {configuracion.nombreIglesia && (
                <p className="text-[10px] xl:text-xs text-white/70 truncate max-w-[140px] xl:max-w-none">
                  {configuracion.nombreIglesia}
                </p>
              )}
            </div>
            <div className="rounded-full p-0.5 xl:p-1 bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/30">
              <img
                src={
                  configuracion.logoUrl && configuracion.logoUrl !== "undefined"
                    ? configuracion.logoUrl
                    : "/images/icon-256.png"
                }
                alt={`Logo ${configuracion.nombreIglesia || "Iglesia"}`}
                className="w-9 h-9 xl:w-11 xl:h-11 2xl:w-12 2xl:h-12 rounded-full object-cover"
                onError={(e) => {
                  e.target.src = "/images/icon-256.png";
                }}
              />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Contenido principal (scroll interno arriba + botones siempre visibles) */}
      <div className="relative z-20 flex-1 min-h-0 px-4 py-3 md:px-6 xl:px-10 xl:py-4 2xl:px-16 overflow-hidden">
        <motion.main
          className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto h-full flex flex-col min-h-0"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Parte superior fija: Inspiración + Accesos Rápidos (siempre visible) */}
          <div className="shrink-0">
            <motion.section
              variants={itemVariants}
              className="mt-2 sm:mt-6 text-center"
            >
              {citaDelDia && (
                <div className="max-w-4xl mx-auto">
                  <div className="max-h-24 sm:max-h-none overflow-y-auto pr-1">
                    <p className="text-base sm:text-xl md:text-2xl xl:text-3xl text-white/80 italic font-light leading-relaxed mb-1.5">
                      "{citaDelDia.texto}"
                    </p>
                    <p className="text-xs sm:text-sm text-white/60">
                      {citaDelDia.referencia}
                    </p>
                  </div>
                </div>
              )}
            </motion.section>

            <motion.section variants={itemVariants} className="pt-3 sm:pt-6">
              <h3 className="text-base sm:text-lg xl:text-xl font-semibold text-white mb-3 sm:mb-4">
                Accesos Rápidos
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 xl:gap-5">
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
          </div>

          {/* Scroll inferior: estadísticas + footer */}
          <div className="flex-1 min-h-0 overflow-y-auto pt-4 sm:pt-6">
            <motion.section variants={itemVariants} className="mb-8">
              <h3 className="text-base sm:text-lg xl:text-xl font-semibold text-white mb-3 sm:mb-4">
                Tu Actividad
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 xl:gap-5">
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

            <motion.footer
              variants={itemVariants}
              className="mt-10 sm:mt-24 mb-6 text-center"
            >
              <div className="text-white/40 text-sm">
                <p className="mb-1">Desarrollado con 💚 por</p>
                <p className="font-semibold text-emerald-400/60">
                  Alfredo Hammer
                </p>
              </div>
            </motion.footer>
          </div>
        </motion.main>
      </div>
    </div>
  );
};

export default Inicio;
