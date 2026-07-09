import {useMemo} from "react";

// Fondo animado: brasas/partículas de fuego ascendiendo sobre fondo oscuro,
// con un resplandor cálido al ras del piso. Misma filosofía que el resto de
// fondosAnimados: solo `transform`/opacity animados vía CSS.
export default function Brasas() {
  const particulas = useMemo(() => {
    return Array.from({length: 55}, (_, i) => {
      const left    = Math.random() * 100;
      const size    = 2 + Math.random() * 4.5;
      const dur     = (7 + Math.random() * 6).toFixed(2);
      const delay   = `${-(Math.random() * 12).toFixed(2)}s`;
      const drift   = ((Math.random() - 0.5) * 14).toFixed(1);
      const opacity = 0.35 + Math.random() * 0.45;
      const warm    = Math.random() < 0.7;
      const color   = warm ? "255,140,60" : "255,205,100";
      return {i, left, size, dur, delay, drift, opacity, color};
    });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{background: "#0a0402"}}>
      <style>{`
        @keyframes _brasa {
          0%   { transform: translate(0, 8vh) scale(0.6); opacity: 0; }
          10%  { opacity: var(--bop); }
          80%  { opacity: var(--bop); }
          100% { transform: translate(var(--bdx), -112vh) scale(1.15); opacity: 0; }
        }
        @keyframes _fuego_glow {
          0%,100% { opacity: 0.65; }
          50%     { opacity: 0.92; }
        }
      `}</style>

      {/* Fondo profundo con resplandor cálido en la base */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 100% 55% at 50% 100%, #4a1503 0%, #0a0402 72%)",
      }} />

      {/* Resplandor de la base (como brasas al ras del piso) */}
      <div style={{
        position: "absolute", left: "50%", bottom: "-10%", transform: "translateX(-50%)",
        width: "92vw", height: "36vh", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(255,120,40,0.35) 0%, rgba(255,80,20,0.12) 45%, transparent 75%)",
        animation: "_fuego_glow 7s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* Partículas ascendentes */}
      {particulas.map(({i, left, size, dur, delay, drift, opacity, color}) => (
        <div key={i} style={{
          position: "absolute",
          bottom: 0, left: `${left}%`,
          width: `${size}px`, height: `${size}px`,
          borderRadius: "50%",
          background: `rgba(${color},1)`,
          boxShadow: `0 0 ${size * 2.5}px rgba(${color},0.8)`,
          "--bdx": `${drift}vw`,
          "--bop": opacity,
          animation: `_brasa ${dur}s ${delay} ease-out infinite`,
          willChange: "transform, opacity",
        }} />
      ))}
    </div>
  );
}
