import {useEffect, useMemo, useState} from "react";
import {IoInformationCircle, IoRefresh} from "react-icons/io5";
import {FaGooglePlay, FaWifi} from "react-icons/fa";

const getBaseURL = () => "http://localhost:3001";

const AppMovil = () => {
  const [estado, setEstado] = useState({
    status: "idle",
    info: null,
    error: null,
  });

  const cargarInfo = async () => {
    setEstado({status: "loading", info: null, error: null});
    try {
      const res = await fetch(`${getBaseURL()}/api/connection-info`, {
        method: "GET",
        headers: {Accept: "application/json"},
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }
      setEstado({status: "success", info: json, error: null});
    } catch (e) {
      setEstado({
        status: "error",
        info: null,
        error: e?.message || "No se pudo cargar la información de conexión.",
      });
    }
  };

  useEffect(() => {
    cargarInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preferredUrl = useMemo(() => estado.info?.preferredUrl || "", [estado.info]);

  return (
    <div className="bg-slate-950 h-full flex flex-col overflow-hidden text-slate-100">
      {/* Toolbar compacto */}
      <div className="shrink-0 bg-slate-900/98 backdrop-blur border-b border-slate-700/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <IoInformationCircle className="text-sky-400 text-sm shrink-0" />
          <span className="text-sm font-semibold text-white">App Móvil</span>
          <span className="text-xs text-slate-500 hidden sm:inline">Conecta tu celular al proyector</span>

          <div className="ml-auto">
            <button
              onClick={cargarInfo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600/60 rounded-lg text-xs text-slate-300 transition-colors"
              title="Actualizar"
            >
              <IoRefresh className={estado.status === "loading" ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {estado.status === "loading" && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
              <p className="text-slate-500 text-sm">Cargando datos de conexión…</p>
            </div>
          </div>
        )}

        {estado.status === "error" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
            {estado.error}
          </div>
        )}

        {estado.status === "success" && (
          <div className="flex flex-col gap-3 max-w-4xl mx-auto">
            {/* QR + URL */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* QR */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 flex flex-col items-center justify-center gap-3">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Escanear con la app</p>
                <div className="bg-white rounded-xl p-3 shadow-lg">
                  <img
                    src={`${getBaseURL()}/api/qr.png`}
                    alt="QR de conexión"
                    className="w-52 h-52 object-contain"
                  />
                </div>
                <p className="text-xs text-slate-600 text-center">
                  Abre GloryView → Conexión → Escanear QR
                </p>
              </div>

              {/* Info */}
              <div className="flex flex-col gap-2">
                {/* URL recomendada */}
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1.5 font-medium">URL recomendada</p>
                  <p className="font-mono text-sm text-sky-300 bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 break-all">
                    {preferredUrl || "—"}
                  </p>
                  <p className="text-xs text-slate-600 mt-1.5">
                    Dirección del PC en tu red (termina en <span className="font-mono text-slate-500">:3001</span>).
                  </p>
                </div>

                {/* Guía rápida */}
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-300 mb-2">Guía rápida</p>
                  <ol className="space-y-1.5 text-xs text-slate-400 list-decimal list-inside">
                    <li>Abre <span className="text-white font-medium">GloryView</span> en el celular.</li>
                    <li>Ve a <span className="text-white font-medium">Conexión → Escanear QR</span>.</li>
                    <li>Apunta al QR — la app completa la URL automáticamente.</li>
                    <li>Si muestra <span className="text-green-400 font-medium">ONLINE</span>, ya puedes controlar Himnos, Biblia, Multimedia y Fondos.</li>
                  </ol>
                  <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                    <FaWifi className="text-sky-500/60 text-[10px]" />
                    El celular y el PC deben estar en la <span className="text-slate-400 font-medium ml-0.5">misma red Wi‑Fi</span>.
                  </p>
                </div>

                {/* Manual */}
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-300 mb-1">Sin QR</p>
                  <p className="text-xs text-slate-400">
                    En la app, pega manualmente la URL recomendada en <span className="text-white font-medium">Conexión</span>.
                  </p>
                </div>

                {/* Otras URLs */}
                {Array.isArray(estado.info?.urls) && estado.info.urls.length > 1 && (
                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-1.5 font-medium">Otras opciones</p>
                    <div className="flex flex-col gap-1">
                      {estado.info.urls.map((u) => (
                        <p key={u} className="font-mono text-xs text-slate-400 bg-slate-800/60 border border-slate-700/40 rounded-lg px-2 py-1.5 break-all">
                          {u}
                        </p>
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5">Si una URL no funciona, prueba otra.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Solución de problemas */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-300 mb-2">Solución de problemas</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-400 list-disc list-inside">
                <li>PC y celular en la misma Wi‑Fi (no datos móviles).</li>
                <li>Sin VPN activa en el celular ni en el PC.</li>
                <li>En Windows, permite la app en el Firewall (puerto <span className="font-mono text-slate-500">3001</span>).</li>
                <li>Si cambiaste de red, presiona <span className="text-slate-300 font-medium">Actualizar</span> para regenerar el QR.</li>
              </ul>
            </div>

            {/* Play Store */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
              <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg shrink-0">
                <FaGooglePlay className="text-xl text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white">Solo disponible para Android</p>
                <p className="text-xs text-slate-500 truncate">
                  Busca <span className="text-green-400">GloryView</span> en Google Play Store e instálala.
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2 bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2">
                <FaGooglePlay className="text-green-400 text-sm" />
                <div className="leading-tight">
                  <p className="text-slate-500 text-[9px] uppercase tracking-wide">Disponible en</p>
                  <p className="text-white text-xs font-semibold">Google Play</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppMovil;
