import React, {useState, useEffect, useRef} from "react";
import {
  FaPlay, FaStop, FaPause, FaRedo, FaBroadcastTower,
  FaClock, FaPlus, FaMinus,
} from "react-icons/fa";

const PRESETS = [
  {label: "5 min",  minutos: 5},
  {label: "10 min", minutos: 10},
  {label: "15 min", minutos: 15},
  {label: "20 min", minutos: 20},
  {label: "30 min", minutos: 30},
];

const pad = (n) => String(n).padStart(2, "0");

const formatTiempo = (segundos) => {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${pad(m)}:${pad(s)}`;
};

export default function Temporizador() {
  const [minutos, setMinutos] = useState(10);
  const [segundosRestantes, setSegundosRestantes] = useState(10 * 60);
  const [corriendo, setCorriendo] = useState(false);
  const [proyectando, setProyectando] = useState(false);
  const [mensaje, setMensaje] = useState("El culto comienza en");
  const [terminado, setTerminado] = useState(false);
  const intervalRef = useRef(null);
  const totalRef = useRef(minutos * 60);

  useEffect(() => {
    setSegundosRestantes(minutos * 60);
    totalRef.current = minutos * 60;
    setTerminado(false);
  }, [minutos]);

  useEffect(() => {
    if (corriendo && segundosRestantes > 0) {
      intervalRef.current = setInterval(() => {
        setSegundosRestantes((prev) => {
          const next = prev - 1;
          if (proyectando) enviarTiempo(next);
          if (next <= 0) {
            setCorriendo(false);
            setTerminado(true);
            if (proyectando) enviarFin();
          }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [corriendo, proyectando]);

  const enviarTiempo = (seg) => {
    window.electron?.proyectarTemporizador?.({
      segundos: seg,
      total: totalRef.current,
      mensaje: mensaje.trim(),
      terminado: false,
    });
  };

  const enviarFin = () => {
    window.electron?.proyectarTemporizador?.({
      segundos: 0,
      total: totalRef.current,
      mensaje: mensaje.trim(),
      terminado: true,
    });
    setTimeout(() => {
      window.electron?.enviarVersiculo?.({parrafo: "", titulo: "", numero: "", origen: "clear"});
      setProyectando(false);
    }, 4000);
  };

  const iniciar = () => {
    if (segundosRestantes <= 0) return;
    setCorriendo(true);
    setTerminado(false);
    if (proyectando) enviarTiempo(segundosRestantes);
  };

  const pausar = () => setCorriendo(false);

  const reiniciar = () => {
    clearInterval(intervalRef.current);
    setCorriendo(false);
    setTerminado(false);
    const total = minutos * 60;
    setSegundosRestantes(total);
    totalRef.current = total;
    if (proyectando) enviarTiempo(total);
  };

  const iniciarConProyeccion = async () => {
    window.electron?.abrirProyector?.();
    setProyectando(true);
    setCorriendo(true);
    setTerminado(false);
    enviarTiempo(segundosRestantes);
  };

  const detenerProyeccion = () => {
    setCorriendo(false);
    setProyectando(false);
    window.electron?.enviarVersiculo?.({parrafo: "", titulo: "", numero: "", origen: "clear"});
  };

  const progreso = totalRef.current > 0 ? ((totalRef.current - segundosRestantes) / totalRef.current) * 100 : 0;
  const esCritico = segundosRestantes <= 60 && segundosRestantes > 0;

  return (
    <div className="bg-slate-950 text-slate-100 h-full flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md">

        {/* Título */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <FaClock className="text-indigo-400 text-lg" />
            <h1 className="text-xl font-bold text-white">Temporizador</h1>
          </div>
          <p className="text-slate-500 text-sm">Proyecta una cuenta regresiva en pantalla</p>
        </div>

        {/* Mensaje personalizable */}
        <div className="mb-4">
          <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Mensaje en pantalla</label>
          <input
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Ej: El culto comienza en"
            className="w-full bg-slate-800 border border-slate-600/60 focus:border-indigo-500/70 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Presets */}
        <div className="mb-4">
          <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Duración</label>
          <div className="flex gap-1.5 flex-wrap">
            {PRESETS.map((p) => (
              <button key={p.minutos} onClick={() => { setMinutos(p.minutos); reiniciar(); }}
                disabled={corriendo}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all disabled:cursor-not-allowed ${
                  minutos === p.minutos
                    ? "bg-indigo-600 border-indigo-500/50 text-white"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40"
                }`}
              >{p.label}</button>
            ))}
            {/* Control manual */}
            <div className="flex items-center gap-1 ml-auto bg-slate-800 border border-slate-700/60 rounded-lg">
              <button onClick={() => { if (!corriendo && minutos > 1) setMinutos((m) => m - 1); }}
                disabled={corriendo || minutos <= 1}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                <FaMinus className="text-[9px]" />
              </button>
              <span className="text-xs font-bold text-white w-8 text-center tabular-nums">{minutos}m</span>
              <button onClick={() => { if (!corriendo && minutos < 99) setMinutos((m) => m + 1); }}
                disabled={corriendo || minutos >= 99}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                <FaPlus className="text-[9px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Pantalla del temporizador */}
        <div className={`relative rounded-2xl border mb-5 overflow-hidden ${
          terminado ? "border-emerald-500/40 bg-emerald-500/5"
          : esCritico ? "border-red-500/40 bg-red-500/5"
          : proyectando ? "border-indigo-500/40 bg-indigo-500/5"
          : "border-slate-700/60 bg-slate-900/60"
        }`}>
          {/* Barra de progreso */}
          <div className="h-1 bg-slate-800">
            <div
              className={`h-full transition-all duration-1000 ${terminado ? "bg-emerald-500" : esCritico ? "bg-red-500" : "bg-indigo-500"}`}
              style={{width: `${progreso}%`}}
            />
          </div>

          <div className="py-8 px-4 text-center">
            {mensaje && <p className="text-sm text-slate-400 mb-3">{mensaje}</p>}
            <div className={`text-7xl font-bold tracking-tight tabular-nums transition-colors ${
              terminado ? "text-emerald-400"
              : esCritico ? "text-red-400"
              : "text-white"
            }`}>
              {terminado ? "¡Ya!" : formatTiempo(segundosRestantes)}
            </div>
            {proyectando && !terminado && (
              <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] font-bold text-indigo-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />EN PANTALLA
              </div>
            )}
          </div>
        </div>

        {/* Controles */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Iniciar / Pausar */}
          {!corriendo ? (
            <button
              onClick={iniciar}
              disabled={segundosRestantes <= 0 || terminado}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 border border-slate-600/60 text-white font-semibold text-sm transition-colors"
            ><FaPlay className="text-xs" /> Iniciar</button>
          ) : (
            <button
              onClick={pausar}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600/80 hover:bg-amber-600 border border-amber-500/30 text-white font-semibold text-sm transition-colors"
            ><FaPause className="text-xs" /> Pausar</button>
          )}

          {/* Reiniciar */}
          <button
            onClick={reiniciar}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 font-semibold text-sm transition-colors"
          ><FaRedo className="text-xs" /> Reiniciar</button>
        </div>

        {/* Proyección */}
        {!proyectando ? (
          <button
            onClick={iniciarConProyeccion}
            disabled={segundosRestantes <= 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 border border-indigo-500/30 text-white font-bold text-sm transition-colors shadow-lg shadow-indigo-900/40"
          ><FaBroadcastTower className="text-xs" /> Proyectar en pantalla</button>
        ) : (
          <button
            onClick={detenerProyeccion}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-sm transition-colors"
          ><FaStop className="text-xs" /> Detener proyección</button>
        )}

        <p className="text-center text-[10px] text-slate-600 mt-3">
          Al terminar, la pantalla muestra "¡Bienvenidos!" por 4 segundos y se limpia.
        </p>
      </div>
    </div>
  );
}
