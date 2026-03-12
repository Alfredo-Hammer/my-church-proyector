import {motion} from "framer-motion";

// ✨ COMPONENTE DE PANTALLA DE BIENVENIDA MODERNA
const ModernWelcomeScreen = ({configuracion}) => {
  const colorPrimario = configuracion?.colorPrimario || "#fb923c";

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      initial={{opacity: 0, scale: 0.8}}
      animate={{opacity: 1, scale: 1}}
      exit={{opacity: 0, scale: 0.8}}
      transition={{duration: 1, ease: "easeOut"}}
    >
      {/* Logo container con efectos modernos - Solo si mostrarLogo está activo */}
      {configuracion.mostrarLogo !== false && (
        <div
          className={`relative mb-12 ${
            configuracion.logoSize || "w-80 h-80"
          } rounded-full`}
        >
          {/* Borde neón (sin fondo) */}
          <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-emerald-300/80 shadow-lg shadow-emerald-500/30" />
          <div className="pointer-events-none absolute inset-0 rounded-full ring-8 ring-emerald-400/10 blur-md" />

          {/* Logo (mantener transparencia y forma circular) */}
          <div className="relative w-full h-full rounded-full overflow-hidden">
            <img
              src={configuracion.logoUrl || "/images/icon-256.png"}
              alt="Logo"
              className="w-full h-full rounded-full object-contain"
              onError={(e) => {
                e.target.src = "/images/icon-256.png";
              }}
            />
          </div>
        </div>
      )}

      {/* Church name with modern typography - Solo si mostrarNombreIglesia está activo */}
      {configuracion.mostrarNombreIglesia !== false && (
        <h1
          className={`${configuracion.fontSize.titulo} font-black mb-6 text-center max-w-6xl relative`}
          style={{
            background: "none",
            backgroundColor: "transparent",
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
          }}
        >
          <span
            style={{
              display: "inline-block",
              backgroundColor: "transparent",
              backgroundImage: `linear-gradient(135deg, ${colorPrimario}, #ffffff, ${colorPrimario})`,
              backgroundSize: "200% 200%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
              willChange: "transform",
              transform: "translateZ(0)",
              backfaceVisibility: "hidden",
            }}
          >
            {configuracion.nombreIglesia}
          </span>
        </h1>
      )}

      {/* Slogan with glass morphism effect - Solo si mostrarEslogan está activo */}
      {configuracion.mostrarEslogan !== false && (
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.9, duration: 0.8}}
          className="backdrop-blur-md bg-white/10 rounded-2xl px-8 py-4 border border-white/20 shadow-2xl"
        >
          <p
            className={`${configuracion.fontSize.eslogan} font-medium text-center`}
            style={{
              color: configuracion.colorSecundario,
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            {configuracion.eslogan}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ModernWelcomeScreen;
