import {useMemo} from "react";

const pad = (n) => String(n).padStart(2, "0");

// Colores según tiempo restante
function getColor(segundos, terminado) {
  if (terminado) return {accent: "#10b981", text: "#d1fae5", glow: "0 0 40px #10b98180"};
  if (segundos <= 30) return {accent: "#ef4444", text: "#fee2e2", glow: "0 0 40px #ef444480"};
  if (segundos <= 60) return {accent: "#f59e0b", text: "#fef3c7", glow: "0 0 40px #f59e0b80"};
  return {accent: "#6366f1", text: "#e0e7ff", glow: "0 0 60px #6366f160"};
}

export default function TimerDisplay({segundos = 0, total = 600, mensaje = "", terminado = false}) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;

  // SVG ring
  const R = 180;
  const STROKE = 10;
  const circumference = 2 * Math.PI * R;
  const progress = total > 0 ? Math.max(0, Math.min(1, segundos / total)) : 0;
  const dashOffset = circumference * (1 - progress);

  const {accent, text, glow} = useMemo(() => getColor(segundos, terminado), [segundos, terminado]);

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center select-none"
      style={{
        background: `radial-gradient(ellipse 80% 70% at 50% 50%, ${accent}14 0%, transparent 70%), #070a14`,
      }}
    >
      {/* Mensaje */}
      {mensaje && (
        <p
          className="text-2xl font-light tracking-[0.18em] uppercase mb-10 opacity-70"
          style={{color: text}}
        >
          {mensaje}
        </p>
      )}

      {/* Anillo + dígitos */}
      <div className="relative flex items-center justify-center">
        {/* SVG circular ring */}
        <svg
          width={R * 2 + STROKE * 2 + 20}
          height={R * 2 + STROKE * 2 + 20}
          className="absolute"
          style={{filter: `drop-shadow(${glow})`}}
        >
          {/* Track */}
          <circle
            cx={R + STROKE + 10}
            cy={R + STROKE + 10}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={STROKE}
          />
          {/* Progress */}
          <circle
            cx={R + STROKE + 10}
            cy={R + STROKE + 10}
            r={R}
            fill="none"
            stroke={accent}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${R + STROKE + 10} ${R + STROKE + 10})`}
            style={{transition: "stroke-dashoffset 1s linear, stroke 0.5s ease"}}
          />
        </svg>

        {/* Dígitos centrales */}
        <div className="flex flex-col items-center justify-center z-10"
          style={{width: R * 2, height: R * 2}}>
          {terminado ? (
            <span
              className="font-black tracking-tight leading-none"
              style={{
                color: accent,
                fontSize: "5rem",
                textShadow: glow,
                transition: "color 0.5s ease",
              }}
            >
              ¡Ya!
            </span>
          ) : (
            <>
              <span
                className="font-black tabular-nums leading-none"
                style={{
                  color: text,
                  fontSize: "7.5rem",
                  letterSpacing: "0.04em",
                  textShadow: glow,
                  transition: "color 0.5s ease, text-shadow 0.5s ease",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {pad(m)}<span style={{color: accent, opacity: 0.8}}>:</span>{pad(s)}
              </span>
              <span
                className="text-sm font-semibold uppercase tracking-[0.3em] mt-3 opacity-40"
                style={{color: text}}
              >
                {m > 0 ? "min : seg" : "segundos"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Barra lineal de progreso */}
      <div className="w-80 mt-12 relative">
        <div className="h-1 rounded-full" style={{backgroundColor: "rgba(255,255,255,0.08)"}}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: accent,
              boxShadow: `0 0 8px ${accent}`,
              transition: "width 1s linear, background-color 0.5s ease",
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs opacity-25" style={{color: text}}>
          <span>inicio</span>
          <span>{Math.round(progress * 100)}%</span>
          <span>fin</span>
        </div>
      </div>
    </div>
  );
}
