import React from "react";
import {useEffect, useState} from "react";
import {motion, AnimatePresence} from "framer-motion";

// Función para obtener la URL base del servidor multimedia
const getBaseURL = () => {
  return "http://localhost:3001";
};

// ✨ COMPONENTE MULTIMEDIA MEJORADO CON MEJOR MANEJO DE ERRORES
const ModernMultimediaRenderer = ({multimediaActiva}) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fileValidated, setFileValidated] = useState(false);

  // ✨ FUNCIÓN PARA VALIDAR SI UN ARCHIVO EXISTE
  const validateFileExists = async (url) => {
    try {
      console.log("🔍 [ModernMultimediaRenderer] Validando archivo:", url);
      const response = await fetch(url, {method: "HEAD"});
      const exists = response.ok;
      console.log("🔍 [ModernMultimediaRenderer] Archivo existe:", exists);
      console.log("🔍 [ModernMultimediaRenderer] Status:", response.status);
      return exists;
    } catch (error) {
      console.error(
        "❌ [ModernMultimediaRenderer] Error validando archivo:",
        error
      );
      return false;
    }
  };

  useEffect(() => {
    console.log("🎬 [ModernMultimediaRenderer] useEffect ejecutado");
    console.log(
      "🎬 [ModernMultimediaRenderer] multimediaActiva:",
      multimediaActiva
    );

    if (multimediaActiva) {
      setError(null);
      setLoading(true);
      setFileValidated(false);

      // 🔍 DIAGNÓSTICO CRÍTICO: ¿QUÉ DATOS ESTAMOS RECIBIENDO EN EL RENDERER?
      console.log("🔍 [ModernMultimediaRenderer] === DIAGNÓSTICO COMPLETO ===");
      console.log(
        "🔍 [ModernMultimediaRenderer] Tipo de objeto:",
        typeof multimediaActiva
      );
      console.log(
        "🔍 [ModernMultimediaRenderer] ¿Es null/undefined?:",
        multimediaActiva === null || multimediaActiva === undefined
      );
      if (multimediaActiva) {
        console.log(
          "🔍 [ModernMultimediaRenderer] Propiedades disponibles:",
          Object.keys(multimediaActiva)
        );
        console.log(
          "🔍 [ModernMultimediaRenderer] Valores de propiedades:",
          Object.entries(multimediaActiva)
        );
      }
      console.log("🔍 [ModernMultimediaRenderer] === FIN DIAGNÓSTICO ===");

      console.log(
        "🎬 [ModernMultimediaRenderer] ==========================================="
      );
      console.log(
        "🎬 [ModernMultimediaRenderer] Recibido multimedia:",
        multimediaActiva
      );
      console.log("🎬 [ModernMultimediaRenderer] Tipo:", multimediaActiva.tipo);
      console.log("🎬 [ModernMultimediaRenderer] URL:", multimediaActiva.url);
      console.log(
        "🎬 [ModernMultimediaRenderer] Nombre:",
        multimediaActiva.nombre
      );

      // ✨ LOGS ADICIONALES PARA DEBUGGING
      console.log(
        "🎬 [ModernMultimediaRenderer] Todas las propiedades del objeto:"
      );
      Object.keys(multimediaActiva).forEach((key) => {
        console.log(`  - ${key}:`, multimediaActiva[key]);
      });
      console.log(
        "🎬 [ModernMultimediaRenderer] Tipo de dato del tipo:",
        typeof multimediaActiva.tipo
      );
      console.log(
        "🎬 [ModernMultimediaRenderer] Longitud del tipo:",
        multimediaActiva.tipo?.length
      );
      console.log(
        "🎬 [ModernMultimediaRenderer] Código de caracteres del tipo:",
        multimediaActiva.tipo?.split("").map((c) => c.charCodeAt(0))
      );

      console.log(
        "🎬 [ModernMultimediaRenderer] ==========================================="
      );

      // ✨ VALIDAR ARCHIVOS LOCALES ANTES DE RENDERIZAR
      const validateLocalFile = async () => {
        const {tipo, url, isYoutube} = multimediaActiva;

        console.log("🔍 [ModernMultimediaRenderer] Iniciando validación...");
        console.log("🔍 [ModernMultimediaRenderer] Tipo:", tipo);
        console.log("🔍 [ModernMultimediaRenderer] URL:", url);
        console.log("🔍 [ModernMultimediaRenderer] isYoutube:", isYoutube);

        // Si es YouTube, no necesita validación de archivo local
        if (
          isYoutube ||
          (url && (url.includes("youtube.com") || url.includes("youtu.be")))
        ) {
          console.log(
            "🔍 [ModernMultimediaRenderer] YouTube detectado, saltando validación de archivo"
          );
          setFileValidated(true);
          return;
        }

        // Para archivos locales, validar que existan
        if (tipo === "video" || tipo === "audio" || tipo === "imagen") {
          if (url && url.startsWith(`${getBaseURL()}/multimedia/`)) {
            console.log(
              "🔍 [ModernMultimediaRenderer] Validando archivo local:",
              url
            );
            const fileExists = await validateFileExists(url);
            console.log(
              "🔍 [ModernMultimediaRenderer] Resultado validación:",
              fileExists
            );
            if (!fileExists) {
              console.log(
                "❌ [ModernMultimediaRenderer] Archivo no encontrado, estableciendo error"
              );
              setError(`❌ Archivo no encontrado: ${url.split("/").pop()}`);
              setLoading(false);
              setFileValidated(false); // Importante: no validado si hay error
              return;
            }
          }
        }

        console.log(
          "✅ [ModernMultimediaRenderer] Validación completada exitosamente"
        );
        setFileValidated(true);
      };

      validateLocalFile();
    } else {
      console.log(
        "🎬 [ModernMultimediaRenderer] multimedia es null, limpiando estado"
      );
      setError(null);
      setLoading(false);
    }
  }, [multimediaActiva]);

  if (!multimediaActiva) return null;

  const {tipo, url, nombre, originalUrl, isYoutube} = multimediaActiva;

  // ✨ DETECTAR YOUTUBE POR MÚLTIPLES MÉTODOS
  const isYouTubeUrl = (urlToCheck) => {
    if (!urlToCheck) return false;
    return (
      urlToCheck.includes("youtube.com") ||
      urlToCheck.includes("youtu.be") ||
      urlToCheck.includes("youtube.com/embed")
    );
  };

  // ✨ FUNCIÓN PARA CONVERTIR URL DE YOUTUBE A FORMATO EMBED
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    let videoId = null;

    if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1].split("?")[0]; // Remover parámetros adicionales
    } else if (url.includes("watch?v=")) {
      videoId = url.split("watch?v=")[1].split("&")[0]; // Remover parámetros adicionales
    } else if (url.includes("youtube.com/embed/")) {
      return url; // ya es embed
    }

    return videoId
      ? `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&rel=0&modestbranding=1&fs=1`
      : url;
  };

  // Determinar el tipo real considerando YouTube
  let tipoReal = tipo;
  let urlReal = url;

  // Si tiene isYoutube marcado como true, es YouTube
  if (isYoutube) {
    tipoReal = "youtube";
    const urlOriginal = url || originalUrl;
    urlReal = getYouTubeEmbedUrl(urlOriginal);
  }
  // Si la URL original es de YouTube pero el tipo es "video", corregir
  else if (
    tipo === "video" &&
    (isYouTubeUrl(url) || isYouTubeUrl(originalUrl))
  ) {
    tipoReal = "youtube";
    const urlOriginal = url || originalUrl;
    urlReal = getYouTubeEmbedUrl(urlOriginal);
  }

  console.log("🔧 [ModernMultimediaRenderer] Corrección de tipo:");
  console.log("🔧 [ModernMultimediaRenderer] Tipo original:", tipo);
  console.log("🔧 [ModernMultimediaRenderer] Tipo corregido:", tipoReal);
  console.log("🔧 [ModernMultimediaRenderer] URL original:", url);
  console.log("🔧 [ModernMultimediaRenderer] originalUrl:", originalUrl);
  console.log("🔧 [ModernMultimediaRenderer] URL corregida a embed:", urlReal);
  console.log("🔧 [ModernMultimediaRenderer] isYoutube flag:", isYoutube);

  const commonContainerProps = {
    initial: {opacity: 0, scale: 0.9},
    animate: {opacity: 1, scale: 1},
    exit: {opacity: 0, scale: 0.9},
    transition: {duration: 0.6, ease: "easeOut"},
  };

  const renderMediaInfo = () => (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      transition={{delay: 0.5, duration: 0.6}}
      className="absolute bottom-8 left-8 right-8 z-30"
    >
      <div className="backdrop-blur-xl bg-black/40 rounded-2xl px-8 py-4 border border-white/20 shadow-2xl">
        <div className="flex items-center space-x-4">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          <p className="text-2xl font-semibold text-white">{nombre}</p>
          <div className="ml-auto text-sm text-gray-300 capitalize">
            {tipoReal}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const handleMediaError = (errorType, errorEvent) => {
    console.error(`❌ [Proyector] Error ${errorType}:`, errorEvent);
    setError(`Error cargando ${errorType}`);
    setLoading(false);
  };

  const handleMediaLoad = (mediaType) => {
    console.log(`✅ [Proyector] ${mediaType} cargado correctamente`);
    setLoading(false);
    setError(null);
  };

  // Error state
  if (error) {
    console.log("❌ [ModernMultimediaRenderer] Mostrando error:", error);
    console.log("❌ [ModernMultimediaRenderer] fileValidated:", fileValidated);
    console.log(
      "❌ [ModernMultimediaRenderer] urlReal definida:",
      typeof urlReal !== "undefined"
    );
    console.log("❌ [ModernMultimediaRenderer] urlReal valor:", urlReal);
    return (
      <motion.div
        {...commonContainerProps}
        className="absolute inset-0 flex items-center justify-center z-20"
      >
        <div className="backdrop-blur-xl bg-red-900/60 text-white p-12 rounded-2xl text-center border border-red-500/30 max-w-2xl">
          <div className="text-8xl mb-6">❌</div>
          <p className="text-2xl font-semibold mb-2">
            Error al cargar multimedia
          </p>
          <p className="text-lg text-red-200 mb-4">{nombre}</p>
          <div className="bg-red-800/50 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-300 mb-2">Detalles del error:</p>
            <p className="text-sm text-red-100 font-mono">{error}</p>
            <p className="text-xs text-red-400 mt-2">
              URL: {typeof urlReal !== "undefined" ? urlReal : url}
            </p>
          </div>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                setFileValidated(false);
              }}
              className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg transition-colors"
            >
              🔄 Reintentar
            </button>
            <button
              onClick={() => {
                // Limpiar estado completamente
                setError(null);
                setLoading(false);
                setFileValidated(false);
              }}
              className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg transition-colors"
            >
              ❌ Cerrar
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  console.log(
    "🔍 [ModernMultimediaRenderer] =================== SWITCH DEBUG ==================="
  );
  console.log(
    "🔍 [ModernMultimediaRenderer] Tipo recibido para switch:",
    `"${tipoReal}"`
  );
  console.log(
    "🔍 [ModernMultimediaRenderer] Comparando con 'youtube':",
    tipoReal === "youtube"
  );
  console.log(
    "🔍 [ModernMultimediaRenderer] Comparando con 'video':",
    tipoReal === "video"
  );
  console.log(
    "🔍 [ModernMultimediaRenderer] Comparando con 'audio':",
    tipoReal === "audio"
  );
  console.log(
    "🔍 [ModernMultimediaRenderer] Comparando con 'imagen':",
    tipoReal === "imagen"
  );
  console.log(
    "🔍 [ModernMultimediaRenderer] Comparando con 'image':",
    tipoReal === "image"
  );
  console.log("🔍 [ModernMultimediaRenderer] URL disponible:", !!urlReal);
  console.log("🔍 [ModernMultimediaRenderer] URL valor:", urlReal);
  console.log(
    "🔍 [ModernMultimediaRenderer] =================== SWITCH DEBUG ==================="
  );

  if (!tipoReal || !urlReal) {
    console.log("❌ [ModernMultimediaRenderer] Faltan tipo o URL");
    console.log("❌ [ModernMultimediaRenderer] tipo:", tipoReal);
    console.log("❌ [ModernMultimediaRenderer] url:", urlReal);
    return null;
  }

  // ✨ ESPERAR A QUE LA VALIDACIÓN DE ARCHIVO ESTÉ COMPLETA
  if (!fileValidated) {
    console.log(
      "⏳ [ModernMultimediaRenderer] Esperando validación de archivo..."
    );
    console.log("⏳ [ModernMultimediaRenderer] fileValidated:", fileValidated);
    console.log("⏳ [ModernMultimediaRenderer] error:", error);
    console.log("⏳ [ModernMultimediaRenderer] loading:", loading);
    return (
      <motion.div
        {...commonContainerProps}
        className="absolute inset-0 flex items-center justify-center z-20"
      >
        <div className="backdrop-blur-xl bg-blue-900/60 text-white p-12 rounded-2xl text-center border border-blue-500/30">
          <div className="text-8xl mb-6">🔍</div>
          <p className="text-2xl font-semibold mb-2">Validando archivo...</p>
          <p className="text-lg text-blue-200">{nombre}</p>
          <div className="animate-spin w-8 h-8 border-4 border-blue-300 border-t-transparent rounded-full mx-auto mt-4"></div>
        </div>
      </motion.div>
    );
  }

  console.log(
    "✅ [ModernMultimediaRenderer] Validación completada, continuando con renderizado"
  );
  console.log("✅ [ModernMultimediaRenderer] fileValidated:", fileValidated);
  console.log("✅ [ModernMultimediaRenderer] error:", error);

  switch (tipoReal) {
    case "youtube":
      console.log("🎯 [ModernMultimediaRenderer] ENTRANDO EN CASE YOUTUBE");
      console.log("🎯 [ModernMultimediaRenderer] URL de YouTube:", urlReal);
      return (
        <motion.div
          {...commonContainerProps}
          className="absolute inset-0 flex items-center justify-center z-20"
        >
          <div className="relative w-full h-full">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="text-white text-2xl">Cargando YouTube...</div>
              </div>
            )}
            <iframe
              src={urlReal}
              title={nombre}
              className="w-full h-full border-0"
              style={{filter: "drop-shadow(0 0 20px rgba(0,0,0,0.5))"}}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => {
                console.log(
                  "📺 [ModernMultimediaRenderer] YouTube iframe onLoad disparado"
                );
                handleMediaLoad("YouTube");
                setLoading(false);
              }}
              onError={(e) => {
                console.error(
                  "❌ [ModernMultimediaRenderer] Error en iframe YouTube:",
                  e
                );
                handleMediaError("youtube", e);
              }}
            />
            {!loading && nombre && renderMediaInfo()}
          </div>
        </motion.div>
      );

    case "video":
      return (
        <motion.div
          {...commonContainerProps}
          className="absolute inset-0 flex items-center justify-center z-20"
        >
          <div className="relative w-full h-full">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="text-white text-2xl">Cargando video...</div>
              </div>
            )}
            <video
              key={`video-${urlReal}-${Date.now()}`}
              src={urlReal}
              controls={false}
              autoPlay
              muted={false}
              playsInline
              preload="metadata"
              className="multimedia-video w-full h-full object-contain"
              style={{filter: "drop-shadow(0 0 20px rgba(0,0,0,0.5))"}}
              onError={(e) => {
                console.error("❌ [Proyector] Error en video:", e);
                console.error("❌ [Proyector] URL que falló:", urlReal);
                handleMediaError("video", e);
              }}
              onLoadStart={() =>
                console.log("🎥 [Proyector] Iniciando carga de video:", urlReal)
              }
              onCanPlay={() => {
                console.log(
                  "🎥 [Proyector] Video listo para reproducir:",
                  urlReal
                );
                handleMediaLoad("Video");
                // ✨ FORZAR REPRODUCCIÓN AUTOMÁTICA
                const video = document.querySelector(".multimedia-video");
                if (video) {
                  video.play().catch((error) => {
                    console.log(
                      "🎥 [Proyector] Autoplay bloqueado, intentando sin audio:",
                      error
                    );
                    video.muted = true;
                    video.play();
                  });
                }
              }}
              onLoadedData={() => {
                console.log(
                  "🎥 [Proyector] Datos del video cargados:",
                  urlReal
                );
                setLoading(false);
              }}
              onLoadedMetadata={() => {
                console.log(
                  "🎥 [Proyector] Metadatos del video cargados:",
                  urlReal
                );
              }}
              onVolumeChange={(e) => {
                console.log(
                  "🔊 [Proyector] Volumen:",
                  e.target.volume,
                  "Muted:",
                  e.target.muted
                );
              }}
            />
            {!loading && nombre && renderMediaInfo()}
          </div>
        </motion.div>
      );

    case "audio":
      return (
        <motion.div
          {...commonContainerProps}
          className="absolute inset-0 flex flex-col items-center justify-center z-20 text-center"
        >
          <div className="backdrop-blur-xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-3xl p-16 max-w-3xl border border-white/20 shadow-2xl">
            {/* Audio visualization */}
            <motion.div
              className="text-9xl mb-8"
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              🎵
            </motion.div>

            <motion.h1
              className="text-5xl font-bold text-white mb-8"
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              transition={{delay: 0.3}}
            >
              {nombre || "Reproduciendo Audio"}
            </motion.h1>

            {loading && (
              <div className="mb-6 text-xl text-white">Cargando audio...</div>
            )}

            <audio
              src={urlReal}
              controls={false}
              autoPlay
              className="w-full max-w-lg bg-white/10 rounded-lg p-2"
              onError={(e) => handleMediaError("audio", e)}
              onLoadStart={() =>
                console.log("🎵 [Proyector] Iniciando carga de audio")
              }
              onCanPlay={() => {
                console.log("🎵 [Proyector] Audio listo para reproducir");
                handleMediaLoad("Audio");
                // ✨ FORZAR REPRODUCCIÓN AUTOMÁTICA DE AUDIO
                const audio = document.querySelector("audio");
                if (audio) {
                  audio.play().catch((error) => {
                    console.log(
                      "🎵 [Proyector] Error en autoplay de audio:",
                      error
                    );
                  });
                }
              }}
              onLoadedData={() => setLoading(false)}
            />

            {/* Audio waves animation */}
            {!loading && (
              <div className="flex justify-center mt-8 space-x-2">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-2 bg-cyan-400 rounded-full"
                    animate={{
                      height: [10, 30, 10],
                    }}
                    transition={{
                      duration: 1,
                      delay: i * 0.1,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      );

    case "imagen":
    case "image":
      return (
        <motion.div
          {...commonContainerProps}
          className="absolute inset-0 flex items-center justify-center z-20"
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <div className="text-white text-2xl">Cargando imagen...</div>
            </div>
          )}
          <motion.img
            src={urlReal}
            alt={nombre || "Imagen"}
            className="w-full h-full object-cover"
            style={{filter: "drop-shadow(0 0 30px rgba(0,0,0,0.5))"}}
            initial={{scale: 0.8, opacity: 0}}
            animate={{scale: 1, opacity: 1}}
            transition={{delay: 0.2, duration: 0.8}}
            onError={(e) => handleMediaError("imagen", e)}
            onLoad={() => handleMediaLoad("Imagen")}
          />
          {!loading && nombre && renderMediaInfo()}
        </motion.div>
      );

    default:
      console.log("❌ [ModernMultimediaRenderer] LLEGÓ AL DEFAULT CASE");
      console.log(
        "❌ [ModernMultimediaRenderer] Tipo no reconocido:",
        `"${tipoReal}"`
      );
      console.log("❌ [ModernMultimediaRenderer] URL:", urlReal);
      console.log("❌ [ModernMultimediaRenderer] Nombre:", nombre);
      return (
        <motion.div
          {...commonContainerProps}
          className="absolute inset-0 flex items-center justify-center z-20"
        >
          <div className="backdrop-blur-xl bg-red-900/60 text-white p-12 rounded-2xl text-center border border-red-500/30">
            <div className="text-8xl mb-6">❌</div>
            <p className="text-2xl font-semibold mb-2">
              Tipo de archivo no soportado
            </p>
            <p className="text-lg text-red-200">{tipoReal}</p>
            <p className="text-sm text-red-300 mt-4">Archivo: {nombre}</p>
          </div>
        </motion.div>
      );
  }
};

export default ModernMultimediaRenderer;
