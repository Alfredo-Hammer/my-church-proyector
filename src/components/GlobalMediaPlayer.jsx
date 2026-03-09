import React, {useState, useEffect} from "react";
import {useMediaPlayer} from "../contexts/MediaPlayerContext";
import {useLocation} from "react-router-dom";
import {
  FaPlay,
  FaPause,
  FaStop,
  FaVolumeUp,
  FaVolumeMute,
  FaTimes,
  FaExpand,
  FaMusic,
  FaVideo,
  FaImage,
} from "react-icons/fa";

const GlobalMediaPlayer = () => {
  const location = useLocation();
  const isInMultimediaPage = location.pathname === "/multimedia";
  const [iframePosition, setIframePosition] = useState({});
  const [useInvidious, setUseInvidious] = useState(false); // ✨ Estado para fallback
  const [iframeError, setIframeError] = useState(false); // ✨ Detectar errores de carga

  // ✨ Estados para hacer el PIP arrastrable
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({x: 0, y: 0});
  const [pipPosition, setPipPosition] = useState({bottom: 80, right: 16}); // Posición inicial

  const {
    currentMedia,
    isPlaying,
    volume,
    currentTime,
    duration,
    isMinimized,
    setIsMinimized,
    togglePlayPause,
    stop,
    setVolume,
    seek,
    videoRef,
  } = useMediaPlayer();

  const tipoActual = currentMedia?.tipo || currentMedia?.type;
  const isYouTube = Boolean(currentMedia?.isYoutube);
  const canControlYouTube = isYouTube && !useInvidious;

  const sendYouTubeCommand = (func, args = []) => {
    try {
      if (!canControlYouTube) return;
      const iframe = document.getElementById("global-youtube-player");
      const win = iframe?.contentWindow;
      if (!win) return;
      win.postMessage(JSON.stringify({event: "command", func, args}), "*");
    } catch (error) {
      console.warn("⚠️ Error enviando comando a YouTube:", error);
    }
  };

  // Mantener el video local sincronizado con isPlaying
  useEffect(() => {
    if (!currentMedia) return;
    if (currentMedia.isYoutube || tipoActual !== "video") return;

    const el = videoRef?.current;
    if (!el) return;

    if (isPlaying) {
      el.play().catch(() => {
        // Si el autoplay está bloqueado, no romper la UI.
      });
    } else {
      el.pause();
    }
  }, [isPlaying, currentMedia?.isYoutube, tipoActual, videoRef]);

  // Mantener YouTube sincronizado con isPlaying (sin autoplay)
  useEffect(() => {
    if (!currentMedia) return;
    if (!canControlYouTube) return;

    if (isPlaying) {
      sendYouTubeCommand("playVideo");
    } else {
      sendYouTubeCommand("pauseVideo");
    }
  }, [isPlaying, currentMedia?.url, canControlYouTube]);

  // Recalcular posición del iframe/video cuando cambiamos de página o cambia el tamaño
  useEffect(() => {
    if (!currentMedia?.isYoutube && tipoActual !== "video") return;

    const updatePosition = () => {
      if (isInMultimediaPage) {
        const multimediaContainer = document.getElementById(
          "multimedia-preview-container",
        );
        if (multimediaContainer) {
          const rect = multimediaContainer.getBoundingClientRect();

          // Verificar si el contenedor está visible en el viewport
          const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

          if (isVisible) {
            // Si está visible, posicionar el video sobre el contenedor
            setIframePosition({
              position: "fixed",
              top: `${rect.top}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              borderRadius: "0.75rem",
              zIndex: 10,
            });
          } else {
            // Si no está visible (por scroll), mostrar flotante pequeño
            setIframePosition({
              position: "fixed",
              bottom: "5rem",
              right: "1rem",
              width: "16rem",
              height: "auto",
              aspectRatio: "16/9",
              borderRadius: "0.5rem",
              zIndex: 50,
            });
          }
        }
      } else {
        // Posición flotante en otras páginas
        const bottom = isMinimized ? "5rem" : "6rem";
        const width = isMinimized ? "20rem" : "24rem";
        setIframePosition({
          position: "fixed",
          bottom: bottom,
          right: "1rem",
          width: width,
          height: "auto",
          aspectRatio: "16/9",
          borderRadius: "0.5rem",
          zIndex: 50,
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true); // true para capturar el scroll en toda la app

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isInMultimediaPage, isMinimized, currentMedia?.isYoutube, tipoActual]);

  // ✨ Resetear estados cuando cambia el video
  useEffect(() => {
    setUseInvidious(false);
    setIframeError(false);
  }, [currentMedia?.url]);

  // ✨ Funciones para arrastrar el PIP
  const handleMouseDown = (e) => {
    if (isInMultimediaPage) return; // No arrastrar si estamos en la página de multimedia
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.right,
      y: e.clientY - rect.bottom,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newRight = window.innerWidth - e.clientX - dragOffset.x;
    const newBottom = window.innerHeight - e.clientY - dragOffset.y;

    // Limitar a los bordes de la pantalla
    const clampedRight = Math.max(
      0,
      Math.min(newRight, window.innerWidth - 320),
    );
    const clampedBottom = Math.max(
      0,
      Math.min(newBottom, window.innerHeight - 180),
    );

    setPipPosition({
      right: clampedRight,
      bottom: clampedBottom,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // No mostrar si no hay media
  if (!currentMedia) return null;

  // No mostrar para imágenes (solo audio y video)
  const tipo = currentMedia.tipo || currentMedia.type;
  if (tipo === "imagen") return null;

  // Formatear tiempo
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getMediaIcon = () => {
    const tipo = currentMedia.tipo || currentMedia.type;
    switch (tipo) {
      case "audio":
        return <FaMusic className="text-green-400" />;
      case "video":
      case "youtube":
        return <FaVideo className="text-red-400" />;
      case "imagen":
      case "image":
        return <FaImage className="text-blue-400" />;
      default:
        return <FaMusic className="text-gray-400" />;
    }
  };

  const getMediaName = () => {
    return currentMedia.nombre || currentMedia.name || "Sin título";
  };

  // ✨ Extraer ID de video de YouTube
  const extractYouTubeId = (url) => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
      /^([a-zA-Z0-9_-]{11})$/, // ID directo
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // ✨ Instancias de Invidious (mirrors públicos)
  const invidiousInstances = [
    "yewtu.be",
    "inv.nadeko.net",
    "invidious.slipfox.xyz",
    "invidious.privacyredirect.com",
  ];

  // ✨ Obtener URL de YouTube o Invidious como fallback
  const getVideoUrl = (useInvidious = false) => {
    if (!currentMedia.url) return "";

    const videoId = extractYouTubeId(currentMedia.url);
    if (!videoId) return currentMedia.url;

    if (useInvidious) {
      // Usar primera instancia de Invidious disponible
      const instance = invidiousInstances[0];
      return `https://${instance}/embed/${videoId}?autoplay=0&quality=dash`;
    }

    // YouTube normal
    const origin = encodeURIComponent(window.location.origin);
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&controls=0&enablejsapi=1&origin=${origin}`;
  };

  const handleTogglePlayPause = () => {
    // Primero actualiza el estado global/proyector
    togglePlayPause();

    // Además controla el preview local de YouTube
    if (canControlYouTube) {
      if (isPlaying) {
        sendYouTubeCommand("pauseVideo");
      } else {
        sendYouTubeCommand("playVideo");
      }
    }
  };

  const handleStop = () => {
    stop();

    // Detener preview local
    if (canControlYouTube) {
      sendYouTubeCommand("stopVideo");
      sendYouTubeCommand("seekTo", [0, true]);
    }

    if (!isYouTube && tipoActual === "video") {
      const el = videoRef?.current;
      if (el) {
        el.pause();
        try {
          el.currentTime = 0;
        } catch {
          // Ignorar si el navegador bloquea por estado
        }
      }
    }
  };

  // Renderizar el iframe de YouTube/Invidious con fallback automático
  const renderYouTubeIframe = () => {
    if (!currentMedia.isYoutube) return null;

    // Usar posición arrastrable si no estamos en multimedia
    const finalPosition = isInMultimediaPage
      ? iframePosition
      : {
          ...iframePosition,
          bottom: `${pipPosition.bottom}px`,
          right: `${pipPosition.right}px`,
        };

    return (
      <div style={finalPosition}>
        <div
          className={`bg-black rounded-lg overflow-hidden shadow-2xl border border-gray-700 w-full h-full relative ${
            !isInMultimediaPage && "cursor-move"
          }`}
          onMouseDown={handleMouseDown}
        >
          {/* ✨ Banner informativo si está usando Invidious */}
          {useInvidious && (
            <div className="absolute top-2 left-2 z-10 bg-blue-500/90 text-white text-xs px-2 py-1 rounded">
              🔄 Usando mirror alternativo
            </div>
          )}

          {/* ✨ Botón de cerrar */}
          {!isInMultimediaPage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStop();
              }}
              className="absolute top-2 right-2 z-20 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all"
              title="Cerrar video"
            >
              <FaTimes size={12} />
            </button>
          )}

          {/* ✨ Botón para cambiar entre YouTube e Invidious */}
          {iframeError && (
            <div className="absolute top-2 left-2 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUseInvidious(!useInvidious);
                  setIframeError(false);
                }}
                className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-3 py-1 rounded shadow-lg"
              >
                Intentar alternativa
              </button>
            </div>
          )}

          <iframe
            key={`video-iframe-${useInvidious ? "invidious" : "youtube"}`}
            id={useInvidious ? undefined : "global-youtube-player"}
            src={getVideoUrl(useInvidious)}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title="YouTube Video"
            onLoad={() => {
              // Asegurar que no quede reproduciendo por estados previos
              if (!useInvidious && !isPlaying) {
                sendYouTubeCommand("pauseVideo");
              }
            }}
            onError={() => {
              console.warn("❌ Error cargando video, intentando fallback...");
              if (!useInvidious) {
                setIframeError(true);
                setTimeout(() => setUseInvidious(true), 2000); // Cambiar automáticamente después de 2s
              }
            }}
          />
        </div>
      </div>
    );
  };

  // Renderizar video local - similar al iframe de YouTube
  const renderLocalVideo = () => {
    if (currentMedia.isYoutube || tipoActual !== "video") return null;

    // Usar posición arrastrable si no estamos en multimedia
    const finalPosition = isInMultimediaPage
      ? iframePosition
      : {
          ...iframePosition,
          bottom: `${pipPosition.bottom}px`,
          right: `${pipPosition.right}px`,
        };

    return (
      <div style={finalPosition}>
        <div
          className={`bg-black rounded-lg overflow-hidden shadow-2xl border border-gray-700 w-full h-full relative ${
            !isInMultimediaPage && "cursor-move"
          }`}
          onMouseDown={handleMouseDown}
        >
          {/* ✨ Botón de cerrar */}
          {!isInMultimediaPage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStop();
              }}
              className="absolute top-2 right-2 z-20 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all"
              title="Cerrar video"
            >
              <FaTimes size={12} />
            </button>
          )}

          <video
            key="video-persistent"
            src={currentMedia.url}
            controls={false}
            ref={videoRef}
            autoPlay={false}
            className="w-full h-full"
            onPlay={() =>
              console.log("🎥 Video local reproduciéndose en flotante")
            }
            onPause={() => console.log("⏸️ Video local pausado en flotante")}
          />
        </div>
      </div>
    );
  };

  if (isMinimized) {
    // Modo minimizado - solo barra pequeña arrastrable
    return (
      <>
        {/* Iframe global de YouTube */}
        {renderYouTubeIframe()}

        {/* Video local flotante */}
        {renderLocalVideo()}

        <div
          className={`fixed z-50 ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{
            bottom: `${pipPosition.bottom}px`,
            right: `${pipPosition.right}px`,
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl p-3 flex items-center gap-3 max-w-xs">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePlayPause();
              }}
              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-all"
            >
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getMediaIcon()}
                <span className="text-white text-sm font-medium truncate">
                  {getMediaName()}
                </span>
              </div>
              {tipoActual === "audio" && (
                <div className="text-xs text-gray-400">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="text-gray-400 hover:text-white transition-colors"
              title="Expandir"
            >
              <FaExpand />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStop();
              }}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Cerrar"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      </>
    );
  }

  // Modo expandido
  return (
    <>
      {/* Iframe global de YouTube */}
      {renderYouTubeIframe()}

      {/* Video local flotante */}
      {renderLocalVideo()}

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 backdrop-blur-md border-t border-gray-700 shadow-2xl">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              {/* Info del media */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="bg-gray-800 p-3 rounded-lg">
                  {getMediaIcon()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-semibold truncate">
                    {getMediaName()}
                  </h3>
                  <p className="text-gray-400 text-sm capitalize">
                    {currentMedia.tipo || currentMedia.type}
                  </p>
                </div>
              </div>

              {/* Controles */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTogglePlayPause}
                  className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full transition-all transform hover:scale-105"
                >
                  {isPlaying ? <FaPause /> : <FaPlay />}
                </button>

                <button
                  onClick={handleStop}
                  className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition-all"
                >
                  <FaStop />
                </button>
              </div>

              {/* Barra de progreso (solo para audio) */}
              {tipoActual === "audio" && (
                <div className="flex-1 max-w-md">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400 w-12 text-right">
                      {formatTime(currentTime)}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={(e) => seek(parseFloat(e.target.value))}
                      className="flex-1 accent-red-500"
                    />
                    <span className="text-xs text-gray-400 w-12">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>
              )}

              {/* Control de volumen */}
              <div className="flex items-center gap-2">
                {volume === 0 ? (
                  <FaVolumeMute className="text-gray-400" />
                ) : (
                  <FaVolumeUp className="text-gray-400" />
                )}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                  className="w-24 accent-red-500"
                />
                <span className="text-xs text-gray-400 w-8">{volume}%</span>
              </div>

              {/* Botones de control */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="text-gray-400 hover:text-white transition-colors p-2"
                  title="Minimizar"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GlobalMediaPlayer;
