import React, { useState, useEffect, useCallback } from "react";
import {
  FaEye,
  FaEyeSlash,
  FaSave,
  FaEdit,
  FaTrash,
  FaUserTie,
  FaIdBadge,
  FaIdCard,
  FaStopwatch,
} from "react-icons/fa";

const ipcOk = () => Boolean(window.electron?.obtenerOradores);

// Debe coincidir con TERCIO_PLANTILLAS en main.js (id, nombre, color de muestra)
const PLANTILLAS = [
  { id: "dorado", nombre: "Dorado Clásico", color: "#d4af37" },
  { id: "esmeralda", nombre: "Esmeralda", color: "#2fbf8f" },
  { id: "borgona", nombre: "Borgoña Real", color: "#8a2f44" },
  { id: "plata", nombre: "Plata Elegante", color: "#c9cdd6" },
];

export default function TercioInferior() {
  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("");
  const [plantilla, setPlantilla] = useState("dorado");
  const [duracionEntrada, setDuracionEntrada] = useState(700);
  const [duracionSalida, setDuracionSalida] = useState(600);
  const [autoOcultar, setAutoOcultar] = useState(false);
  const [autoOcultarMs, setAutoOcultarMs] = useState(6000);
  const [oradores, setOradores] = useState([]);
  const [oradorSeleccionadoId, setOradorSeleccionadoId] = useState("");
  const [visible, setVisible] = useState(false);
  const [mensaje, setMensaje] = useState(null); // {texto, tipo}
  const [cargando, setCargando] = useState(false);

  const mostrarMensaje = useCallback((texto, tipo = "success") => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 2500);
  }, []);

  const cargarOradores = useCallback(async () => {
    if (!ipcOk()) return;
    try {
      const lista = await window.electron.obtenerOradores();
      setOradores(Array.isArray(lista) ? lista : []);
    } catch {
      setOradores([]);
    }
  }, []);

  useEffect(() => {
    cargarOradores();
  }, [cargarOradores]);

  const seleccionarOrador = (id) => {
    setOradorSeleccionadoId(id);
    if (!id) return;
    const orador = oradores.find((o) => String(o.id) === String(id));
    if (orador) {
      setNombre(orador.nombre || "");
      setCargo(orador.cargo || "");
    }
  };

  const mostrar = async () => {
    const n = nombre.trim();
    if (!n) {
      mostrarMensaje("Escribe un nombre.", "error");
      return;
    }
    if (!ipcOk() && !window.electron?.mostrarTercioInferior) {
      mostrarMensaje("No se pudo conectar con la app.", "error");
      return;
    }
    setCargando(true);
    try {
      await window.electron.mostrarTercioInferior({
        nombre: n,
        cargo: cargo.trim(),
        plantilla,
        duracionEntrada: Number(duracionEntrada) || 700,
        duracionSalida: Number(duracionSalida) || 600,
        autoOcultarMs: autoOcultar ? Number(autoOcultarMs) || 0 : 0,
      });
      setVisible(true);
      mostrarMensaje("Tercio inferior mostrado en OBS.");
    } catch {
      mostrarMensaje("No se pudo mostrar.", "error");
    } finally {
      setCargando(false);
    }
  };

  const elegirPlantilla = async (id) => {
    setPlantilla(id);
    if (visible) {
      try {
        await window.electron?.cambiarPlantillaTercioInferior?.(id);
      } catch {}
    }
  };

  const ocultar = async () => {
    setCargando(true);
    try {
      await window.electron?.ocultarTercioInferior?.();
      setVisible(false);
      mostrarMensaje("Tercio inferior ocultado.");
    } catch {
      mostrarMensaje("No se pudo ocultar.", "error");
    } finally {
      setCargando(false);
    }
  };

  const guardarPersona = async () => {
    const n = nombre.trim();
    if (!n) {
      mostrarMensaje("Escribe un nombre antes de guardar.", "error");
      return;
    }
    const resultado = await window.electron?.agregarOrador?.({ nombre: n, cargo: cargo.trim() });
    if (resultado?.success) {
      mostrarMensaje("Persona guardada.");
      await cargarOradores();
      setOradorSeleccionadoId(String(resultado.id));
    } else {
      mostrarMensaje("No se pudo guardar.", "error");
    }
  };

  const actualizarPersona = async () => {
    if (!oradorSeleccionadoId) {
      mostrarMensaje("Selecciona una persona guardada primero.", "error");
      return;
    }
    const n = nombre.trim();
    if (!n) {
      mostrarMensaje("Escribe un nombre.", "error");
      return;
    }
    const resultado = await window.electron?.actualizarOrador?.({
      id: Number(oradorSeleccionadoId),
      nombre: n,
      cargo: cargo.trim(),
    });
    if (resultado?.success) {
      mostrarMensaje("Persona actualizada.");
      await cargarOradores();
    } else {
      mostrarMensaje("No se pudo actualizar.", "error");
    }
  };

  const eliminarPersona = async () => {
    if (!oradorSeleccionadoId) {
      mostrarMensaje("Selecciona una persona guardada primero.", "error");
      return;
    }
    const resultado = await window.electron?.eliminarOrador?.(Number(oradorSeleccionadoId));
    if (resultado?.success) {
      mostrarMensaje("Persona eliminada.");
      setOradorSeleccionadoId("");
      setNombre("");
      setCargo("");
      await cargarOradores();
    } else {
      mostrarMensaje("No se pudo eliminar.", "error");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FaIdCard className="text-amber-400" />
          Tercio Inferior
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Gráfico de nombre y cargo para la transmisión en OBS — Iglesia
          Morava, Sarasota FL.
        </p>
      </div>

      {mensaje && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-xl text-sm font-medium border ${
            mensaje.tipo === "error"
              ? "bg-red-500/10 border-red-500/30 text-red-300"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-4">
        <div
          className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border ${
            visible
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-white/5 border-white/10 text-slate-400"
          }`}
        >
          <span
            className={`size-2 rounded-full ${visible ? "bg-amber-400 animate-pulse" : "bg-slate-600"}`}
          />
          {visible ? "VISIBLE EN OBS" : "OCULTO"}
        </div>

        {oradores.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Personas guardadas
            </label>
            <select
              value={oradorSeleccionadoId}
              onChange={(e) => seleccionarOrador(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="">— Elegir persona guardada —</option>
              {oradores.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                  {o.cargo ? ` — ${o.cargo}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            <FaUserTie className="inline mr-1.5 mb-0.5" />
            Nombre
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Thomas Williams"
            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            <FaIdBadge className="inline mr-1.5 mb-0.5" />
            Cargo
          </label>
          <input
            type="text"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            placeholder="Pastor"
            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Plantilla
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PLANTILLAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => elegirPlantilla(p.id)}
                title={p.nombre}
                className={`flex flex-col items-center gap-1.5 py-2 rounded-lg border transition ${
                  plantilla === p.id
                    ? "border-white/40 bg-white/10"
                    : "border-white/10 hover:border-white/25"
                }`}
              >
                <span
                  className="size-5 rounded-full border border-white/20"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-[10px] text-slate-300 leading-tight text-center px-1">
                  {p.nombre}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            <FaStopwatch className="inline mr-1.5 mb-0.5" />
            Velocidad de la animación (ms)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="block text-[10px] text-slate-500 mb-1">Aparición</span>
              <input
                type="number"
                min="100"
                step="50"
                value={duracionEntrada}
                onChange={(e) => setDuracionEntrada(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 mb-1">Desaparición</span>
              <input
                type="number"
                min="100"
                step="50"
                value={duracionSalida}
                onChange={(e) => setDuracionSalida(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-white/10 rounded-lg p-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoOcultar}
              onChange={(e) => setAutoOcultar(e.target.checked)}
              className="size-4 accent-amber-500"
            />
            <span className="text-xs font-medium text-slate-300">
              Ocultar automáticamente al mostrar
            </span>
          </label>
          {autoOcultar && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-slate-500 shrink-0">Después de (ms)</span>
              <input
                type="number"
                min="500"
                step="500"
                value={autoOcultarMs}
                onChange={(e) => setAutoOcultarMs(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          )}
          <p className="text-[10px] text-slate-500 mt-2">
            Desactivado: queda visible hasta que toques OCULTAR (manual).
            Activado: se oculta solo después del tiempo indicado.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={mostrar}
            disabled={cargando}
            className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-lg transition disabled:opacity-50"
          >
            <FaEye /> MOSTRAR
          </button>
          <button
            onClick={ocultar}
            disabled={cargando}
            className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-lg transition disabled:opacity-50"
          >
            <FaEyeSlash /> OCULTAR
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 mt-2">
          <button
            onClick={guardarPersona}
            className="flex items-center justify-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-semibold text-xs py-2.5 rounded-lg transition mt-3"
          >
            <FaSave /> GUARDAR
          </button>
          <button
            onClick={actualizarPersona}
            className="flex items-center justify-center gap-1.5 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 font-semibold text-xs py-2.5 rounded-lg transition mt-3"
          >
            <FaEdit /> ACTUALIZAR
          </button>
          <button
            onClick={eliminarPersona}
            className="flex items-center justify-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 font-semibold text-xs py-2.5 rounded-lg transition mt-3"
          >
            <FaTrash /> ELIMINAR
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-4 leading-relaxed">
        En OBS, agrega una fuente "Navegador" apuntando a la misma URL que ya
        usas para el overlay (ver página Servidor) — el tercio inferior
        aparece sobre cualquier otra cosa, incluso sin nada más activo.
      </p>
    </div>
  );
}
