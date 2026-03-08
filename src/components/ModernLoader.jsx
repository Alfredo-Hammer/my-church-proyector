import React from "react";
import {FaMusic, FaBook, FaProjectDiagram} from "react-icons/fa";

const ModernLoader = ({type = "default", message = "Cargando..."}) => {
  // Seleccionar icono según el tipo
  const getIcon = () => {
    switch (type) {
      case "himnos":
        return <FaMusic className="text-6xl" />;
      case "vida-cristiana":
        return <FaBook className="text-6xl" />;
      case "proyector":
        return <FaProjectDiagram className="text-6xl" />;
      default:
        return <FaMusic className="text-6xl" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Círculos animados de fondo */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          {/* Círculo exterior */}
          <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full animate-ping"></div>

          {/* Círculo medio */}
          <div className="absolute inset-4 border-4 border-purple-500/40 rounded-full animate-pulse"></div>

          {/* Círculo interior con gradiente */}
          <div className="absolute inset-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl animate-bounce">
            <div className="text-white">{getIcon()}</div>
          </div>
        </div>

        {/* Texto de carga */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white">{message}</h2>

          {/* Barra de progreso animada */}
          <div className="w-64 h-2 bg-gray-700 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-loader-bar"></div>
          </div>

          {/* Puntos animados */}
          <div className="flex justify-center space-x-2">
            <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce"></div>
            <div
              className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"
              style={{animationDelay: "0.1s"}}
            ></div>
            <div
              className="w-3 h-3 bg-pink-400 rounded-full animate-bounce"
              style={{animationDelay: "0.2s"}}
            ></div>
          </div>

          <p className="text-gray-400 text-sm">
            Por favor espera un momento...
          </p>
        </div>
      </div>

      {/* Estilos de animación personalizados */}
      <style jsx>{`
        @keyframes loader-bar {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-loader-bar {
          animation: loader-bar 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ModernLoader;
