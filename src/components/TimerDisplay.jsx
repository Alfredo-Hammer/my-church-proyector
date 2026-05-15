import {useMemo} from "react";

const pad = (n) => String(n).padStart(2, "0");

function getColor(segundos, terminado) {
  if (terminado) return {accent: "#10b981", text: "#d1fae5", glow: "0 0 60px #10b98180"};
  if (segundos <= 30) return {accent: "#ef4444", text: "#fee2e2", glow: "0 0 60px #ef444480"};
  if (segundos <= 60) return {accent: "#f59e0b", text: "#fef3c7", glow: "0 0 60px #f59e0b80"};
  return {accent: "#6366f1", text: "#e0e7ff", glow: "0 0 80px #6366f160"};
}

// Todos los tamaños en vmin → escala igual en cualquier pantalla (HD, 4K, 50")
const V = {
  ringSize:    "68vmin",   // diámetro del contenedor del anillo
  stroke:      "1.4vmin",  // grosor del anillo (en % del viewBox se maneja aparte)
  fontSize:    "14vmin",   // dígitos MM:SS
  fontSizeYa:  "13vmin",   // "¡Ya!"
  labelSize:   "1.8vmin",  // "min : seg"
  mensajeSize: "3.8vmin",  // mensaje superior
  mensajeMb:   "4vmin",    // margen bajo el mensaje
  barWidth:    "60vmin",   // ancho barra lineal
  barHeight:   "0.5vmin",  // alto barra lineal
  barMt:       "6vmin",    // margen top barra
  labelMt:     "1.2vmin",  // margen top etiqueta de barra
};

export default function TimerDisplay({segundos = 0, total = 600, mensaje = "", terminado = false}) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;

  // SVG con viewBox → se estira al 100% del contenedor vmin
  const VB = 220; // unidades del viewBox (independiente de px)
  const R  = 100; // radio del anillo en unidades viewBox
  const SW = 6;   // stroke-width en unidades viewBox
  const cx = VB / 2;
  const cy = VB / 2;
  const circumference = 2 * Math.PI * R;
  const progress  = total > 0 ? Math.max(0, Math.min(1, segundos / total)) : 0;
  const dashOffset = circumference * (1 - progress);

  const {accent, text, glow} = useMemo(() => getColor(segundos, terminado), [segundos, terminado]);

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center select-none"
      style={{
        background: `radial-gradient(ellipse 80% 70% at 50% 50%, ${accent}18 0%, transparent 70%), #070a14`,
      }}
    >
      {/* Mensaje */}
      {mensaje && (
        <p
          style={{
            color: text,
            fontSize: V.mensajeSize,
            marginBottom: V.mensajeMb,
            fontWeight: 300,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            opacity: 0.75,
          }}
        >
          {mensaje}
        </p>
      )}

      {/* Anillo + dígitos — contenedor en vmin */}
      <div style={{ position: "relative", width: V.ringSize, height: V.ringSize }}>
        {/* SVG que escala al contenedor */}
        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            filter: `drop-shadow(${glow})`,
            overflow: "visible",
          }}
        >
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={SW}
          />
          {/* Progreso */}
          <circle
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke={accent}
            strokeWidth={SW}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{transition: "stroke-dashoffset 1s linear, stroke 0.5s ease"}}
          />
        </svg>

        {/* Dígitos centrados */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          {terminado ? (
            <span style={{
              color: accent,
              fontSize: V.fontSizeYa,
              fontWeight: 900,
              lineHeight: 1,
              textShadow: glow,
              transition: "color 0.5s ease",
            }}>
              ¡Ya!
            </span>
          ) : (
            <>
              <span style={{
                color: text,
                fontSize: V.fontSize,
                fontWeight: 900,
                letterSpacing: "0.04em",
                lineHeight: 1,
                textShadow: glow,
                fontVariantNumeric: "tabular-nums",
                transition: "color 0.5s ease, text-shadow 0.5s ease",
              }}>
                {pad(m)}<span style={{color: accent, opacity: 0.8}}>:</span>{pad(s)}
              </span>
              <span style={{
                color: text,
                fontSize: V.labelSize,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.3em",
                marginTop: "2.5vmin",
                opacity: 0.35,
              }}>
                {m > 0 ? "min : seg" : "segundos"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Barra lineal de progreso */}
      <div style={{ width: V.barWidth, marginTop: V.barMt }}>
        <div style={{
          height: V.barHeight,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.08)",
        }}>
          <div style={{
            height: "100%",
            borderRadius: 999,
            width: `${progress * 100}%`,
            backgroundColor: accent,
            boxShadow: `0 0 12px ${accent}`,
            transition: "width 1s linear, background-color 0.5s ease",
          }} />
        </div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: V.labelMt,
          fontSize: "1.6vmin",
          opacity: 0.25,
          color: text,
        }}>
          <span>inicio</span>
          <span>{Math.round(progress * 100)}%</span>
          <span>fin</span>
        </div>
      </div>
    </div>
  );
}
