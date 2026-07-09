import {useMemo} from "react";

// Animación hiperespacio: luces viajando desde el centro.
// Extraído de TimerDisplay.jsx (donde vivía como HyperSpace, su fondo por
// defecto) para poder reusarlo como fondo animado seleccionable en
// GestionFondos/Proyector. Comportamiento visual sin cambios.
export default function Estrellas() {
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
