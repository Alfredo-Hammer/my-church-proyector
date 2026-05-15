import React, {useState, useEffect} from "react";
import {motion, AnimatePresence} from "framer-motion";
import {
  FaDownload,
  FaSync,
  FaCheckCircle,
  FaTimes,
  FaExclamationTriangle,
} from "react-icons/fa";

const UpdateNotification = () => {
  const [updateState, setUpdateState] = useState("idle"); // idle, checking, available, downloading, downloaded, error
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [currentVersion, setCurrentVersion] = useState("");

  useEffect(() => {
    // Obtener la versión actual
    if (window.electron?.getAppVersion) {
      window.electron.getAppVersion().then((version) => {
        setCurrentVersion(version);
      });
    }

    // Escuchar eventos de actualización
    const handleCheckingUpdate = () => {
      setUpdateState("checking");
      setError(null);
    };

    const handleUpdateAvailable = (info) => {
      setUpdateState("available");
      setUpdateInfo(info);
    };

    const handleUpdateNotAvailable = () => {
      setUpdateState("not-available");
      // Auto-cerrar después de 3 segundos
      setTimeout(() => setUpdateState("idle"), 3000);
    };

    const handleUpdateError = (err) => {
      setUpdateState("error");
      setError(err.message || "Error desconocido al verificar actualizaciones");
    };

    const handleDownloadProgress = (progress) => {
      setUpdateState("downloading");
      setDownloadProgress(Math.round(progress.percent));
    };

    const handleUpdateDownloaded = (info) => {
      setUpdateState("downloaded");
      setUpdateInfo(info);
    };

    const handleCheckManual = () => {
      handleCheckUpdate();
    };

    // Registrar listeners
    if (window.electron?.on) {
      window.electron.on("update-checking", handleCheckingUpdate);
      window.electron.on("update-available", handleUpdateAvailable);
      window.electron.on("update-not-available", handleUpdateNotAvailable);
      window.electron.on("update-error", handleUpdateError);
      window.electron.on("update-download-progress", handleDownloadProgress);
      window.electron.on("update-downloaded", handleUpdateDownloaded);
      window.electron.on("check-updates-manual", handleCheckManual);
    }

    // Cleanup
    return () => {
      if (window.electron?.removeListener) {
        window.electron.removeListener("update-checking", handleCheckingUpdate);
        window.electron.removeListener(
          "update-available",
          handleUpdateAvailable,
        );
        window.electron.removeListener(
          "update-not-available",
          handleUpdateNotAvailable,
        );
        window.electron.removeListener("update-error", handleUpdateError);
        window.electron.removeListener(
          "update-download-progress",
          handleDownloadProgress,
        );
        window.electron.removeListener(
          "update-downloaded",
          handleUpdateDownloaded,
        );
        window.electron.removeListener(
          "check-updates-manual",
          handleCheckManual,
        );
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
        setError("Las actualizaciones están deshabilitadas en modo desarrollo");
      }
    }
  };

  const handleDownload = async () => {
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

  // No mostrar nada en estado idle
  if (updateState === "idle") {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{opacity: 0, scale: 0.9, y: 20}}
          animate={{opacity: 1, scale: 1, y: 0}}
          exit={{opacity: 0, scale: 0.9, y: 20}}
          className="bg-slate-900/95 backdrop-blur border border-slate-700/50 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4"
        >
          {/* Botón cerrar */}
          {(updateState === "not-available" || updateState === "error") && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <FaTimes />
            </button>
          )}

          {/* Verificando actualización */}
          {updateState === "checking" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-4">
                <FaSync className="text-3xl text-blue-400 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Verificando Actualizaciones
              </h3>
              <p className="text-slate-400 text-sm">
                Buscando nuevas versiones...
              </p>
            </div>
          )}

          {/* Actualización disponible */}
          {updateState === "available" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                <FaDownload className="text-3xl text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Nueva Actualización Disponible
              </h3>
              <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase">
                    Versión Actual:
                  </span>
                  <span className="text-sm font-bold text-slate-300">
                    {currentVersion}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-emerald-400 uppercase">
                    Nueva Versión:
                  </span>
                  <span className="text-sm font-bold text-emerald-400">
                    {updateInfo?.version}
                  </span>
                </div>
              </div>
              {updateInfo?.releaseNotes && (
                <div className="bg-slate-800/50 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto text-left">
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">
                    Novedades:
                  </p>
                  <div className="text-sm text-slate-300 whitespace-pre-wrap">
                    {updateInfo.releaseNotes}
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Ahora No
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FaDownload />
                  Descargar
                </button>
              </div>
            </div>
          )}

          {/* Descargando */}
          {updateState === "downloading" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-4">
                <FaDownload className="text-3xl text-blue-400 animate-bounce" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Descargando Actualización
              </h3>
              <div className="mb-4">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>Progreso</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full transition-all duration-300"
                    style={{width: `${downloadProgress}%`}}
                  />
                </div>
              </div>
              <p className="text-slate-400 text-sm">
                La aplicación se actualizará automáticamente una vez completada
                la descarga.
              </p>
            </div>
          )}

          {/* Descarga completada */}
          {updateState === "downloaded" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                <FaCheckCircle className="text-3xl text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Actualización Lista
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                La actualización se ha descargado correctamente. La aplicación
                se reiniciará para instalarla.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Más Tarde
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FaSync />
                  Instalar Ahora
                </button>
              </div>
            </div>
          )}

          {/* No hay actualizaciones */}
          {updateState === "not-available" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                <FaCheckCircle className="text-3xl text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Estás Actualizado
              </h3>
              <p className="text-slate-400 text-sm">
                Ya tienes la última versión de GloryView ({currentVersion})
              </p>
            </div>
          )}

          {/* Error */}
          {updateState === "error" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
                <FaExclamationTriangle className="text-3xl text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Error</h3>
              <p className="text-slate-400 text-sm mb-4">
                {error || "No se pudo verificar las actualizaciones"}
              </p>
              <button
                onClick={handleClose}
                className="w-full px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UpdateNotification;
