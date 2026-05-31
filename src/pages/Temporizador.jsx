import React, {useState, useEffect, useCallback} from "react";
import {
  FaPlay,
  FaStop,
  FaPause,
  FaRedo,
  FaBroadcastTower,
  FaClock,
  FaPlus,
  FaMinus,
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

// Estado inicial del timer en main process
const ESTADO_INICIAL = {
  segundos: 600,
  total: 600,
  mensaje: "El culto comienza en",
  corriendo: false,
  proyectando: false,
  terminado: false,
};

export default function Temporizador() {
  // minutos y mensaje son locales (inputs del usuario)
  const [minutos, setMinutos] = useState(10);
  const [mensaje, setMensaje] = useState("El culto comienza en");

  // Estado real viene del main process vía IPC
  const [estado, setEstado] = useState(ESTADO_INICIAL);
  const [ocupado, setOcupado] = useState(false);

  const seg = Number(estado.segundos ?? 0);
  const total = Number(estado.total ?? 600);
  const corriendo = Boolean(estado.corriendo);
  const proyectando = Boolean(estado.proyectando);
  const terminado = Boolean(estado.terminado);
  const progreso = total > 0 ? Math.min(100, ((total - seg) / total) * 100) : 0;
  const esCritico = seg <= 60 && seg > 0;

  // Sincronizar minutos locales con el total del servidor al montar
  useEffect(() => {
    window.electron?.timerEstado?.().then((e) => {
      if (e) {
        setEstado(e);
        setMensaje(e.mensaje || "El culto comienza en");
        const minFromTotal = Math.round((e.total || 600) / 60);
        setMinutos(minFromTotal);
      }
    });
  }, []);

  // Escuchar ticks del main process — actualiza la UI aunque se haya navegado y vuelto
  useEffect(() => {
    const handleTick = (_, data) => {
      if (data) setEstado(data);
    };
    window.electron?.on?.("timer-tick", handleTick);
    return () => window.electron?.removeListener?.("timer-tick", handleTick);
  }, []);

  const cmd = useCallback(
    async (fn) => {
      if (ocupado) return;
      setOcupado(true);
      try {
        const result = await fn();
        if (result) setEstado(result);
      } finally {
        setOcupado(false);
      }
    },
    [ocupado],
  );

  const iniciar = () =>
    cmd(() => window.electron?.timerIniciar?.({minutos, mensaje}));

  const pausar = () => cmd(() => window.electron?.timerPausar?.());

  const reiniciar = () =>
    cmd(() => window.electron?.timerReiniciar?.({minutos}));

  const iniciarConProyeccion = () =>
    cmd(() => window.electron?.timerProyectar?.({minutos, mensaje}));

  const detenerProyeccion = () => cmd(() => window.electron?.timerDetener?.());

  const cambiarMinutos = (nuevoMin) => {
    if (corriendo) return;
    setMinutos(nuevoMin);
  };

  return (
    <div className="bg-[#080c14] text-slate-100 h-full flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md">
        {/* Título */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <FaClock className="text-indigo-400 text-lg" />
            <h1 className="text-xl font-bold text-white">Temporizador</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Proyecta una cuenta regresiva en pantalla
            <span className="ml-2 text-indigo-400/70 text-[10px] font-semibold">
              · persiste al navegar
            </span>
          </p>
        </div>

        {/* Mensaje personalizable */}
        <div className="mb-4">
          <label
            htmlFor="timer-mensaje"
            className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5"
          >
            Mensaje en pantalla
          </label>
          <input
            id="timer-mensaje"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            onBlur={() => window.electron?.timerSetMensaje?.({mensaje})}
            placeholder="Ej: El culto comienza en"
            className="w-full bg-slate-800 border border-slate-600/60 focus:border-indigo-500/70 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Presets */}
        <div className="mb-4">
          <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">
            Duración
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p.minutos}
                onClick={() => cambiarMinutos(p.minutos)}
                disabled={corriendo}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all disabled:cursor-not-allowed ${
                  minutos === p.minutos
                    ? "bg-indigo-600 border-indigo-500/50 text-white"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40"
                }`}
              >
                {p.label}
              </button>
            ))}
            <div className="flex items-center gap-1 ml-auto bg-slate-800 border border-slate-700/60 rounded-lg">
              <button
                type="button"
                onClick={() => cambiarMinutos(Math.max(1, minutos - 1))}
                disabled={corriendo || minutos <= 1}
                className="size-7 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <FaMinus className="text-[9px]" />
              </button>
              <span className="text-xs font-bold text-white w-8 text-center tabular-nums">
                {minutos}m
              </span>
              <button
                type="button"
                onClick={() => cambiarMinutos(Math.min(99, minutos + 1))}
                disabled={corriendo || minutos >= 99}
                className="size-7 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <FaPlus className="text-[9px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Pantalla del temporizador */}
        <div
          className={`relative rounded-2xl border mb-5 overflow-hidden ${
            terminado
              ? "border-emerald-500/40 bg-emerald-500/5"
              : esCritico
                ? "border-red-500/40 bg-red-500/5"
                : proyectando
                  ? "border-indigo-500/40 bg-indigo-500/5"
                  : "border-slate-700/60 bg-slate-900/60"
          }`}
        >
          <div className="h-1 bg-slate-800">
            <div
              className={`h-full transition-all duration-1000 ${
                terminado
                  ? "bg-emerald-500"
                  : esCritico
                    ? "bg-red-500"
                    : "bg-indigo-500"
              }`}
              style={{width: `${progreso}%`}}
            />
          </div>
          <div className="py-8 px-4 text-center">
            {estado.mensaje && (
              <p className="text-sm text-slate-400 mb-3">{estado.mensaje}</p>
            )}
            <div
              className={`text-7xl font-bold tracking-tight tabular-nums transition-colors ${
                terminado
                  ? "text-emerald-400"
                  : esCritico
                    ? "text-red-400"
                    : "text-white"
              }`}
            >
              {terminado ? "¡Ya!" : formatTiempo(seg)}
            </div>
            {proyectando && !terminado && (
              <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] font-bold text-indigo-300">
                <span className="size-1.5 rounded-full bg-indigo-400 animate-pulse" />
                EN PANTALLA, continúa aunque navegues
              </div>
            )}
          </div>
        </div>

        {/* Controles */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {!corriendo ? (
            <button
              type="button"
              onClick={iniciar}
              disabled={seg <= 0 || terminado || ocupado}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 border border-slate-600/60 text-white font-semibold text-sm transition-colors"
            >
              <FaPlay className="text-xs" /> Iniciar
            </button>
          ) : (
            <button
              type="button"
              onClick={pausar}
              disabled={ocupado}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600/80 hover:bg-amber-600 border border-amber-500/30 text-white font-semibold text-sm transition-colors disabled:opacity-40"
            >
              <FaPause className="text-xs" /> Pausar
            </button>
          )}
          <button
            type="button"
            onClick={reiniciar}
            disabled={ocupado}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 font-semibold text-sm transition-colors disabled:opacity-40"
          >
            <FaRedo className="text-xs" /> Reiniciar
          </button>
        </div>

        {/* Proyección */}
        {!proyectando ? (
          <button
            type="button"
            onClick={iniciarConProyeccion}
            disabled={seg <= 0 || ocupado}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 border border-indigo-500/30 text-white font-bold text-sm transition-colors shadow-lg shadow-indigo-900/40"
          >
            <FaBroadcastTower className="text-xs" /> Proyectar en pantalla
          </button>
        ) : (
          <button
            type="button"
            onClick={detenerProyeccion}
            disabled={ocupado}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-sm transition-colors disabled:opacity-40"
          >
            <FaStop className="text-xs" /> Detener proyección
          </button>
        )}

        <p className="text-center text-[10px] text-slate-600 mt-3">
          Al terminar, la pantalla muestra "¡Bienvenidos!" por 4 segundos y se
          limpia.
        </p>
      </div>
    </div>
  );
}
