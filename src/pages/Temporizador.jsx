import {useState, useEffect, useCallback} from "react";
import {
  FaPlay, FaStop, FaPause, FaRedo, FaBroadcastTower,
  FaClock, FaPlus, FaMinus, FaVideo, FaCheck, FaTimes, FaImage,
} from "react-icons/fa";

const PRESETS = [
  {label: "5 min", minutos: 5},
  {label: "10 min", minutos: 10},
  {label: "15 min", minutos: 15},
  {label: "20 min", minutos: 20},
  {label: "30 min", minutos: 30},
];

const pad = (n) => String(n).padStart(2, "0");
const formatTiempo = (seg) => {
  const s = Math.max(0, Math.floor(seg));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};

const ESTADO_INICIAL = {
  segundos: 600, total: 600,
  mensaje: "El culto comienza en",
  corriendo: false, proyectando: false, terminado: false, fondo: null,
};

// Mini ring preview en la tarjeta izquierda
function MiniRing({seg, total, accentColor}) {
  const VB = 120, R = 52, SW = 5;
  const cx = VB / 2, cy = VB / 2;
  const circ = 2 * Math.PI * R;
  const progress = total > 0 ? Math.max(0, Math.min(1, seg / total)) : 0;
  const dashOff  = circ * (1 - progress);
  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-full"
      style={{filter: `drop-shadow(0 0 14px ${accentColor}55)`, overflow: "visible"}}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={SW} />
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={accentColor} strokeWidth={SW}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={dashOff}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{transition: "stroke-dashoffset 1s linear, stroke 0.5s"}}
      />
    </svg>
  );
}

export default function Temporizador() {
  const [minutos, setMinutos]               = useState(10);
  const [mensaje, setMensaje]               = useState("El culto comienza en");
  const [estado, setEstado]                 = useState(ESTADO_INICIAL);
  const [ocupado, setOcupado]               = useState(false);
  const [fondos, setFondos]                 = useState([]);
  const [fondoSeleccionado, setFondoSel]    = useState(null);

  const seg       = Number(estado.segundos ?? 0);
  const total     = Number(estado.total ?? 600);
  const corriendo   = Boolean(estado.corriendo);
  const proyectando = Boolean(estado.proyectando);
  const terminado   = Boolean(estado.terminado);
  const progreso    = total > 0 ? Math.min(100, ((total - seg) / total) * 100) : 0;
  const esCritico   = seg <= 60 && seg > 0;
  const accentColor = terminado ? "#10b981" : esCritico ? "#ef4444" : "#6366f1";

  useEffect(() => {
    window.electron?.timerEstado?.().then((e) => {
      if (!e) return;
      setEstado(e);
      setMensaje(e.mensaje || "El culto comienza en");
      setMinutos(Math.round((e.total || 600) / 60));
      if (e.fondo) setFondoSel(e.fondo);
    });
    window.electron?.obtenerFondos?.()
      .then((lista) => { if (Array.isArray(lista)) setFondos(lista); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const h = (_, data) => { if (data) setEstado(data); };
    window.electron?.on?.("timer-tick", h);
    return () => window.electron?.removeListener?.("timer-tick", h);
  }, []);

  const cmd = useCallback(async (fn) => {
    if (ocupado) return;
    setOcupado(true);
    try { const r = await fn(); if (r) setEstado(r); }
    finally { setOcupado(false); }
  }, [ocupado]);

  const iniciar   = () => cmd(() => window.electron?.timerIniciar?.({minutos, mensaje, fondo: fondoSeleccionado}));
  const pausar    = () => cmd(() => window.electron?.timerPausar?.());
  const reiniciar = () => cmd(() => window.electron?.timerReiniciar?.({minutos}));
  const proyectar = () => cmd(() => window.electron?.timerProyectar?.({minutos, mensaje, fondo: fondoSeleccionado}));
  const detener   = () => cmd(() => window.electron?.timerDetener?.());

  const cambiarMin = (v) => { if (!corriendo) setMinutos(v); };

  const seleccionarFondo = async (f) => {
    const nuevo = f ? {url: f.url, tipo: f.tipo} : null;
    setFondoSel(nuevo);
    if (proyectando) await window.electron?.timerSetFondo?.({fondo: nuevo});
  };

  return (
    <div className="bg-[#080c14] text-slate-100 h-full flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="shrink-0 border-b border-white/[0.06] px-5 py-3 flex items-center gap-3">
        <div className="p-2 bg-indigo-500/10 rounded-xl shrink-0">
          <FaClock className="text-indigo-400 text-sm" />
        </div>
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold text-white leading-none">Temporizador</h1>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">Cuenta regresiva en proyector · persiste al navegar</p>
        </div>
        {proyectando && (
          <div className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
            <span className="size-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[10px] font-bold text-indigo-300 tracking-wider">EN PANTALLA</span>
          </div>
        )}
      </div>

      {/* ── Cuerpo ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="h-full grid grid-cols-1 md:grid-cols-2 p-4 md:p-5 gap-4 md:gap-5" style={{gridAutoRows: "1fr"}}>

          {/* ══ Columna izquierda: reloj + controles ══ */}
          <div className="flex flex-col gap-3 min-h-0">

            {/* Tarjeta del reloj — crece para llenar el espacio */}
            <div className={`flex-1 rounded-2xl border overflow-hidden flex flex-col transition-colors min-h-0 ${
              terminado   ? "border-emerald-500/25 bg-emerald-500/[0.04]"
              : esCritico ? "border-red-500/25 bg-red-500/[0.04]"
              : proyectando ? "border-indigo-500/25 bg-indigo-500/[0.04]"
              : "border-white/[0.07] bg-white/[0.025]"
            }`}>
              {/* barra de progreso */}
              <div className="h-[3px] shrink-0 bg-slate-800/80">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{width: `${progreso}%`, backgroundColor: accentColor}} />
              </div>

              {/* Anillo + texto — rellena el espacio disponible */}
              <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0">
                <div className="relative" style={{
                  width:  "clamp(110px, 18vw, 200px)",
                  height: "clamp(110px, 18vw, 200px)",
                }}>
                  <MiniRing seg={seg} total={total} accentColor={accentColor} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className="font-black tabular-nums tracking-tight leading-none"
                      style={{
                        fontSize: "clamp(22px, 3.5vw, 40px)",
                        color: accentColor,
                        textShadow: `0 0 24px ${accentColor}70`,
                        transition: "color 0.5s",
                      }}
                    >
                      {terminado ? "¡Ya!" : formatTiempo(seg)}
                    </span>
                    {!terminado && (
                      <span className="text-[8px] uppercase tracking-widest text-white/20 mt-1">
                        {Math.floor(seg / 60) > 0 ? "min : seg" : "seg"}
                      </span>
                    )}
                  </div>
                </div>

                {estado.mensaje && (
                  <p className="text-xs text-slate-500 mt-3 text-center">{estado.mensaje}</p>
                )}
                {terminado && (
                  <p className="text-xs text-emerald-400 mt-1 font-semibold">¡Tiempo completado!</p>
                )}
              </div>
            </div>

            {/* Iniciar / Pausar + Reiniciar */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              {!corriendo ? (
                <button type="button" onClick={iniciar}
                  disabled={seg <= 0 || terminado || ocupado}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.09] text-white font-semibold text-sm transition-colors disabled:opacity-40"
                >
                  <FaPlay className="text-[10px]" /> Iniciar
                </button>
              ) : (
                <button type="button" onClick={pausar} disabled={ocupado}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 font-semibold text-sm transition-colors disabled:opacity-40"
                >
                  <FaPause className="text-[10px]" /> Pausar
                </button>
              )}
              <button type="button" onClick={reiniciar} disabled={ocupado}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-slate-400 hover:text-white font-semibold text-sm transition-colors disabled:opacity-40"
              >
                <FaRedo className="text-[10px]" /> Reiniciar
              </button>
            </div>

            {/* Proyectar / Detener */}
            {!proyectando ? (
              <button type="button" onClick={proyectar}
                disabled={seg <= 0 || ocupado}
                className="shrink-0 w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  boxShadow: "0 4px 20px #4f46e53a",
                }}
              >
                <FaBroadcastTower /> Proyectar en pantalla
              </button>
            ) : (
              <button type="button" onClick={detener} disabled={ocupado}
                className="shrink-0 w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/18 border border-red-500/20 text-red-400 font-bold text-sm transition-colors disabled:opacity-40"
              >
                <FaStop /> Detener proyección
              </button>
            )}
          </div>

          {/* ══ Columna derecha: configuración + fondo ══ */}
          <div className="flex flex-col gap-3 min-h-0">

            {/* Mensaje + Duración */}
            <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-4 shrink-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-3">Configuración</p>

              <div className="mb-4">
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">
                  Mensaje en pantalla
                </label>
                <input
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  onBlur={() => window.electron?.timerSetMensaje?.({mensaje})}
                  placeholder="Ej: El culto comienza en"
                  className="w-full bg-slate-800/70 border border-white/[0.08] focus:border-indigo-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">
                  Duración
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {PRESETS.map((p) => (
                    <button type="button" key={p.minutos}
                      onClick={() => cambiarMin(p.minutos)}
                      disabled={corriendo}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all disabled:cursor-not-allowed ${
                        minutos === p.minutos
                          ? "bg-indigo-600 border-indigo-500/50 text-white"
                          : "bg-white/[0.04] border-white/[0.07] text-slate-400 hover:text-white hover:bg-white/[0.09] disabled:opacity-40"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-800/70 border border-white/[0.08] rounded-xl overflow-hidden">
                    <button type="button" onClick={() => cambiarMin(Math.max(1, minutos - 1))}
                      disabled={corriendo || minutos <= 1}
                      className="size-8 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                    ><FaMinus className="text-[9px]" /></button>
                    <span className="text-sm font-bold text-white w-10 text-center tabular-nums">{minutos}m</span>
                    <button type="button" onClick={() => cambiarMin(Math.min(99, minutos + 1))}
                      disabled={corriendo || minutos >= 99}
                      className="size-8 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                    ><FaPlus className="text-[9px]" /></button>
                  </div>
                  <span className="text-[10px] text-slate-600">personalizado</span>
                </div>
              </div>
            </div>

            {/* Selector de fondo — crece para llenar el espacio */}
            <div className="flex-1 bg-white/[0.025] border border-white/[0.07] rounded-2xl p-4 flex flex-col min-h-0 overflow-hidden">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                  Fondo en proyector
                  {fondoSeleccionado && <span className="ml-2 text-indigo-400 normal-case tracking-normal font-semibold">· activo</span>}
                </p>
                {fondoSeleccionado && (
                  <button type="button" onClick={() => seleccionarFondo(null)}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <FaTimes className="text-[9px]" /> Quitar
                  </button>
                )}
              </div>

              {fondos.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-2">
                  <FaImage className="text-slate-700 text-3xl mb-2" />
                  <p className="text-[11px] text-slate-600">
                    Sin fondo personalizado se usará el<br/>
                    <span className="text-slate-500">fondo animado de estrellas</span>
                  </p>
                  <p className="text-[10px] text-slate-700 mt-2">
                    Agrega fondos en <span className="text-slate-600">Gestión de Fondos</span>
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="grid gap-2" style={{gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))"}}>
                    {/* Sin fondo */}
                    <button type="button" onClick={() => seleccionarFondo(null)}
                      className={`aspect-video rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                        !fondoSeleccionado
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-white/[0.08] bg-white/[0.04] hover:border-white/20"
                      }`}
                    >
                      {!fondoSeleccionado
                        ? <FaCheck className="text-indigo-400 text-[9px]" />
                        : <div className="w-3 h-3 rounded border border-white/20 bg-gradient-to-br from-indigo-900/50 to-transparent" />
                      }
                      <span className="text-[8px] text-slate-400 leading-none">Estrellas</span>
                    </button>

                    {fondos.map((f) => {
                      const activo = fondoSeleccionado?.url === f.url;
                      return (
                        <button type="button" key={f.id} onClick={() => seleccionarFondo(f)}
                          title={f.nombre}
                          className={`aspect-video rounded-xl border-2 overflow-hidden relative transition-all ${
                            activo
                              ? "border-indigo-500 ring-1 ring-indigo-400/30"
                              : "border-white/[0.08] hover:border-white/25"
                          }`}
                        >
                          {f.tipo === "video" ? (
                            <>
                              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                                <FaVideo className="text-slate-600 text-sm" />
                              </div>
                              <video src={f.url} className="absolute inset-0 w-full h-full object-cover opacity-60"
                                muted preload="metadata" />
                            </>
                          ) : (
                            <img src={f.url} alt={f.nombre} className="absolute inset-0 w-full h-full object-cover" />
                          )}
                          {activo && (
                            <div className="absolute inset-0 bg-indigo-500/25 flex items-center justify-center">
                              <FaCheck className="text-white text-[9px]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="shrink-0 text-center text-[9px] text-slate-700 pb-2">
        Al terminar, la pantalla muestra "¡Bienvenidos!" por 4 segundos y se limpia.
      </p>
    </div>
  );
}
