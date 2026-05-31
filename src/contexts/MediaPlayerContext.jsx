import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";

const MediaPlayerContext = createContext();

const LAST_PLAYED_STORAGE_KEY = "gloryview:lastPlayedMedia:v1";
const DEFAULT_VOLUME = 50;

export const useMediaPlayer = () => {
  const context = useContext(MediaPlayerContext);
  if (!context) {
    throw new Error("useMediaPlayer debe usarse dentro de MediaPlayerProvider");
  }
  return context;
};

export const MediaPlayerProvider = ({children}) => {
  const [currentMedia, setCurrentMedia] = useState(null);
  const [lastPlayedMedia, setLastPlayedMedia] = useState(() => {
    try {
      const raw = localStorage.getItem(LAST_PLAYED_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        localStorage.removeItem(LAST_PLAYED_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      try {
        localStorage.removeItem(LAST_PLAYED_STORAGE_KEY);
      } catch {}
      return null;
    }
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const audioRef = useRef(null);
  const videoRef = useRef(null);

  const lastPcStatusSentAtRef = useRef(0);
  const currentMediaRef = useRef(null);

  const broadcastRef = useRef(null);

  const sendBroadcastControl = (payload) => {
    try {
      if (typeof BroadcastChannel === "undefined") return;
      if (!broadcastRef.current) {
        broadcastRef.current = new BroadcastChannel(
          "gloryview-proyector-control",
        );
      }
      broadcastRef.current.postMessage(payload);
    } catch {
      // noop
    }
  };

  // Crear elementos de audio/video persistentes
  useEffect(() => {
    // Crear elemento de audio global
    const audio = new Audio();
    audio.volume = DEFAULT_VOLUME / 100;
    audioRef.current = audio;

    const emitPcStatus = () => {
      try {
        if (!window.electron?.send) return;
        const now = Date.now();
        if (now - (lastPcStatusSentAtRef.current || 0) < 250) return;
        lastPcStatusSentAtRef.current = now;

        const cm = currentMediaRef.current;
        window.electron.send("multimedia-playback-status", {
          destino: "pc",
          id: cm?.id ?? null,
          nombre: cm?.nombre ?? null,
          currentTime: Number.isFinite(Number(audio.currentTime))
            ? audio.currentTime
            : 0,
          duration: Number.isFinite(Number(audio.duration))
            ? audio.duration
            : 0,
          paused: Boolean(audio.paused),
          volume: Number.isFinite(Number(audio.volume)) ? audio.volume : null,
          tipo: "audio",
        });
      } catch {
        // noop
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      emitPcStatus();
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      emitPcStatus();
    };
    const handleEnded = () => {
      setIsPlaying(false);
      emitPcStatus();
    };
    const handlePlay = () => {
      setIsPlaying(true);
      emitPcStatus();
    };
    const handlePause = () => {
      setIsPlaying(false);
      emitPcStatus();
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Actualizar volumen
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
    }
  }, [volume]);

  const sendProjectorControl = (payload) => {
    try {
      try {
        window.electron?.debugLog?.(
          "MediaPlayer sendProjectorControl",
          payload,
        );
      } catch {
        // noop
      }

      // Vía principal: IPC (Electron). BroadcastChannel solo como fallback.
      // Enviar por ambos a la vez duplica eventos en el proyector (ACK repetidos).
      let sentViaIpc = false;
      if (window.electron?.proyectorControlMultimedia) {
        window.electron.proyectorControlMultimedia(payload);
        sentViaIpc = true;
      } else if (window.electron?.send) {
        window.electron.send("proyector-control-multimedia", payload);
        sentViaIpc = true;
      }

      if (!sentViaIpc) {
        sendBroadcastControl(payload);
      }
    } catch (error) {
      console.warn(
        "⚠️ [MediaPlayer] No se pudo enviar control al proyector:",
        error,
      );
      try {
        window.electron?.debugLog?.("MediaPlayer sendProjectorControl ERROR", {
          payload,
          error: String(error?.message || error),
        });
      } catch {
        // noop
      }
      // Último fallback
      sendBroadcastControl(payload);
    }
  };

  const playMedia = (media) => {
    // Detener reproducción actual
    if (audioRef.current) {
      audioRef.current.pause();
    }

    currentMediaRef.current = media;
    setCurrentMedia(media);
    setIsPlaying(true); // ✅ Establecer isPlaying inmediatamente para todos los tipos

    // Guardar como "última reproducción" para que la UI no quede vacía
    try {
      setLastPlayedMedia(media);
      localStorage.setItem(LAST_PLAYED_STORAGE_KEY, JSON.stringify(media));
    } catch {
      // noop
    }

    const mediaType = String(media.tipo || media.type || "").toLowerCase();
    const soloAudio = Boolean(media?.soloAudio);
    const isYoutubeMedia = Boolean(media?.isYoutube) || mediaType === "youtube";
    const isImageMedia = mediaType === "imagen" || mediaType === "image";

    // En modo solo-audio usamos el elemento <audio> para cualquier tipo (audio o video),
    // excepto YouTube e imágenes que no tienen archivo local.
    const usarAudioRef =
      mediaType === "audio" || (soloAudio && !isYoutubeMedia && !isImageMedia);
    if (usarAudioRef) {
      const url = media.validatedUrl || media.url;
      audioRef.current.src = url;
      audioRef.current.play().catch((err) => {
        console.error("❌ Error reproduciendo audio:", err);
        setIsPlaying(false);
      });
    }
    if (!soloAudio) {
      sendProjectorControl({action: "play"});
    }
  };

  const pause = () => {
    const mediaType = String(
      currentMedia?.tipo || currentMedia?.type || "",
    ).toLowerCase();
    const soloAudio = Boolean(currentMedia?.soloAudio);
    const usarAudioRef = mediaType === "audio" || soloAudio;
    if (audioRef.current && usarAudioRef) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    if (!soloAudio) {
      sendProjectorControl({action: "pause"});
    }
  };

  const resume = () => {
    const mediaType = String(
      currentMedia?.tipo || currentMedia?.type || "",
    ).toLowerCase();
    const soloAudio = Boolean(currentMedia?.soloAudio);
    const usarAudioRef = mediaType === "audio" || soloAudio;
    if (audioRef.current && usarAudioRef) {
      audioRef.current.play().catch((err) => {
        console.error("❌ Error resumiendo audio:", err);
      });
    }
    setIsPlaying(true);
    if (!soloAudio) {
      sendProjectorControl({action: "play"});
    }
  };

  const stop = () => {
    // ⚠️ IMPORTANTE: Pausar ANTES de limpiar currentMedia
    // Primero poner isPlaying en false para que los useEffect lo detecten
    setIsPlaying(false);

    // Dar tiempo para que los useEffect procesen isPlaying=false
    setTimeout(() => {
      // Guardar el media actual en lastPlayedMedia antes de limpiarlo
      if (currentMedia) {
        setLastPlayedMedia(currentMedia);
      }

      // Detener audio
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      } catch (error) {
        // Silenciar error
      }

      // Detener video local
      try {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      } catch (error) {
        // Silenciar error
      }

      // Resetear estados de reproducción
      setCurrentTime(0);
      setCurrentMedia(null); // Esto oculta los controles del header

      // Enviar comando de stop al proyector
      sendProjectorControl({action: "stop"});
    }, 50); // Esperar 50ms para que React procese isPlaying=false
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const seek = (time) => {
    const mediaType = String(
      currentMedia?.tipo || currentMedia?.type || "",
    ).toLowerCase();
    const soloAudio = Boolean(currentMedia?.soloAudio);
    const usarAudioRef = mediaType === "audio" || soloAudio;
    if (audioRef.current && usarAudioRef) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
    if (typeof time === "number" && !Number.isNaN(time) && !soloAudio) {
      sendProjectorControl({action: "seek", time});
    }
  };

  const setVolume = (newVolume) => {
    setVolumeState(newVolume);

    if (typeof newVolume === "number" && !Number.isNaN(newVolume)) {
      const normalized = Math.max(0, Math.min(1, newVolume / 100));
      if (!currentMedia?.soloAudio) {
        sendProjectorControl({action: "volume", volume: normalized});
      }
    }
  };

  const toggleLoop = () => {
    setIsLooping((prev) => !prev);
  };

  const limpiarLocal = () => {
    currentMediaRef.current = null;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = "";
      }
    } catch {
      // noop
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCurrentMedia(null);
  };

  // ====================================
  // IPC: Solo audio desde control móvil
  // ====================================
  useEffect(() => {
    if (!window.electron?.on) return;

    const handleSoloAudioPlay = (event, payload) => {
      try {
        const tipo = String(payload?.tipo || payload?.type || "").trim();
        const url = String(payload?.url || "").trim();
        const nombre = String(payload?.nombre || payload?.name || "Multimedia");
        const id = payload?.id ?? null;
        if (!tipo || !url) return;

        const isYoutube =
          tipo === "youtube" ||
          url.includes("youtube.com") ||
          url.includes("youtu.be") ||
          url.includes("youtube.com/embed");

        playMedia({
          id,
          tipo,
          url,
          nombre,
          isYoutube,
          soloAudio: true,
        });
        // En modo solo audio, no estorbar con la UI.
        setIsMinimized(true);
      } catch (e) {
        console.warn("⚠️ [MediaPlayer] Error solo-audio-play:", e);
      }
    };

    const handleSoloAudioControl = (event, payload) => {
      try {
        const action = String(payload?.action || "").trim();
        if (!action) return;
        if (action === "play") resume();
        else if (action === "pause") pause();
        else if (action === "stop") stop();
        else if (action === "limpiar") limpiarLocal();
        else if (action === "seek") {
          const t = Number(payload?.time);
          if (Number.isFinite(t) && t >= 0 && audioRef.current) {
            audioRef.current.currentTime = t;
            setCurrentTime(t);
          }
        } else if (action === "volume") {
          const v = Number(payload?.volume);
          if (Number.isFinite(v)) {
            setVolume(Math.round(Math.max(0, Math.min(1, v)) * 100));
          }
        }
      } catch (e) {
        console.warn("⚠️ [MediaPlayer] Error solo-audio-control:", e);
      }
    };

    window.electron.on("solo-audio-play", handleSoloAudioPlay);
    window.electron.on("solo-audio-control", handleSoloAudioControl);

    return () => {
      try {
        window.electron.removeListener("solo-audio-play", handleSoloAudioPlay);
        window.electron.removeListener(
          "solo-audio-control",
          handleSoloAudioControl,
        );
      } catch {
        // noop
      }
    };
  }, []);

  const value = {
    currentMedia,
    lastPlayedMedia,
    isPlaying,
    setIsPlaying, // Exportar para sincronización con YouTube
    isLooping,
    toggleLoop,
    volume,
    currentTime,
    duration,
    isMinimized,
    setIsMinimized,
    playMedia,
    pause,
    resume,
    stop,
    togglePlayPause,
    setVolume,
    seek,
    audioRef,
    videoRef,
  };

  return (
    <MediaPlayerContext.Provider value={value}>
      {children}
    </MediaPlayerContext.Provider>
  );
};
