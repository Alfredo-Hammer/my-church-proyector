// Fondo animado: rayos de luz girando lentamente desde una fuente central,
// sobre fondo oscuro. Dos capas de "spokes" (repeating-conic-gradient) con
// distinto tono/velocidad/sentido de giro dan profundidad sin animar más
// que `transform` (compositable por GPU, igual filosofía que Estrellas.jsx —
// sin requestAnimationFrame, seguro para dejarlo corriendo un culto entero).
export default function RayoDeLuz() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{background: "#04060d"}}>
      <style>{`
        @keyframes _rdl_girar1 {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes _rdl_girar2 {
          from { transform: translate(-50%, -50%) rotate(360deg); }
          to   { transform: translate(-50%, -50%) rotate(0deg); }
        }
        @keyframes _rdl_pulso {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 0.9; }
        }
      `}</style>

      {/* Fondo profundo */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 100% 85% at 50% 36%, #0c1733 0%, #02040a 72%)",
      }} />

      {/* Rayos — dos capas girando en sentidos opuestos, distinta velocidad y tono */}
      <div style={{
        position: "absolute", left: "50%", top: "36%",
        width: "170vmax", height: "170vmax",
        background: "repeating-conic-gradient(rgba(255,224,170,0.11) 0deg 2.2deg, transparent 2.2deg 21deg)",
        animation: "_rdl_girar1 100s linear infinite",
        mixBlendMode: "screen",
      }} />
      <div style={{
        position: "absolute", left: "50%", top: "36%",
        width: "150vmax", height: "150vmax",
        background: "repeating-conic-gradient(rgba(160,195,255,0.07) 0deg 1.6deg, transparent 1.6deg 17deg)",
        animation: "_rdl_girar2 140s linear infinite",
        mixBlendMode: "screen",
      }} />

      {/* Halo central (la fuente de luz) */}
      <div style={{
        position: "absolute", left: "50%", top: "36%", transform: "translate(-50%, -50%)",
        width: "42vmin", height: "42vmin", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,238,205,0.28) 0%, rgba(255,205,150,0.10) 45%, transparent 72%)",
        animation: "_rdl_pulso 7s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* Viñeta para profundidad y contraste con el texto proyectado */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 120% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}
