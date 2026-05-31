import React, {useState, useEffect} from "react";
import {useMediaPlayer} from "../contexts/MediaPlayerContext";
import {
  FaPlay,
  FaPause,
  FaStop,
  FaVolumeUp,
  FaVolumeMute,
  FaTimes,
  FaMusic,
  FaVideo,
  FaYoutube,
  FaSyncAlt,
  FaDesktop,
} from "react-icons/fa";

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

const Header = () => {
  const [configuracion, setConfiguracion] = useState({
    nombreIglesia: "",
    logoUrl: "",
  });
  const [mensaje, setMensaje] = useState(() => {
    const hora = new Date().getHours();
    if (hora < 12) return "Buenos días";
    if (hora < 18) return "Buenas tardes";
    return "Buenas noches";
  });
  const [modoUnicoMonitor, setModoUnicoMonitor] = useState(false);

  const {
    currentMedia,
    lastPlayedMedia,
    isPlaying,
    isLooping,
    toggleLoop,
    volume,
    currentTime,
    duration,
    togglePlayPause,
    stop,
    setVolume,
    seek,
    playMedia,
  } = useMediaPlayer();

  // Igual que GlobalMediaPlayer: mostrar el último medio aunque esté detenido
  const mediaToShow = currentMedia || lastPlayedMedia;
  const isStopped = !currentMedia && !!lastPlayedMedia;

  // Cargar configuración
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("http://localhost:3001/configuracion");
        const data = await response.json();
        if (data && data.length > 0) {
          setConfiguracion(data[0]);
        }
      } catch (error) {
        console.error("Error cargando configuración:", error);
      }
    };
    loadConfig();
  }, []);

  // Detectar cuando el proyector abre en modo un solo monitor
  useEffect(() => {
    if (!window.electron?.on) return;
    const handler = () => {
      setModoUnicoMonitor(true);
      setTimeout(() => setModoUnicoMonitor(false), 8000);
    };
    window.electron.on("proyector-modo-unico-monitor", handler);
    return () => {
      window.electron.removeListener?.("proyector-modo-unico-monitor", handler);
    };
  }, []);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getMediaIcon = () => {
    if (!mediaToShow) return null;
    const tipo = mediaToShow.tipo || mediaToShow.type;
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
    return mediaToShow?.nombre || mediaToShow?.name || "Sin título";
  };

  const tipoActual = mediaToShow?.tipo || mediaToShow?.type;

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md border-b border-emerald-500/20 shadow-lg overflow-hidden">
      {/* Banner: modo un solo monitor */}
      {modoUnicoMonitor && (
        <div className="relative z-10 bg-amber-500/90 text-amber-950 text-xs font-semibold px-4 py-1.5 flex items-center gap-2 justify-center">
          <FaDesktop size={11} />
          Proyector abierto en esta pantalla, conecta un segundo monitor para
          modo presentación
          <button
            type="button"
            onClick={() => setModoUnicoMonitor(false)}
            className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Cerrar aviso"
          >
            <FaTimes size={10} />
          </button>
        </div>
      )}

      {/* Fondo base */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800" />

      {/* Fondo animado cuando se está reproduciendo */}
      {isPlaying && (
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

      <div className="relative grid grid-cols-3 items-center gap-2 xl:gap-4 px-3 xl:px-6 py-2 xl:py-3">
        {/* Columna izquierda (vacía para balance) */}
        <div />

        {/* Controles de multimedia (centro) */}
        {mediaToShow ? (
          <div className="flex items-center gap-3 flex-1 min-w-0 justify-center">
            {/* Info del media (compacta) */}
            <div className="flex items-center gap-2 min-w-0 max-w-[140px] lg:max-w-[180px] 2xl:max-w-[240px]">
              <div className={`relative p-1.5 rounded-lg border ${isStopped ? "bg-gray-700/40 border-gray-600/40" : "bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/40"}`}>
                {getMediaIcon()}
                {isPlaying && (
                  <div className="absolute -top-0.5 -right-0.5 size-1.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
                )}
                {isStopped && (
                  <div className="absolute -top-0.5 -right-0.5 size-1.5 bg-gray-500 rounded-full" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`font-medium truncate text-[10px] xl:text-xs ${isStopped ? "text-gray-400" : "text-white"}`}>
                  {getMediaName()}
                </h3>
                <div className="flex items-center gap-1.5">
                  <p className="text-gray-500 text-[9px] xl:text-[10px] capitalize truncate">
                    {isStopped ? "detenido" : tipoActual}
                  </p>
                  {isPlaying && <AnimatedSoundBars />}
                </div>
              </div>
            </div>

            {/* Controles de reproducción (compactos) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={isStopped ? () => playMedia(lastPlayedMedia) : togglePlayPause}
                className="bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-2 rounded-lg transition-all shadow-md"
                title={isPlaying ? "Pausar" : "Reproducir"}
                aria-label={isPlaying ? "Pausar reproducción" : "Reproducir"}
              >
                {isPlaying ? <FaPause size={10} /> : <FaPlay size={10} />}
              </button>
              <button
                type="button"
                onClick={stop}
                disabled={isStopped}
                className="bg-gray-700/80 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-all shadow-sm"
                title="Detener"
                aria-label="Detener reproducción"
              >
                <FaStop size={10} />
              </button>
            </div>

            {/* Barra de progreso (solo para audio, compacta) */}
            {tipoActual === "audio" && !isStopped && (
              <div className="flex items-center gap-1.5 flex-1 max-w-[160px] lg:max-w-[220px] 2xl:max-w-[300px]">
                <span className="text-[9px] xl:text-[10px] text-gray-400 font-mono min-w-[28px] xl:min-w-[32px]">
                  {formatTime(currentTime)}
                </span>
                <div className="flex-1 relative group">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={(e) => seek(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-red-500"
                    aria-label="Control de tiempo de reproducción"
                    style={{
                      background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${
                        (currentTime / (duration || 1)) * 100
                      }%, #374151 ${
                        (currentTime / (duration || 1)) * 100
                      }%, #374151 100%)`,
                    }}
                  />
                </div>
                <span className="text-[9px] xl:text-[10px] text-gray-400 font-mono min-w-[28px] xl:min-w-[32px]">
                  {formatTime(duration)}
                </span>
              </div>
            )}

            {/* Control de volumen (compacto) */}
            <div className="flex items-center gap-2 bg-gray-700/30 rounded-lg px-2 py-1.5">
              <button
                type="button"
                onClick={() => setVolume(volume === 0 ? 50 : 0)}
                className="text-gray-400 hover:text-white transition-colors"
                title={volume === 0 ? "Activar sonido" : "Silenciar"}
                aria-label={volume === 0 ? "Activar sonido" : "Silenciar"}
              >
                {volume === 0 ? (
                  <FaVolumeMute size={11} />
                ) : (
                  <FaVolumeUp size={11} />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-10 xl:w-14 2xl:w-16 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer accent-red-500"
                aria-label="Control de volumen"
                style={{
                  background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${volume}%, #4b5563 ${volume}%, #4b5563 100%)`,
                }}
              />
            </div>

            {/* Botones adicionales (compactos) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleLoop}
                className={`transition-all p-1.5 rounded-lg ${
                  isLooping
                    ? "text-green-400 bg-green-500/20 hover:bg-green-500/30"
                    : "text-gray-400 hover:text-green-400 hover:bg-green-500/20"
                }`}
                title={
                  isLooping ? "Desactivar repetición" : "Activar repetición"
                }
              >
                <FaSyncAlt
                  size={10}
                  className={isLooping ? "animate-pulse" : ""}
                />
              </button>
              <button
                type="button"
                onClick={stop}
                className="text-white/40 hover:text-red-500 hover:bg-red-500/20 transition-all p-1.5 rounded-lg"
                title="Detener y cerrar reproductor"
              >
                <FaTimes size={11} />
              </button>
            </div>
          </div>
        ) : (
          <div />
        )}

        {/* Logo + Saludo (derecha) */}
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
              className="size-9 xl:w-11 xl:h-11 2xl:w-12 2xl:h-12 rounded-full object-cover"
              onError={(e) => {
                e.target.src = "/images/icon-256.png";
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
