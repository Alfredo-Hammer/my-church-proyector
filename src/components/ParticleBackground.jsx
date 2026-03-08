import React from "react";
import {useEffect, useState} from "react";
import {motion, AnimatePresence} from "framer-motion";

// ✨ COMPONENTE DE PARTÍCULAS ANIMADAS
const ParticleBackground = ({mode, isActive = true}) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!isActive) return;

    const newParticles = Array.from({length: 30}, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 2,
      duration: Math.random() * 3 + 2,
    }));
    setParticles(newParticles);
  }, [mode, isActive]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-5">
      {/* Gradient overlay based on mode */}
      <motion.div
        className={`absolute inset-0 ${
          mode === "bienvenida"
            ? "bg-gradient-to-br from-purple-900/10 via-blue-800/5 to-indigo-900/10"
            : mode === "himno"
            ? "bg-gradient-to-br from-amber-900/10 via-orange-800/5 to-red-900/10"
            : "bg-gradient-to-br from-green-900/10 via-teal-800/5 to-cyan-900/10"
        }`}
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        transition={{duration: 1}}
      />

      {/* Floating particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute bg-white/20 rounded-full backdrop-blur-sm"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.1, 0.6, 0.1],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default ParticleBackground;
