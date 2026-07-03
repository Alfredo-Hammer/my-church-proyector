import {useMemo} from "react";

const pad = (n) => String(n).padStart(2, "0");

function getColor(segundos, terminado) {
  if (terminado) return {accent: "#10b981", text: "#d1fae5", glow: "0 0 60px #10b98180"};
  if (segundos <= 30) return {accent: "#ef4444", text: "#fee2e2", glow: "0 0 60px #ef444480"};
  if (segundos <= 60) return {accent: "#f59e0b", text: "#fef3c7", glow: "0 0 60px #f59e0b80"};
  return {accent: "#6366f1", text: "#e0e7ff", glow: "0 0 80px #6366f160"};
}

const V = {
  ringSize:    "68vmin",
  fontSize:    "14vmin",
  fontSizeYa:  "13vmin",
  labelSize:   "1.8vmin",
  mensajeSize: "3.8vmin",
  mensajeMb:   "4vmin",
};

// ── Animación hiperespacio: luces viajando desde el centro ─────────────────
function HyperSpace() {
  const streaks = useMemo(() => {
    return Array.from({length: 90}, (_, i) => {
      const angle   = (i / 90) * 360 + (Math.random() - 0.5) * 4;
      const rad     = (angle * Math.PI) / 180;
      // distancia final fuera de pantalla
      const dist    = 65 + Math.random() * 55;
      const dx      = Math.cos(rad) * dist;
      const dy      = Math.sin(rad) * dist;
      // longitud del trazo: se alarga con la distancia
      const length  = 2 + Math.random() * 14;
      const width   = 0.6 + Math.random() * 1.1;
      const dur     = (0.8 + Math.random() * 1.6).toFixed(2);
      const delay   = `${-(Math.random() * 3).toFixed(2)}s`;
      const opacity = 0.35 + Math.random() * 0.55;
      // color: mayoría blanco-azulado, algunos cálidos
      const warm    = Math.random() < 0.12;
      const color   = warm ? "255,210,170" : "200,215,255";
      return {i, dx, dy, length, width, dur, delay, opacity, color, angle, rad};
    });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{background: "#02050d"}}>
      <style>{`
        @keyframes _hyper {
          0%   { transform: translate(0,0) scaleX(0.04); opacity: 0; }
          8%   { opacity: var(--hop); }
          85%  { opacity: var(--hop); }
          100% { transform: translate(var(--hdx), var(--hdy)) scaleX(1); opacity: 0; }
        }
        @keyframes _nebula {
          0%,100% { opacity: 0.6; transform: scale(1); }
          50%     { opacity: 0.85; transform: scale(1.04); }
        }
      `}</style>

      {/* Fondo profundo */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 120% 120% at 50% 50%, #0d1f42 0%, #010306 75%)",
        animation: "_nebula 9s ease-in-out infinite",
      }} />

      {/* Luz central tenue */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        width: "30vmin", height: "30vmin",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(100,130,255,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Trazos de luz */}
      {streaks.map(({i, dx, dy, length, width, dur, delay, opacity, color, angle}) => (
        <div key={i} style={{
          position: "absolute",
          left: "50%", top: "50%",
          width: `${length}px`, height: `${width}px`,
          marginLeft: `-${length / 2}px`,
          marginTop: `-${width / 2}px`,
          borderRadius: "50%",
          background: `rgba(${color}, ${opacity})`,
          boxShadow: `0 0 ${width * 3}px rgba(${color}, 0.4)`,
          transformOrigin: "left center",
          transform: `rotate(${angle}deg)`,
          "--hdx": `${dx}vw`,
          "--hdy": `${dy}vh`,
          "--hop": opacity,
          animation: `_hyper ${dur}s ${delay} linear infinite`,
          willChange: "transform, opacity",
        }} />
      ))}
    </div>
  );
}

const SVG_SW = 6;

export default function TimerDisplay({
  segundos  = 0,
  total     = 600,
  mensaje   = "",
  terminado = false,
  fondo     = null,
}) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;

  const VB = 220, R = 100, cx = VB / 2, cy = VB / 2;
  const circumference = 2 * Math.PI * R;
  const progress   = total > 0 ? Math.max(0, Math.min(1, segundos / total)) : 0;
  const dashOffset = circumference * (1 - progress);

  const {accent, text, glow} = useMemo(() => getColor(segundos, terminado), [segundos, terminado]);

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center select-none overflow-hidden">

      {/* ── Fondo ── */}
      {fondo ? (
        <>
          {fondo.tipo === "video" ? (
            <video key={fondo.url} src={fondo.url} autoPlay loop muted playsInline
              className="absolute inset-0 w-full h-full object-cover" style={{zIndex: 0}} />
          ) : (
            <img key={fondo.url} src={fondo.url} alt=""
              className="absolute inset-0 w-full h-full object-cover" style={{zIndex: 0}} />
          )}
          <div className="absolute inset-0" style={{
            zIndex: 1,
            background: `radial-gradient(ellipse 90% 80% at 50% 50%, ${accent}20 0%, transparent 65%), rgba(0,0,0,0.52)`,
          }} />
        </>
      ) : (
        <HyperSpace />
      )}

      {/* ── Reloj ── */}
      <div className="relative flex flex-col items-center justify-center w-full h-full" style={{zIndex: 2}}>

        {mensaje && (
          <p style={{
            color: text,
            fontSize: V.mensajeSize,
            marginBottom: V.mensajeMb,
            fontWeight: 300,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            opacity: 0.75,
          }}>
            {mensaje}
          </p>
        )}

        {/* Anillo */}
        <div style={{position: "relative", width: V.ringSize, height: V.ringSize}}>
          <svg viewBox={`0 0 ${VB} ${VB}`} style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            filter: `drop-shadow(${glow})`, overflow: "visible",
          }}>
            <circle cx={cx} cy={cy} r={R} fill="none"
              stroke="rgba(255,255,255,0.07)" strokeWidth={SVG_SW} />
            <circle cx={cx} cy={cy} r={R} fill="none"
              stroke={accent} strokeWidth={SVG_SW} strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{transition: "stroke-dashoffset 1s linear, stroke 0.5s ease"}}
            />
          </svg>

          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            {terminado ? (
              <span style={{
                color: accent, fontSize: V.fontSizeYa, fontWeight: 900,
                lineHeight: 1, textShadow: glow, transition: "color 0.5s ease",
              }}>¡Ya!</span>
            ) : (
              <>
                <span style={{
                  color: text, fontSize: V.fontSize, fontWeight: 900,
                  letterSpacing: "0.04em", lineHeight: 1, textShadow: glow,
                  fontVariantNumeric: "tabular-nums",
                  transition: "color 0.5s ease, text-shadow 0.5s ease",
                }}>
                  {pad(m)}<span style={{color: accent, opacity: 0.8}}>:</span>{pad(s)}
                </span>
                <span style={{
                  color: text, fontSize: V.labelSize, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: "0.3em",
                  marginTop: "2.5vmin", opacity: 0.35,
                }}>
                  {m > 0 ? "min : seg" : "segundos"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
