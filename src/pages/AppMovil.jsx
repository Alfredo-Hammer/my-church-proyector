import {useEffect, useMemo, useState} from "react";
import {IoInformationCircle, IoRefresh} from "react-icons/io5";

const getBaseURL = () => {
  return "http://localhost:3001";
};

const AppMovil = () => {
  const [estado, setEstado] = useState({
    status: "idle", // idle | loading | success | error
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

  const preferredUrl = useMemo(() => {
    return estado.info?.preferredUrl || "";
  }, [estado.info]);

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 min-h-screen p-6 overflow-y-auto">
      <div className="bg-black/30 backdrop-blur border border-white/10 rounded-2xl p-6 mb-8">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
              <IoInformationCircle className="text-2xl" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold text-white">
                App móvil
              </h1>
              <p className="text-white/60 mt-1">
                Conecta tu celular y controla el proyector
              </p>
            </div>
          </div>

          <button
            onClick={cargarInfo}
            className="px-5 py-2 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 rounded-xl transition-colors flex items-center gap-2"
            title="Actualizar"
          >
            <IoRefresh />
            Actualizar
          </button>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        {estado.status === "loading" && (
          <p className="text-white/60">Cargando datos de conexión…</p>
        )}

        {estado.status === "error" && (
          <p className="text-red-300">{estado.error}</p>
        )}

        {estado.status === "success" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex items-center justify-center">
              <div className="bg-white rounded-2xl p-3 border border-white/10">
                <img
                  src={`${getBaseURL()}/api/qr.png`}
                  alt="QR de conexión"
                  className="w-64 h-64 object-contain"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-black/15 border border-white/10 rounded-xl p-4">
                <p className="text-sm text-white/60">URL recomendada</p>
                <p className="text-white font-mono break-all bg-black/20 border border-white/10 rounded-xl p-3 mt-2">
                  {preferredUrl || "—"}
                </p>
                <p className="text-xs text-white/50 mt-2">
                  Esta es la dirección del PC en tu red (normalmente termina en{" "}
                  <span className="font-mono">:3001</span>).
                </p>
              </div>

              <div className="bg-black/15 border border-white/10 rounded-xl p-4">
                <p className="text-sm font-semibold text-white">
                  Guía rápida (recomendada)
                </p>
                <ol className="list-decimal list-inside text-sm text-white/70 mt-2 space-y-2">
                  <li>
                    En el celular, abre{" "}
                    <span className="font-semibold">GloryView Remote</span>.
                  </li>
                  <li>
                    Ve a <span className="font-semibold">Conexión</span> →{" "}
                    <span className="font-semibold">Escanear QR</span>.
                  </li>
                  <li>
                    Apunta al QR de esta pantalla. La app completará la URL y
                    probará conexión.
                  </li>
                  <li>
                    Si muestra <span className="font-semibold">ONLINE</span>, ya
                    puedes controlar: Himnos, Biblia, Multimedia, Presentaciones
                    y Fondos.
                  </li>
                </ol>
                <p className="text-xs text-white/50 mt-3">
                  Importante: el celular y el PC deben estar en la{" "}
                  <span className="font-semibold">misma red Wi‑Fi</span>.
                </p>
              </div>

              <div className="bg-black/15 border border-white/10 rounded-xl p-4">
                <p className="text-sm font-semibold text-white">
                  Si no puedes escanear el QR
                </p>
                <p className="text-sm text-white/70 mt-2">
                  En la app móvil, puedes pegar manualmente la URL en{" "}
                  <span className="font-semibold">Conexión</span>.
                </p>
                <p className="text-xs text-white/50 mt-2">
                  Consejo: pega la “URL recomendada” exactamente como aparece
                  arriba.
                </p>
              </div>

              {Array.isArray(estado.info?.urls) &&
                estado.info.urls.length > 1 && (
                  <div>
                    <p className="text-sm text-white/60">Otras opciones</p>
                    <div className="space-y-2 mt-2">
                      {estado.info.urls.map((u) => (
                        <p
                          key={u}
                          className="text-white/80 font-mono break-all bg-black/10 border border-white/10 rounded-xl p-2"
                        >
                          {u}
                        </p>
                      ))}
                    </div>
                    <p className="text-xs text-white/50 mt-2">
                      Si una URL no funciona, prueba otra (por ejemplo, si
                      tienes más de una interfaz de red).
                    </p>
                  </div>
                )}

              <div className="bg-black/15 border border-white/10 rounded-xl p-4">
                <p className="text-sm font-semibold text-white">
                  Solución de problemas
                </p>
                <ul className="list-disc list-inside text-sm text-white/70 mt-2 space-y-2">
                  <li>
                    Verifica que el PC y el celular estén en la misma Wi‑Fi (no
                    datos móviles).
                  </li>
                  <li>
                    Asegúrate de que no haya una VPN activa en el celular/PC.
                  </li>
                  <li>
                    En Windows, permite a la app en el Firewall (puerto{" "}
                    <span className="font-mono">3001</span>).
                  </li>
                  <li>
                    Si cambiaste de red, vuelve a abrir esta pantalla para
                    regenerar el QR/URL.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppMovil;
