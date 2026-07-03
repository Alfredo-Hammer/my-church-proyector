import {useEffect, useRef, useState} from "react";
import {useLocation} from "react-router-dom";
import {useMediaPlayer} from "../contexts/MediaPlayerContext";

const getBaseURL = () => "http://localhost:3001";

const PLACEHOLDER_ID = "multimedia-preview-portal-target";

const HIDDEN_STYLE = {
  position: "fixed",
  left: "-9999px",
  top: 0,
  width: "1px",
  height: "1px",
  overflow: "hidden",
};

const extractVideoId = (url) => {
  const regex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = String(url || "").match(regex);
  return match ? match[1] : null;
};

const getMediaType = (media) => {
  if (!media) return "unknown";
  if (media.isYoutube) return "youtube";
  const url = String(media.url || "").toLowerCase();
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  return media.tipo || media.type || "unknown";
};

const fetchProjectorPlaybackStatus = async () => {
  try {
    const resp = await fetch(
      `${getBaseURL()}/api/control/multimedia/status?destino=proyector`,
    );
    const data = await resp.json();
    return data?.status || null;
  } catch {
    return null;
  }
};

const getDesktopYouTubeEmbedUrl = (rawUrl, muted) => {
  const videoId = extractVideoId(rawUrl);
  if (!videoId) return rawUrl;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const skipOrigin =
    !origin ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("https://localhost") ||
    origin.startsWith("file://");
  const baseParams = `autoplay=0&rel=0&controls=0&enablejsapi=1&modestbranding=1&playsinline=1&mute=${
    muted ? 1 : 0
  }`;
  return skipOrigin
    ? `https://www.youtube.com/embed/${videoId}?${baseParams}`
    : `https://www.youtube.com/embed/${videoId}?${baseParams}&origin=${encodeURIComponent(origin)}`;
};

// Vista previa de video/YouTube que vive en la raíz de la app (nunca se
// desmonta al navegar). En vez de "moverse" entre contenedores (lo que
// obligaría a React a desmontar/remontar el <video>/iframe y perder la
// posición de reproducción), este componente SIEMPRE es el mismo nodo del DOM
// y solo cambia su posición vía CSS: se superpone al recuadro de la página
// Multimedia cuando está montada, o se esconde fuera de pantalla en cualquier
// otra página (sin dejar de reproducir).
//
// Se silencia SOLO si este contenido es exactamente el que está proyectado
// (para no duplicar audio con el proyector); si el usuario le dio play sin
// proyectar, suena normal en el escritorio.
const PersistentMediaPreview = () => {
  const location = useLocation();
  const {
    currentMedia,
    isPlaying,
    setIsPlaying,
    proyectingMedia,
    videoRef,
  } = useMediaPlayer();

  const [style, setStyle] = useState(HIDDEN_STYLE);
  const youtubeIframeRef = useRef(null);
  const youtubeLocalInfoRef = useRef({currentTime: 0, updatedAt: 0});

  const tipo = getMediaType(currentMedia);
  const isYoutube = tipo === "youtube";
  const isVideo = tipo === "video";
  const estaProyectandoActual = Boolean(
    proyectingMedia && currentMedia && proyectingMedia.url === currentMedia.url,
  );

  const sendDesktopYouTubeCommand = (func, args = []) => {
    try {
      const win = youtubeIframeRef.current?.contentWindow;
      if (!win) return;
      win.postMessage(JSON.stringify({event: "command", func, args}), "*");
    } catch {
      // noop
    }
  };

  // Seguir la posición/tamaño del recuadro de la página Multimedia (si está
  // montada) para superponer la vista previa ahí encima; si no, esconderla.
  useEffect(() => {
    const enMultimedia = location.pathname === "/multimedia";
    if (!enMultimedia) {
      setStyle(HIDDEN_STYLE);
      return;
    }

    const update = () => {
      const target = document.getElementById(PLACEHOLDER_ID);
      if (!target) {
        setStyle(HIDDEN_STYLE);
        return;
      }
      const rect = target.getBoundingClientRect();
      setStyle({
        position: "fixed",
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        zIndex: 10,
        pointerEvents: "none",
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    // El recuadro puede aparecer/moverse por cambios de layout que no
    // disparan resize/scroll (p.ej. la lista de la izquierda cambia de alto).
    const interval = setInterval(update, 400);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      clearInterval(interval);
    };
  }, [location.pathname, tipo]);

  // Mantener el <video> local sincronizado con isPlaying
  useEffect(() => {
    if (!currentMedia || tipo !== "video") return;
    const el = videoRef?.current;
    if (!el) return;
    if (isPlaying) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentMedia, tipo, videoRef]);

  // Mantener el iframe de YouTube local sincronizado con isPlaying
  useEffect(() => {
    if (!currentMedia || !isYoutube) return;
    if (isPlaying) {
      sendDesktopYouTubeCommand("playVideo");
    } else {
      sendDesktopYouTubeCommand("pauseVideo");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentMedia, isYoutube]);

  // Mutear/desmutear el iframe local de YouTube cuando cambia si este
  // contenido está proyectado o no (p.ej. sonaba en el escritorio y recién
  // ahí el operador le da "Proyectar").
  useEffect(() => {
    if (!currentMedia || !isYoutube) return;
    sendDesktopYouTubeCommand(estaProyectandoActual ? "mute" : "unMute");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estaProyectandoActual, currentMedia, isYoutube]);

  // Escuchar el estado del iframe local de YouTube para reflejar play/pause
  // que el operador haga directamente sobre la vista previa.
  useEffect(() => {
    if (!currentMedia || !isYoutube) return;

    const handleMessage = (event) => {
      try {
        if (event.source !== youtubeIframeRef.current?.contentWindow) return;
        const data = JSON.parse(event.data);

        if (
          data.event === "infoDelivery" &&
          data.info &&
          typeof data.info.currentTime !== "undefined"
        ) {
          youtubeLocalInfoRef.current = {
            currentTime: Number(data.info.currentTime) || 0,
            updatedAt: Date.now(),
          };
          return;
        }

        if (data.event !== "onStateChange" || typeof data.info === "undefined")
          return;
        const state = data.info;
        if (state === 1 && !isPlaying) setIsPlaying(true);
        else if (state === 2 && isPlaying) setIsPlaying(false);
        else if (state === 0) setIsPlaying(false);
      } catch {
        // no es un mensaje de YouTube
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMedia, isYoutube, isPlaying, setIsPlaying]);

  // Corregir el drift entre la vista previa del escritorio y el proyector
  // (cada uno carga el archivo/YouTube por su cuenta). Solo aplica cuando
  // esto es justo lo que está proyectado — si no, el estado del proyector
  // pertenece a otro contenido y sincronizar contra eso reiniciaría el video.
  useEffect(() => {
    if (!currentMedia || !isPlaying || !estaProyectandoActual) return;
    if (tipo !== "video" && tipo !== "youtube") return;

    const resync = async () => {
      const status = await fetchProjectorPlaybackStatus();
      const remoteTime = Number(status?.currentTime);
      if (!Number.isFinite(remoteTime)) return;

      if (tipo === "video") {
        const el = videoRef?.current;
        if (!el) return;
        if (Math.abs(el.currentTime - remoteTime) > 1.5) {
          try {
            el.currentTime = remoteTime;
          } catch {
            // noop
          }
        }
      } else {
        const localInfo = youtubeLocalInfoRef.current;
        const esReciente = Date.now() - (localInfo.updatedAt || 0) < 3000;
        if (esReciente && Math.abs(localInfo.currentTime - remoteTime) > 2) {
          sendDesktopYouTubeCommand("seekTo", [remoteTime, true]);
        }
      }
    };

    const interval = setInterval(resync, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMedia, isPlaying, estaProyectandoActual, tipo, videoRef]);

  const mediaName = currentMedia?.nombre || currentMedia?.name || "";

  if (!currentMedia || (!isYoutube && !isVideo)) {
    return <div style={HIDDEN_STYLE} />;
  }

  return (
    <div style={style}>
      {isYoutube && (
        <iframe
          key={`persistent-youtube-${currentMedia.url}`}
          ref={youtubeIframeRef}
          src={getDesktopYouTubeEmbedUrl(currentMedia.url, estaProyectandoActual)}
          title={mediaName}
          className="w-full h-full border-0 pointer-events-none"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          onLoad={() => {
            try {
              const win = youtubeIframeRef.current?.contentWindow;
              win?.postMessage(
                JSON.stringify({
                  event: "listening",
                  id: "persistent-youtube-player",
                  channel: "widget",
                }),
                "*",
              );
              setTimeout(() => {
                win?.postMessage(
                  JSON.stringify({
                    event: "command",
                    func: "addEventListener",
                    args: ["onStateChange"],
                  }),
                  "*",
                );
              }, 100);
            } catch {
              // noop
            }
            setTimeout(async () => {
              if (estaProyectandoActual) {
                const status = await fetchProjectorPlaybackStatus();
                const t = Number(status?.currentTime);
                if (Number.isFinite(t) && t > 0.5) {
                  sendDesktopYouTubeCommand("seekTo", [t, true]);
                }
              }
              if (isPlaying) sendDesktopYouTubeCommand("playVideo");
            }, 250);
          }}
        />
      )}

      {isVideo && (
        <video
          key={`persistent-video-${currentMedia.url}`}
          ref={videoRef}
          src={currentMedia.validatedUrl || currentMedia.url}
          controls={false}
          muted={estaProyectandoActual}
          playsInline
          className="w-full h-full object-contain bg-black"
          aria-label={
            estaProyectandoActual
              ? "Vista previa de video (silenciada, el audio suena en el proyector)"
              : "Vista previa de video"
          }
          onLoadedMetadata={async (e) => {
            if (!estaProyectandoActual) return;
            const status = await fetchProjectorPlaybackStatus();
            const t = Number(status?.currentTime);
            if (Number.isFinite(t) && t > 0.5) {
              try {
                e.currentTarget.currentTime = t;
              } catch {
                // noop
              }
            }
          }}
          onError={(e) => {
            console.error("❌ [PersistentMediaPreview] Error cargando video:", e);
          }}
        />
      )}
    </div>
  );
};

export default PersistentMediaPreview;
