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
  FaMusic,
  FaVideo,
  FaImage,
  FaYoutube,
} from "react-icons/fa";

const GlobalMediaPlayer = () => {
  const location = useLocation();
  const isInMultimediaPage = location.pathname === "/multimedia";
  const [iframePosition, setIframePosition] = useState({});
  const [useInvidious, setUseInvidious] = useState(false); // ✨ Estado para fallback
  const [iframeError, setIframeError] = useState(false); // ✨ Detectar errores de carga

  const {
    currentMedia,
    lastPlayedMedia,
    isPlaying,
    setIsPlaying, // Para sincronizar con YouTube
    isLooping,
    volume,
    currentTime,
    duration,
    togglePlayPause,
    stop,
    setVolume,
    seek,
    videoRef,
  } = useMediaPlayer();

  // Usar currentMedia si existe, sino usar lastPlayedMedia para mantener visible el último contenido
  const mediaToShow = currentMedia || lastPlayedMedia;

  const tipoActual = mediaToShow?.tipo || mediaToShow?.type;
  const isYouTube = Boolean(mediaToShow?.isYoutube);
  const canControlYouTube = isYouTube && !useInvidious && currentMedia; // Solo controlar si hay currentMedia activo

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

  // Mantener YouTube sincronizado con volumen/mute
  useEffect(() => {
    if (!currentMedia) return;
    if (!canControlYouTube) return;

    const vol = Math.max(0, Math.min(100, Number(volume)));
    if (!Number.isFinite(vol)) return;

    sendYouTubeCommand("setVolume", [vol]);
    if (vol === 0) {
      sendYouTubeCommand("mute");
    } else {
      sendYouTubeCommand("unMute");
    }
  }, [volume, currentMedia?.url, canControlYouTube]);

  // Calcular posición del iframe/video
  useEffect(() => {
    if (!mediaToShow) return;
    if (!mediaToShow.isYoutube && tipoActual !== "video") return;

    const updatePosition = () => {
      if (isInMultimediaPage) {
        // En Multimedia, posicionar sobre el contenedor de preview
        const container = document.getElementById(
          "multimedia-preview-container",
        );
        if (container) {
          const rect = container.getBoundingClientRect();
          setIframePosition({
            position: "fixed",
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            borderRadius: "0.75rem",
            zIndex: 10,
          });
        }
      } else {
        // Fuera de Multimedia, ocultar completamente
        setIframePosition({
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isInMultimediaPage, mediaToShow, tipoActual]);

  // ✨ Resetear estados cuando cambia el video
  useEffect(() => {
    setUseInvidious(false);
    setIframeError(false);
  }, [mediaToShow?.url]);

  // ✨ Escuchar eventos de YouTube para sincronizar isPlaying
  useEffect(() => {
    if (!mediaToShow?.isYoutube) return;
    if (useInvidious) return; // Invidious no soporta la API

    const handleYouTubeMessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // ✨ Evento onStateChange es el más directo de YouTube
        if (
          data.event === "onStateChange" &&
          typeof data.info !== "undefined"
        ) {
          const playerState = data.info;

          // Estados de YouTube: -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued
          if (playerState === 1) {
            // Usuario hizo play en el iframe de YouTube
            if (!isPlaying && currentMedia) {
              console.log(
                "📺 [YouTube Event] Usuario presionó play en iframe, activando controles",
              );
              setIsPlaying(true);
            }
          } else if (playerState === 2) {
            // Usuario pausó en el iframe de YouTube
            if (isPlaying) {
              console.log("📺 [YouTube Event] Usuario pausó en iframe");
              setIsPlaying(false);
            }
          } else if (playerState === 0) {
            // Video terminó
            console.log("📺 [YouTube Event] Video terminó");
            setIsPlaying(false);
          }
        }

        // ✨ También escuchar infoDelivery como fallback
        if (
          data.event === "infoDelivery" &&
          data.info &&
          typeof data.info.playerState !== "undefined"
        ) {
          const playerState = data.info.playerState;

          // Estados de YouTube: -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued
          if (playerState === 1) {
            // Usuario hizo play en el iframe de YouTube
            if (!isPlaying && currentMedia) {
              // Solo actualizar si hay currentMedia
              setIsPlaying(true);
            }
          } else if (playerState === 2) {
            // Usuario pausó en el iframe de YouTube
            if (isPlaying) {
              setIsPlaying(false);
            }
          }
        }
      } catch (e) {
        // No es un mensaje de YouTube, ignorar
      }
    };

    window.addEventListener("message", handleYouTubeMessage);
    return () => window.removeEventListener("message", handleYouTubeMessage);
  }, [
    mediaToShow?.isYoutube,
    useInvidious,
    isPlaying,
    currentMedia,
    setIsPlaying,
  ]);

  // No mostrar si no hay media
  if (!mediaToShow) return null;

  // No mostrar para imágenes (solo audio y video)
  const tipo = mediaToShow.tipo || mediaToShow.type;
  if (tipo === "imagen") return null;

  // Funciones helper
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getMediaIcon = () => {
    const tipo = mediaToShow.tipo || mediaToShow.type;
    switch (tipo) {
      case "audio":
        return <FaMusic className="text-green-400" size={18} />;
      case "youtube":
        return <FaYoutube className="text-red-400" size={18} />;
      case "video":
        return <FaVideo className="text-purple-400" size={18} />;
      case "imagen":
      case "image":
        return <FaImage className="text-blue-400" size={18} />;
      default:
        return <FaMusic className="text-gray-400" size={18} />;
    }
  };

  const getMediaName = () => {
    return mediaToShow?.nombre || mediaToShow?.name || "Sin título";
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
    if (!mediaToShow.url) return "";

    const videoId = extractYouTubeId(mediaToShow.url);
    if (!videoId) return mediaToShow.url;

    if (useInvidious) {
      // Usar primera instancia de Invidious disponible
      const instance = invidiousInstances[0];
      return `https://${instance}/embed/${videoId}?autoplay=0&quality=dash`;
    }

    // YouTube normal
    const origin = encodeURIComponent(window.location.origin);
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&controls=1&enablejsapi=1&origin=${origin}`;
  };

  // Renderizar el iframe de YouTube/Invidious con fallback automático
  const renderYouTubeIframe = () => {
    if (!mediaToShow.isYoutube) return null;

    // Renderizar siempre, posicionado según iframePosition
    return (
      <div style={iframePosition}>
        {/* ✨ Banner informativo si está usando Invidious */}
        {useInvidious && (
          <div className="absolute top-2 left-2 z-10 bg-blue-500/90 text-white text-xs px-2 py-1 rounded">
            🔄 Usando mirror alternativo
          </div>
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
          className="w-full h-full rounded-xl"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="YouTube Video"
          onLoad={() => {
            // Asegurar que no quede reproduciendo por estados previos
            if (!useInvidious) {
              const iframe = document.getElementById("global-youtube-player");
              if (iframe && iframe.contentWindow) {
                // ✨ PASO 1: Le decimos a YouTube que queremos escuchar eventos
                iframe.contentWindow.postMessage(
                  JSON.stringify({
                    event: "listening",
                    id: "global-youtube-player",
                    channel: "widget",
                  }),
                  "*",
                );

                // ✨ PASO 2: Nos suscribimos específicamente a cambios de estado
                setTimeout(() => {
                  iframe.contentWindow.postMessage(
                    JSON.stringify({
                      event: "command",
                      func: "addEventListener",
                      args: ["onStateChange"],
                    }),
                    "*",
                  );

                  console.log("📺 [YouTube Init] Listener de eventos activado");
                }, 100);
              }

              // Aplicar estado inicial
              if (isPlaying) {
                sendYouTubeCommand("playVideo");
              } else {
                sendYouTubeCommand("pauseVideo");
              }

              const vol = Math.max(0, Math.min(100, Number(volume)));
              if (Number.isFinite(vol)) {
                sendYouTubeCommand("setVolume", [vol]);
                if (vol === 0) {
                  sendYouTubeCommand("mute");
                } else {
                  sendYouTubeCommand("unMute");
                }
              }
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
    );
  };

  // Renderizar video local - similar al iframe de YouTube
  const renderLocalVideo = () => {
    if (mediaToShow.isYoutube || tipoActual !== "video") return null;

    // Renderizar siempre, posicionado según iframePosition
    return (
      <div style={iframePosition}>
        <video
          key="video-persistent"
          src={mediaToShow.url}
          controls={false}
          ref={videoRef}
          autoPlay={false}
          className="w-full h-full rounded-xl bg-black"
        />
      </div>
    );
  };

  // Renderizar solo los iframes/videos (los controles están en el Header)
  return (
    <>
      {/* Iframe global de YouTube */}
      {renderYouTubeIframe()}

      {/* Video local */}
      {renderLocalVideo()}
    </>
  );
};

export default GlobalMediaPlayer;
