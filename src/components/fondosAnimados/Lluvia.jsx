import {useMemo} from "react";

// Fondo animado: gotas de lluvia cayendo sobre fondo oscuro. Misma filosofía
// que Estrellas/RayoDeLuz: solo `transform`/opacity animados vía CSS
// (compositable por GPU, sin requestAnimationFrame), seguro de dejar
// corriendo un culto entero.
export default function Lluvia() {
  const gotas = useMemo(() => {
    return Array.from({length: 90}, (_, i) => {
      const left    = Math.random() * 100;
      const length  = 18 + Math.random() * 46;
      const width   = 1 + Math.random() * 1.6;
      const dur     = (3.2 + Math.random() * 3.4).toFixed(2);
      const delay   = `${-(Math.random() * 5).toFixed(2)}s`;
      const opacity = 0.12 + Math.random() * 0.32;
      return {i, left, length, width, dur, delay, opacity};
    });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{background: "#050a12"}}>
      <style>{`
        @keyframes _gota {
          0%   { transform: translateY(-15vh); opacity: 0; }
          8%   { opacity: var(--gop); }
          88%  { opacity: var(--gop); }
          100% { transform: translateY(115vh); opacity: 0; }
        }
        @keyframes _lluvia_niebla {
          0%,100% { opacity: 0.55; }
          50%     { opacity: 0.8; }
        }
      `}</style>

      {/* Fondo profundo */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 120% 90% at 50% 0%, #0c1c2e 0%, #030509 78%)",
        animation: "_lluvia_niebla 10s ease-in-out infinite",
      }} />

      {/* Resplandor tenue al ras del piso */}
      <div style={{
        position: "absolute", left: "50%", bottom: "-8%", transform: "translateX(-50%)",
        width: "90vw", height: "24vh", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(120,170,255,0.10) 0%, transparent 72%)",
        pointerEvents: "none",
      }} />

      {/* Gotas */}
      {gotas.map(({i, left, length, width, dur, delay, opacity}) => (
        <div key={i} style={{
          position: "absolute",
          top: 0, left: `${left}%`,
          width: `${width}px`, height: `${length}px`,
          borderRadius: "999px",
          background: "linear-gradient(to bottom, transparent, rgba(170,215,255,0.55), rgba(200,230,255,0.8))",
          boxShadow: "0 0 6px rgba(170,215,255,0.25)",
          "--gop": opacity,
          animation: `_gota ${dur}s ${delay} ease-in infinite`,
          willChange: "transform, opacity",
        }} />
      ))}
    </div>
  );
}
