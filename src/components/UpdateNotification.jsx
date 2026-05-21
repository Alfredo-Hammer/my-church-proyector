import React, {useState, useEffect} from "react";
import {motion, AnimatePresence} from "framer-motion";
import {
  FaDownload,
  FaSync,
  FaCheckCircle,
  FaTimes,
  FaExclamationTriangle,
  FaRocket,
  FaWifi,
} from "react-icons/fa";

const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Intl.DateTimeFormat("es", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return null;
  }
};

const formatSpeed = (bps) => {
  if (!bps || bps <= 0) return "";
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
};

const stripHtml = (html) => {
  if (!html || typeof html !== "string") return null;
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/?(ul|ol|h[1-6]|p|div|section|blockquote)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
};

const UpdateNotification = () => {
  const [updateState, setUpdateState] = useState("idle");
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [error, setError] = useState(null);
  const [currentVersion, setCurrentVersion] = useState("");

  useEffect(() => {
    if (window.electron?.getAppVersion) {
      window.electron.getAppVersion().then(setCurrentVersion);
    }

    // ipcRenderer.on pasa (event, data) — el primer arg es el evento IPC, el segundo son los datos
    const handleCheckingUpdate = (_e) => {
      setUpdateState("checking");
      setError(null);
    };

    const handleUpdateAvailable = (_e, info) => {
      setUpdateState("available");
      setUpdateInfo(info);
    };

    const handleUpdateNotAvailable = (_e) => {
      setUpdateState("not-available");
      setTimeout(() => setUpdateState("idle"), 3000);
    };

    const handleUpdateError = (_e, err) => {
      setUpdateState("error");
      setError(err?.message || "No se pudo conectar con el servidor de actualizaciones.");
    };

    const handleDownloadProgress = (_e, progress) => {
      setUpdateState("downloading");
      setDownloadProgress(Math.round(progress.percent));
      setDownloadSpeed(progress.bytesPerSecond);
      setDownloadedBytes(progress.transferred);
      setTotalBytes(progress.total);
    };

    const handleUpdateDownloaded = (_e, info) => {
      setUpdateState("downloaded");
      setUpdateInfo((prev) => ({...prev, ...info}));
    };

    const handleCheckManual = (_e) => handleCheckUpdate();

    if (window.electron?.on) {
      window.electron.on("update-checking", handleCheckingUpdate);
      window.electron.on("update-available", handleUpdateAvailable);
      window.electron.on("update-not-available", handleUpdateNotAvailable);
      window.electron.on("update-error", handleUpdateError);
      window.electron.on("update-download-progress", handleDownloadProgress);
      window.electron.on("update-downloaded", handleUpdateDownloaded);
      window.electron.on("check-updates-manual", handleCheckManual);
    }

    return () => {
      if (window.electron?.removeListener) {
        window.electron.removeListener("update-checking", handleCheckingUpdate);
        window.electron.removeListener("update-available", handleUpdateAvailable);
        window.electron.removeListener("update-not-available", handleUpdateNotAvailable);
        window.electron.removeListener("update-error", handleUpdateError);
        window.electron.removeListener("update-download-progress", handleDownloadProgress);
        window.electron.removeListener("update-downloaded", handleUpdateDownloaded);
        window.electron.removeListener("check-updates-manual", handleCheckManual);
      }
    };
  }, []);

  const handleCheckUpdate = async () => {
    setUpdateState("checking");
    setError(null);
    if (window.electron?.checkForUpdates) {
      const result = await window.electron.checkForUpdates();
      if (result?.error) {
        setUpdateState("error");
        setError(result.error);
      } else if (result?.isDev) {
        setUpdateState("error");
        setError("Las actualizaciones están deshabilitadas en modo desarrollo.");
      }
    }
  };

  const handleDownload = async () => {
    setDownloadProgress(0);
    setDownloadSpeed(0);
    if (window.electron?.downloadUpdate) {
      await window.electron.downloadUpdate();
    }
  };

  const handleInstall = async () => {
    if (window.electron?.installUpdate) {
      await window.electron.installUpdate();
    }
  };

  const handleClose = () => {
    setUpdateState("idle");
    setError(null);
  };

  if (updateState === "idle") return null;

  const releaseDate = formatDate(updateInfo?.releaseDate);
  const fileSize = formatBytes(updateInfo?.fileSize);
  const releaseNotes = stripHtml(
    typeof updateInfo?.releaseNotes === "string" ? updateInfo.releaseNotes : null
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <motion.div
          initial={{opacity: 0, scale: 0.92, y: 24}}
          animate={{opacity: 1, scale: 1, y: 0}}
          exit={{opacity: 0, scale: 0.92, y: 24}}
          transition={{type: "spring", stiffness: 300, damping: 28}}
          className="relative bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Franja de color superior */}
          <div
            className={`h-1 w-full ${
              updateState === "error"
                ? "bg-red-500"
                : updateState === "downloaded"
                ? "bg-emerald-500"
                : updateState === "downloading"
                ? "bg-blue-500"
                : "bg-emerald-500"
            }`}
          />

          <div className="p-6">
            {/* Botón cerrar */}
            {(updateState === "not-available" ||
              updateState === "error" ||
              updateState === "available") && (
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800"
              >
                <FaTimes size={14} />
              </button>
            )}

            {/* === VERIFICANDO === */}
            {updateState === "checking" && (
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-500/15 mb-4">
                  <FaSync className="text-2xl text-blue-400 animate-spin" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Verificando actualizaciones
                </h3>
                <p className="text-slate-400 text-sm">
                  Buscando nuevas versiones en el servidor...
                </p>
              </div>
            )}

            {/* === ACTUALIZACIÓN DISPONIBLE === */}
            {updateState === "available" && (
              <div>
                <div className="flex items-start gap-4 mb-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <FaRocket className="text-xl text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      Nueva versión disponible
                    </h3>
                    <p className="text-slate-400 text-sm mt-0.5">
                      Hay una actualización lista para instalar
                    </p>
                  </div>
                </div>

                {/* Versiones */}
                <div className="bg-slate-800/70 rounded-xl p-4 mb-4 flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
                      Versión actual
                    </p>
                    <p className="text-base font-bold text-slate-300">
                      v{currentVersion}
                    </p>
                  </div>
                  <div className="text-slate-600 text-lg">→</div>
                  <div className="text-center">
                    <p className="text-xs text-emerald-400 uppercase font-semibold mb-1">
                      Nueva versión
                    </p>
                    <p className="text-base font-bold text-emerald-400">
                      v{updateInfo?.version}
                    </p>
                  </div>
                </div>

                {/* Metadatos */}
                {(releaseDate || fileSize) && (
                  <div className="flex gap-3 mb-4">
                    {releaseDate && (
                      <div className="flex-1 bg-slate-800/50 rounded-lg px-3 py-2 text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-semibold mb-0.5">
                          Fecha
                        </p>
                        <p className="text-xs text-slate-300">{releaseDate}</p>
                      </div>
                    )}
                    {fileSize && (
                      <div className="flex-1 bg-slate-800/50 rounded-lg px-3 py-2 text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-semibold mb-0.5">
                          Tamaño
                        </p>
                        <p className="text-xs text-slate-300">{fileSize}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notas de versión */}
                {releaseNotes && (
                  <div className="bg-slate-800/50 rounded-xl p-3 mb-4 max-h-28 overflow-y-auto">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2">
                      Novedades
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {releaseNotes}
                    </p>
                  </div>
                )}

                {/* Botones */}
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 bg-slate-700/70 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors text-sm"
                  >
                    Ahora no
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <FaDownload size={12} />
                    Descargar
                  </button>
                </div>
              </div>
            )}

            {/* === DESCARGANDO === */}
            {updateState === "downloading" && (
              <div>
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
                    <FaDownload className="text-xl text-blue-400 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Descargando v{updateInfo?.version}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      La app se actualizará al terminar
                    </p>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>
                      {formatBytes(downloadedBytes)} /{" "}
                      {formatBytes(totalBytes) ?? "..."}
                    </span>
                    <span className="font-semibold text-blue-400">
                      {downloadProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                      animate={{width: `${downloadProgress}%`}}
                      transition={{duration: 0.3}}
                    />
                  </div>
                </div>

                {downloadSpeed > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <FaWifi size={10} />
                    <span>{formatSpeed(downloadSpeed)}</span>
                  </div>
                )}
              </div>
            )}

            {/* === DESCARGA COMPLETA === */}
            {updateState === "downloaded" && (
              <div>
                <div className="flex items-start gap-4 mb-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <FaCheckCircle className="text-xl text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Actualización lista
                    </h3>
                    <p className="text-slate-400 text-sm">
                      v{updateInfo?.version} descargada correctamente
                    </p>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-3 mb-5">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    La aplicación se cerrará e instalará la actualización
                    automáticamente. Asegúrate de guardar tu trabajo.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 bg-slate-700/70 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors text-sm"
                  >
                    Más tarde
                  </button>
                  <button
                    onClick={handleInstall}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <FaSync size={12} />
                    Instalar ahora
                  </button>
                </div>
              </div>
            )}

            {/* === YA ACTUALIZADO === */}
            {updateState === "not-available" && (
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15 mb-4">
                  <FaCheckCircle className="text-2xl text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Todo al día
                </h3>
                <p className="text-slate-400 text-sm">
                  Tienes la última versión instalada (v{currentVersion})
                </p>
              </div>
            )}

            {/* === ERROR === */}
            {updateState === "error" && (
              <div>
                <div className="flex items-start gap-4 mb-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center">
                    <FaExclamationTriangle className="text-xl text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Error al actualizar
                    </h3>
                    <p className="text-slate-400 text-sm">
                      No se pudo completar la operación
                    </p>
                  </div>
                </div>

                <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-3 mb-5">
                  <p className="text-xs text-red-300 leading-relaxed">
                    {error || "Error desconocido. Verifica tu conexión a internet e intenta de nuevo."}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 bg-slate-700/70 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors text-sm"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={handleCheckUpdate}
                    className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <FaSync size={12} />
                    Reintentar
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UpdateNotification;
