import React from "react";
import {useEffect, useState, useRef} from "react";
import {motion, AnimatePresence} from "framer-motion";

// ✨ COMPONENTE DE TEXTO MODERNO
const ModernTextDisplay = ({
  titulo,
  parrafo,
  numero,
  configuracion,
  mostrarTitulo = true, // Ahora controla si mostrar título ARRIBA del párrafo (para versículos)
}) => {
  // ✨ Ajustar tamaño de fuente según longitud del párrafo
  const calcularTamañoTexto = (texto) => {
    const longitud = texto?.length || 0;

    // Si el párrafo es muy largo, reducir el tamaño
    if (longitud > 400) return "text-4xl"; // Muy largo
    if (longitud > 300) return "text-5xl"; // Largo
    if (longitud > 200) return "text-6xl"; // Medio-largo
    if (longitud > 100) return configuracion.fontSize.parrafo || "text-7xl"; // Normal
    return configuracion.fontSize.parrafo || "text-7xl"; // Corto
  };

  const tamañoParrafo = calcularTamañoTexto(parrafo);

  return (
    <motion.div
      initial={{opacity: 0, y: 50, scale: 0.95}}
      animate={{opacity: 1, y: 0, scale: 1}}
      exit={{opacity: 0, y: -50, scale: 0.95}}
      transition={{duration: 0.8, ease: "easeOut"}}
      className="text-center z-10 relative max-w-7xl mx-auto px-8"
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl blur-2xl scale-110" />

      {/* Title with enhanced styling - Solo mostrar si mostrarTitulo es true */}
      {mostrarTitulo && (
        <motion.h1
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: -20}}
          transition={{delay: 0.2, duration: 0.6}}
          className={`${configuracion.fontSize.titulo} font-black mb-8 relative`}
          style={{
            background: `linear-gradient(135deg, ${configuracion.colorPrimario}, #fff, ${configuracion.colorPrimario})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundSize: "200% 200%",
            textShadow: "0 4px 20px rgba(0,0,0,0.4)",
            filter: "drop-shadow(0 0 20px rgba(255,255,255,0.2))",
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
              background: `linear-gradient(135deg, ${configuracion.colorPrimario}, #fff, ${configuracion.colorPrimario})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundSize: "200% 200%",
            }}
          >
            {titulo}
          </motion.span>
        </motion.h1>
      )}

      {/* Content with enhanced glass morphism */}
      <motion.div
        initial={{opacity: 0, scale: 0.9}}
        animate={{opacity: 1, scale: 1}}
        transition={{delay: mostrarTitulo ? 0.4 : 0.2, duration: 0.6}}
        className="backdrop-blur-xl bg-gradient-to-br from-white/15 to-white/5 rounded-3xl p-8 md:p-12 border border-white/20 shadow-2xl relative overflow-hidden"
        style={{
          maxHeight: mostrarTitulo ? "65vh" : "80vh", // Más espacio sin título
        }}
      >
        {/* Animated border */}
        <div className="absolute inset-0 rounded-3xl">
          <div className="absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-r from-white/20 via-transparent to-white/20 bg-clip-border animate-pulse" />
        </div>

        <motion.div
          key={parrafo}
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5}}
          className="relative z-10 flex items-center justify-center"
          style={{
            minHeight: mostrarTitulo ? "auto" : "60vh", // Centrar verticalmente sin título
          }}
        >
          <p
            className={`${tamañoParrafo} font-semibold leading-relaxed whitespace-pre-wrap`}
            style={{
              color: configuracion.colorSecundario,
              textShadow: "0 3px 15px rgba(0,0,0,0.6)",
              lineHeight: 1.5,
              overflowY: "auto",
              maxHeight: mostrarTitulo ? "60vh" : "75vh",
            }}
          >
            {parrafo}
          </p>
        </motion.div>
      </motion.div>

      {/* Decorative corner elements */}
      <motion.div
        className="absolute -top-6 -left-6 w-12 h-12 bg-gradient-to-br from-yellow-400/30 to-orange-500/30 rounded-full blur-sm"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{duration: 3, repeat: Infinity, ease: "easeInOut"}}
      />
      <motion.div
        className="absolute -bottom-6 -right-6 w-8 h-8 bg-gradient-to-br from-blue-400/30 to-purple-500/30 rounded-full blur-sm"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />
    </motion.div>
  );
};

export default ModernTextDisplay;
