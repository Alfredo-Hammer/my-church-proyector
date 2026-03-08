import React from "react";
import {useEffect, useState} from "react";
import {motion, AnimatePresence} from "framer-motion";

// ✨ COMPONENTE DE PANTALLA DE BIENVENIDA MODERNA
const ModernWelcomeScreen = ({configuracion}) => {
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
        <motion.div
          className="relative mb-12 group"
          whileHover={{scale: 1.05}}
          transition={{type: "spring", stiffness: 300}}
        >
          {/* Glowing ring effect */}
          <motion.div
            className="absolute inset-0 rounded-full opacity-75"
            style={{
              background: `conic-gradient(from 0deg, ${configuracion.colorPrimario}, transparent, ${configuracion.colorPrimario})`,
              padding: "8px",
              filter: "blur(8px)",
            }}
            animate={{rotate: 360}}
            transition={{duration: 10, repeat: Infinity, ease: "linear"}}
          />

          {/* Inner ring */}
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-white/30"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{duration: 3, repeat: Infinity, ease: "easeInOut"}}
          />

          {/* Logo */}
          <motion.img
            src={configuracion.logoUrl || "/images/icon-256.png"}
            alt="Logo"
            className={`relative ${
              configuracion.logoSize || "w-80 h-80"
            } rounded-full object-cover shadow-2xl border-4 border-white/20 backdrop-blur-sm`}
            initial={{scale: 0.8, opacity: 0}}
            animate={{scale: 1, opacity: 1}}
            transition={{delay: 0.3, duration: 0.8}}
            onError={(e) => {
              e.target.src = "/images/icon-256.png";
            }}
          />

          {/* Floating elements around logo */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/40 rounded-full"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${i * 45}deg) translateY(-140px)`,
              }}
              animate={{
                scale: [1, 1.8, 1],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 2.5,
                delay: i * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Church name with modern typography - Solo si mostrarNombreIglesia está activo */}
      {configuracion.mostrarNombreIglesia !== false && (
        <motion.h1
          initial={{opacity: 0, y: 30}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.6, duration: 0.8}}
          className={`${configuracion.fontSize.titulo} font-black mb-6 text-center max-w-6xl relative`}
          style={{
            background: `linear-gradient(135deg, ${configuracion.colorPrimario}, #ffffff, ${configuracion.colorPrimario})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundSize: "200% 200%",
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
          }}
        >
          <motion.span
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              background: `linear-gradient(135deg, ${configuracion.colorPrimario}, #ffffff, ${configuracion.colorPrimario})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundSize: "200% 200%",
            }}
          >
            {configuracion.nombreIglesia}
          </motion.span>
        </motion.h1>
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

      {/* Animated bottom decoration */}
      <motion.div
        className="absolute bottom-20 flex space-x-4"
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{delay: 1.2, duration: 0.8}}
      >
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="w-3 h-3 bg-white/40 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 2,
              delay: i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

export default ModernWelcomeScreen;
