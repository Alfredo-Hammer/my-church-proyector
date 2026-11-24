// Botón "Pista" del Himnario Adventista: reproduce el audio del himno por los parlantes
// de la compu. La pista se baja de Firebase la primera vez (servidor/rutas/pistas.js)
// y después suena sin internet. Si el himno no tiene pista, no se muestra nada.
import {useEffect, useRef, useState} from "react";
import {FaPause, FaPlay, FaHeadphones} from "react-icons/fa";

const API = "http://localhost:3001/api/pistas/adventista";

const mmss = (s) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

export default function PistaHimno({numero}) {
  const audioRef = useRef(null);
  const [estado, setEstado] = useState(null); // {disponible, descargada}
  const [sonando, setSonando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [tiempo, setTiempo] = useState({actual: 0, total: 0});

  useEffect(() => {
    let vivo = true;
    setEstado(null);
    setSonando(false);
    setCargando(false);
    setError("");
    setTiempo({actual: 0, total: 0});
    fetch(`${API}/${encodeURIComponent(numero)}/estado`)
      .then((r) => r.json())
      .then((j) => vivo && setEstado(j?.ok ? j : {disponible: null, descargada: false}))
      .catch(() => vivo && setEstado({disponible: null, descargada: false}));
    return () => {
      vivo = false;
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.removeAttribute("src");
        a.load();
      }
    };
  }, [numero]);

  if (!estado || estado.disponible === false) return null;
  const sinInternet = estado.disponible === null && !estado.descargada;

  const alternar = (e) => {
    e.currentTarget.blur(); // la barra espaciadora es "Proyectar" en esta página
    const a = audioRef.current;
    if (!a || sinInternet) return;
    setError("");
    if (!a.getAttribute("src")) {
      setCargando(true);
      a.src = `${API}/${encodeURIComponent(numero)}.mp3`;
    }
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const buscar = (e) => {
    const a = audioRef.current;
    if (!a || !tiempo.total) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * tiempo.total;
  };

  const titulo = sinInternet
    ? "Sin internet: la pista todavía no está en esta compu"
    : sonando
      ? "Pausar pista"
      : estado.descargada
        ? "Tocar pista"
        : "Tocar pista (se baja la primera vez)";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={alternar}
        disabled={sinInternet}
        title={titulo}
        className={`inline-flex items-center gap-2 h-8 xl:h-9 px-3 rounded-lg border text-xs xl:text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          sonando
            ? "bg-sky-500/20 border-sky-400/40 text-sky-200 hover:bg-sky-500/30"
            : "bg-white/5 border-white/8 text-white/70 hover:text-white hover:bg-white/10"
        }`}
      >
        {cargando ? (
          <span className="size-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : sonando ? (
          <FaPause className="text-[10px]" />
        ) : estado.descargada || tiempo.total ? (
          <FaPlay className="text-[10px]" />
        ) : (
          <FaHeadphones className="text-[11px]" />
        )}
        <span className="hidden sm:inline">{cargando ? "Bajando…" : "Pista"}</span>
      </button>

      {tiempo.total > 0 && (
        <div className="hidden md:flex items-center gap-2 text-[10px] tabular-nums text-white/50">
          <span>{mmss(tiempo.actual)}</span>
          <div
            role="slider"
            aria-label="Posición de la pista"
            aria-valuemin={0}
            aria-valuemax={Math.round(tiempo.total)}
            aria-valuenow={Math.round(tiempo.actual)}
            tabIndex={-1}
            onClick={buscar}
            className="w-24 xl:w-32 h-1.5 rounded-full bg-white/10 cursor-pointer overflow-hidden"
          >
            <div className="h-full bg-sky-400/80" style={{width: `${(tiempo.actual / tiempo.total) * 100}%`}} />
          </div>
          <span>{mmss(tiempo.total)}</span>
        </div>
      )}

      {error && <span className="text-[10px] text-red-300 max-w-[12rem] leading-tight">{error}</span>}

      <audio
        ref={audioRef}
        preload="none"
        onPlaying={() => {
          setCargando(false);
          setSonando(true);
          setEstado((e) => (e ? {...e, descargada: true} : e));
        }}
        onPause={() => setSonando(false)}
        onEnded={() => {
          setSonando(false);
          setTiempo((t) => ({...t, actual: 0}));
        }}
        onWaiting={() => setCargando(true)}
        onCanPlay={() => setCargando(false)}
        onLoadedMetadata={(e) => setTiempo({actual: 0, total: e.currentTarget.duration})}
        onTimeUpdate={(e) => setTiempo({actual: e.currentTarget.currentTime, total: e.currentTarget.duration || 0})}
        onError={(e) => {
          if (!e.currentTarget.getAttribute("src")) return;
          setCargando(false);
          setSonando(false);
          e.currentTarget.removeAttribute("src");
          setError("No se pudo bajar la pista. Revisá la conexión a internet.");
        }}
      />
    </div>
  );
}
