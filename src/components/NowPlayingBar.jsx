import {useCallback, useEffect, useRef, useState} from "react";
import {useLocation} from "react-router-dom";
import {
  FaMusic,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaGripVertical,
} from "react-icons/fa";
import {useNowPlaying} from "../contexts/NowPlayingContext";

const STORAGE_KEY = "gloryview:nowPlayingBarPos:v1";
const MARGIN = 8;

// Barra fija al fondo de la app, visible en cualquier página mientras haya
// un himno proyectado — permite avanzar/retroceder estrofas o detener sin
// tener que volver a la página del himno. Arrastrable desde el grip: el
// usuario la reubica donde le convenga y la posición se recuerda entre
// sesiones (doble clic en el grip restablece la posición por defecto).
const NowPlayingBar = () => {
  const location = useLocation();
  const {activeHimno, slides, currentIndex, isActive, siguiente, anterior, detener} =
    useNowPlaying();

  const barRef = useRef(null);
  const dragging = useRef(false);
  const dragStart = useRef({x: 0, y: 0, left: 0, top: 0});

  const [pos, setPos] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
        return parsed;
      }
    } catch {
      // noop
    }
    return null;
  });

  const clamp = useCallback((x, y) => {
    const el = barRef.current;
    const w = el?.offsetWidth ?? 320;
    const h = el?.offsetHeight ?? 56;
    const maxX = Math.max(MARGIN, window.innerWidth - w - MARGIN);
    const maxY = Math.max(MARGIN, window.innerHeight - h - MARGIN);
    return {
      x: Math.max(MARGIN, Math.min(maxX, x)),
      y: Math.max(MARGIN, Math.min(maxY, y)),
    };
  }, []);

  const onHandleDown = (e) => {
    e.preventDefault();
    const el = barRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragging.current = true;
    dragStart.current = {x: e.clientX, y: e.clientY, left: rect.left, top: rect.top};
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPos(clamp(dragStart.current.left + dx, dragStart.current.top + dy));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setPos((current) => {
        try {
          if (current) localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        } catch {
          // noop
        }
        return current;
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [clamp]);

  const resetPos = () => {
    setPos(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // noop
    }
  };

  // Nunca mostrar en la ventana del proyector.
  if (location.pathname === "/proyector") return null;
  if (!isActive || !activeHimno) return null;

  const slide = slides[currentIndex];
  const total = slides.length;
  const posicionLabel =
    slide && slide.total > 1
      ? `${slide.parrafoIdx + 1}/${slide.slideIdx + 1}`
      : `${(slide?.parrafoIdx ?? currentIndex) + 1}`;

  const barStyle = pos ? {left: pos.x, top: pos.y} : undefined;
  const barClass = pos
    ? "fixed z-40 w-[min(42rem,calc(100vw-1.5rem))]"
    : "fixed z-40 bottom-3 left-1/2 -translate-x-1/2 w-[min(42rem,calc(100vw-1.5rem))]";

  return (
    <div ref={barRef} style={barStyle} className={barClass}>
      <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-xl border border-emerald-500/20 rounded-2xl shadow-2xl shadow-black/50 px-2 py-2 sm:px-3 sm:py-2.5">
        <button
          type="button"
          onMouseDown={onHandleDown}
          onDoubleClick={resetPos}
          className="shrink-0 size-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-white/30 hover:text-white/60 cursor-grab active:cursor-grabbing transition-colors"
          title="Arrastrar para mover · doble clic para restablecer posición"
        >
          <FaGripVertical className="text-xs" />
        </button>

        <div className="size-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <FaMusic className="text-emerald-400 text-xs animate-pulse" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80 shrink-0">
              En vivo
            </span>
            <span className="text-white/20 text-[10px] shrink-0">·</span>
            <span className="text-xs sm:text-sm font-semibold text-white truncate">
              Himno {activeHimno.numero} — {activeHimno.titulo}
            </span>
          </div>
          <p className="text-[11px] text-white/40 truncate hidden sm:block">
            {slide?.texto ?? ""}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={anterior}
            disabled={currentIndex <= 0}
            className="size-8 rounded-lg bg-white/6 hover:bg-white/12 border border-white/8 flex items-center justify-center text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Anterior (←)"
          >
            <FaChevronLeft className="text-[10px]" />
          </button>

          <span className="text-[11px] text-white/40 tabular-nums px-1 min-w-[3rem] text-center">
            {posicionLabel} / {total}
          </span>

          <button
            type="button"
            onClick={siguiente}
            disabled={currentIndex >= total - 1}
            className="size-8 rounded-lg bg-white/6 hover:bg-white/12 border border-white/8 flex items-center justify-center text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Siguiente (→)"
          >
            <FaChevronRight className="text-[10px]" />
          </button>

          <div className="w-px h-5 bg-white/10 mx-0.5" />

          <button
            type="button"
            onClick={detener}
            className="size-8 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 flex items-center justify-center text-red-300 hover:text-red-200 transition-colors"
            title="Detener proyección (Esc)"
          >
            <FaTimes className="text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NowPlayingBar;
