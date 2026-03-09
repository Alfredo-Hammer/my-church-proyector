import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";

const MediaPlayerContext = createContext();

export const useMediaPlayer = () => {
  const context = useContext(MediaPlayerContext);
  if (!context) {
    throw new Error("useMediaPlayer debe usarse dentro de MediaPlayerProvider");
  }
  return context;
};

export const MediaPlayerProvider = ({children}) => {
  const [currentMedia, setCurrentMedia] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(50);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const audioRef = useRef(null);
  const videoRef = useRef(null);

  // Crear elementos de audio/video persistentes
  useEffect(() => {
    // Crear elemento de audio global
    const audio = new Audio();
    audio.volume = volume / 100;
    audioRef.current = audio;

    // Event listeners
    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
    });

    audio.addEventListener("play", () => {
      setIsPlaying(true);
    });

    audio.addEventListener("pause", () => {
      setIsPlaying(false);
    });

    return () => {
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
      if (window.electron?.send) {
        window.electron.send("proyector-control-multimedia", payload);
      }
    } catch (error) {
      console.warn(
        "⚠️ [MediaPlayer] No se pudo enviar control al proyector:",
        error,
      );
    }
  };

  const playMedia = (media) => {
    console.log("🎵 [MediaPlayer] Reproduciendo:", media);

    // Detener reproducción actual
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setCurrentMedia(media);

    const mediaType = media.tipo || media.type;

    // Para audio
    if (mediaType === "audio") {
      const url = media.validatedUrl || media.url;
      audioRef.current.src = url;
      audioRef.current.play().catch((err) => {
        console.error("❌ Error reproduciendo audio:", err);
      });
      sendProjectorControl({action: "play"});
    }
    // Para video, YouTube e imágenes, se renderizarán en el componente
    else {
      setIsPlaying(true);
      sendProjectorControl({action: "play"});
    }
  };

  const pause = () => {
    if (audioRef.current && currentMedia?.tipo === "audio") {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    sendProjectorControl({action: "pause"});
  };

  const resume = () => {
    if (audioRef.current && currentMedia?.tipo === "audio") {
      audioRef.current.play().catch((err) => {
        console.error("❌ Error resumiendo audio:", err);
      });
    }
    setIsPlaying(true);
    sendProjectorControl({action: "play"});
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    sendProjectorControl({action: "stop"});
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const seek = (time) => {
    if (audioRef.current && currentMedia?.tipo === "audio") {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }

    // También intentar sincronizar el proyector (video/audio/youtube)
    if (typeof time === "number" && !Number.isNaN(time)) {
      sendProjectorControl({action: "seek", time});
    }
  };

  const setVolume = (newVolume) => {
    setVolumeState(newVolume);

    if (typeof newVolume === "number" && !Number.isNaN(newVolume)) {
      const normalized = Math.max(0, Math.min(1, newVolume / 100));
      sendProjectorControl({action: "volume", volume: normalized});
    }
  };

  const value = {
    currentMedia,
    isPlaying,
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
