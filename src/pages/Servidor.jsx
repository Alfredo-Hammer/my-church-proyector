import {useEffect, useMemo, useState} from "react";
import {
  FaServer, FaCopy, FaCheck, FaWifi, FaVideo,
  FaCircle, FaCode, FaDesktop,
} from "react-icons/fa";
import {IoRefresh} from "react-icons/io5";

const getBaseURL = () => "http://localhost:3001";

function CopyBtn({texto, size = "sm"}) {
  const [ok, setOk] = useState(false);
  const copiar = () => {
    navigator.clipboard?.writeText(texto).then(() => {
      setOk(true);
      setTimeout(() => setOk(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={copiar}
      title="Copiar"
      className={`shrink-0 flex items-center justify-center rounded-lg border transition-colors
        ${size === "xs" ? "p-1.5" : "p-2"}
        ${ok
          ? "bg-green-500/15 border-green-500/30 text-green-400"
          : "bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10"}`}
    >
      {ok ? <FaCheck className="text-xs" /> : <FaCopy className="text-xs" />}
    </button>
  );
}

function UrlRow({label, url, mono = true, accent = "text-sky-300"}) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-white/[0.05] last:border-0">
      <span className="text-[11px] text-slate-500 w-24 shrink-0">{label}</span>
      <span className={`flex-1 font-mono text-xs break-all ${mono ? accent : "text-slate-300"}`}>{url}</span>
      <CopyBtn texto={url} size="xs" />
    </div>
  );
}

function EndpointRow({method, path, desc}) {
  const color = method === "GET" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300";
  return (
    <div className="flex items-start gap-2 py-2 border-b border-white/[0.05] last:border-0">
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 mt-0.5 ${color}`}>{method}</span>
      <span className="font-mono text-xs text-slate-300 shrink-0 w-40 truncate">{path}</span>
      <span className="text-[11px] text-slate-500">{desc}</span>
    </div>
  );
}

export default function Servidor() {
  const [estado, setEstado] = useState({status: "idle", info: null, error: null});
  const [copiado, setCopiado] = useState({});

  const cargar = async () => {
    setEstado({status: "loading", info: null, error: null});
    try {
      const res = await fetch(`${getBaseURL()}/api/connection-info`, {headers: {Accept: "application/json"}});
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setEstado({status: "success", info: json, error: null});
    } catch (e) {
      setEstado({status: "error", info: null, error: e?.message || "No se pudo conectar al servidor."});
    }
  };

  useEffect(() => {cargar();}, []);

  const preferredUrl = useMemo(() => estado.info?.preferredUrl || "", [estado.info]);
  const obsUrl = preferredUrl ? `${preferredUrl}/obs` : "";
  const apiBase = preferredUrl || `http://[IP]:3001`;

  const copiar = (key, texto) => {
    navigator.clipboard?.writeText(texto).then(() => {
      setCopiado(c => ({...c, [key]: true}));
      setTimeout(() => setCopiado(c => ({...c, [key]: false})), 2000);
    });
  };

  const online = estado.status === "success";

  return (
    <div className="bg-[#080c14] h-full flex flex-col overflow-hidden text-slate-100">
      {/* Toolbar */}
      <div className="shrink-0 bg-slate-900/98 backdrop-blur border-b border-slate-700/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <FaServer className="text-teal-400 text-sm shrink-0" />
          <span className="text-sm font-semibold text-white">Servidor</span>
          <span className="text-xs text-slate-500 hidden sm:inline">Integración OBS y acceso remoto</span>
          <div className="ml-auto flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border
              ${online
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : estado.status === "loading"
                  ? "bg-slate-800 border-slate-700 text-slate-500"
                  : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
              <FaCircle className="text-[7px]" />
              {online ? "Servidor activo" : estado.status === "loading" ? "Conectando…" : "Sin conexión"}
            </div>
            <button
              type="button"
              onClick={cargar}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600/60 rounded-lg text-xs text-slate-300 transition-colors"
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
              <div className="animate-spin rounded-full size-8 border-b-2 border-teal-400" />
              <p className="text-slate-500 text-sm">Cargando información del servidor…</p>
            </div>
          </div>
        )}

        {estado.status === "error" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm mb-3">
            {estado.error}
          </div>
        )}

        <div className="flex flex-col gap-3 max-w-5xl mx-auto">

          {/* Info del servidor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

            {/* URLs del servidor */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-teal-500/15 rounded-lg">
                  <FaWifi className="text-teal-400 text-sm" />
                </div>
                <p className="text-sm font-semibold text-white">Información del servidor</p>
              </div>

              {online ? (
                <div className="space-y-0">
                  <UrlRow label="URL principal" url={preferredUrl} accent="text-teal-300" />
                  {Array.isArray(estado.info?.urls) && estado.info.urls.filter(u => u !== preferredUrl).map(u => (
                    <UrlRow key={u} label="URL alternativa" url={u} accent="text-slate-400" />
                  ))}
                  <UrlRow label="Puerto" url="3001" mono={false} accent="text-slate-300" />
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  El servidor corre en el puerto <span className="font-mono text-slate-400">3001</span> de este equipo.
                  Inicia la app y presiona Actualizar.
                </p>
              )}

              <p className="text-[10px] text-slate-600 mt-3 flex items-center gap-1">
                <FaWifi className="text-[9px]" />
                El PC y los dispositivos deben estar en la misma red Wi-Fi.
              </p>
            </div>

            {/* Overlay OBS */}
            <div className="bg-violet-500/[0.07] border border-violet-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-violet-500/15 rounded-lg">
                  <FaVideo className="text-violet-400 text-sm" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-none">Overlay para OBS</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Superposición en tiempo real</p>
                </div>
              </div>

              {/* Opción 1: con fondo del proyector */}
              <div className="mb-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 uppercase tracking-wide">Con fondo</span>
                  <p className="text-[10px] text-slate-500">Muestra el fondo activo del proyector</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="flex-1 font-mono text-xs text-violet-300 bg-slate-900/80 border border-violet-500/20 rounded-lg px-3 py-2 break-all">
                    {obsUrl || `http://[IP]:3001/obs`}
                  </p>
                  {obsUrl && (
                    <button type="button" onClick={() => copiar("obs", obsUrl)}
                      className={`shrink-0 p-2 rounded-lg border transition-colors ${copiado.obs ? "bg-green-500/15 border-green-500/30 text-green-400" : "bg-violet-500/15 hover:bg-violet-500/25 border-violet-500/20 text-violet-400"}`}
                      title="Copiar">
                      {copiado.obs ? <FaCheck className="text-sm" /> : <FaCopy className="text-sm" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Opción 2: solo texto transparente */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 uppercase tracking-wide">Solo texto</span>
                  <p className="text-[10px] text-slate-500">Transparente — superponer sobre cámara</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="flex-1 font-mono text-xs text-sky-300 bg-slate-900/80 border border-sky-500/20 rounded-lg px-3 py-2 break-all">
                    {obsUrl ? `${obsUrl}?solo-texto=1` : `http://[IP]:3001/obs?solo-texto=1`}
                  </p>
                  {obsUrl && (
                    <button type="button" onClick={() => copiar("obsSoloTexto", `${obsUrl}?solo-texto=1`)}
                      className={`shrink-0 p-2 rounded-lg border transition-colors ${copiado.obsSoloTexto ? "bg-green-500/15 border-green-500/30 text-green-400" : "bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/20 text-sky-400"}`}
                      title="Copiar">
                      {copiado.obsSoloTexto ? <FaCheck className="text-sm" /> : <FaCopy className="text-sm" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/60 rounded-lg p-3">
                <ul className="text-[11px] text-slate-500 space-y-0.5">
                  <li>· Se actualiza cada 800 ms · el fondo cambia automáticamente</li>
                  <li>· Referencia (libro · capítulo:versículo) aparece sobre el texto</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Instrucciones OBS */}
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-violet-500/15 rounded-lg">
                <FaDesktop className="text-violet-400 text-sm" />
              </div>
              <p className="text-sm font-semibold text-white">Cómo configurar OBS Studio</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  n: "1",
                  titulo: "Agregar fuente",
                  desc: "En OBS, en el panel Fuentes haz clic en el botón + y selecciona",
                  tag: "Browser Source",
                  color: "violet",
                },
                {
                  n: "2",
                  titulo: "Pegar la URL",
                  desc: "En el campo URL pega la dirección del overlay y configura la resolución",
                  tag: "1920 × 1080",
                  color: "blue",
                },
                {
                  n: "3",
                  titulo: "Opciones recomendadas",
                  desc: "Activa la opción de apagar la fuente cuando no esté visible para ahorrar recursos",
                  tag: "Shutdown when not visible",
                  color: "teal",
                },
                {
                  n: "4",
                  titulo: "¡Listo!",
                  desc: "El overlay detecta automáticamente el contenido proyectado y lo muestra en OBS",
                  tag: "Sin configuración extra",
                  color: "emerald",
                },
              ].map(({n, titulo, desc, tag, color}) => {
                const ring = {
                  violet: "border-violet-500/30 bg-violet-500/10 text-violet-300",
                  blue:   "border-blue-500/30 bg-blue-500/10 text-blue-300",
                  teal:   "border-teal-500/30 bg-teal-500/10 text-teal-300",
                  emerald:"border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                }[color];
                const badge = {
                  violet: "bg-violet-500/15 text-violet-300",
                  blue:   "bg-blue-500/15 text-blue-300",
                  teal:   "bg-teal-500/15 text-teal-300",
                  emerald:"bg-emerald-500/15 text-emerald-300",
                }[color];
                return (
                  <div key={n} className="bg-slate-800/40 rounded-xl p-3 flex flex-col gap-2">
                    <div className={`size-8 rounded-full border flex items-center justify-center text-sm font-bold shrink-0 ${ring}`}>
                      {n}
                    </div>
                    <p className="text-xs font-semibold text-white leading-tight">{titulo}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed flex-1">{desc}</p>
                    <span className={`self-start text-[10px] font-mono px-2 py-0.5 rounded ${badge}`}>{tag}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 bg-slate-800/40 rounded-lg p-3">
              <p className="text-[11px] text-slate-400">
                <span className="text-white font-medium">Consejo:</span>{" "}
                Coloca el Browser Source como capa superior en OBS con el proyector de video/cámara debajo.
                El fondo transparente del overlay permite verlo superpuesto sin ocultar otras fuentes.
              </p>
            </div>
          </div>

          {/* API Reference */}
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-amber-500/15 rounded-lg">
                <FaCode className="text-amber-400 text-sm" />
              </div>
              <p className="text-sm font-semibold text-white">Endpoints del servidor</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <div>
                <EndpointRow method="GET" path="/obs" desc="Overlay transparente para OBS Browser Source" />
                <EndpointRow method="GET" path="/api/proyector/estado" desc="Estado actual del proyector (JSON)" />
                <EndpointRow method="GET" path="/api/connection-info" desc="IPs del servidor y URLs de conexión" />
              </div>
              <div>
                <EndpointRow method="GET" path="/api/qr.png" desc="Código QR para conectar la app móvil" />
                <EndpointRow method="GET" path="/api/himnos" desc="Listado de himnos disponibles" />
                <EndpointRow method="GET" path="/api/fondos" desc="Fondos de pantalla disponibles" />
              </div>
            </div>
            <p className="text-[10px] text-slate-600 mt-3 font-mono">
              Base: {apiBase}
            </p>
          </div>

          {/* Info técnica */}
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-300 mb-3">Solución de problemas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-slate-500">
              <p>· PC y dispositivos en la misma red Wi-Fi (no datos móviles).</p>
              <p>· Sin VPN activa en ninguno de los dispositivos.</p>
              <p>· En Windows: permite GloryView en el Firewall (puerto 3001).</p>
              <p>· OBS en la misma red o en el mismo PC que GloryView.</p>
              <p>· Si cambiaste de red, presiona Actualizar para refrescar las IPs.</p>
              <p>· El servidor arranca automáticamente con la app; no necesita configuración.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
