import React from "react";

const Inicio = () => {
  return (
    <div className="relative h-screen w-screen overflow-hidden m-0 p-0">
      {/* Video de fondo */}
      <video
        className="absolute top-0 left-0 w-full h-full object-cover"
        src="/videos/fondo.mp4" // Ruta del video
        autoPlay
        loop
        muted
      ></video>

      {/* Contenido superpuesto */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white bg-black bg-opacity-50">
        <h1 className="text-4xl font-bold mb-4">IGLESIA MORAVA DE NICARAGUA</h1>
        <p className="text-lg mb-6 w-6/12 mx-auto text-center">
          Bienvenido a la aplicación de Himnos de la Iglesia Morava de
          Nicaragua. Aquí podrás encontrar una colección de himnos para tu
          edificación espiritual.
        </p>
      </div>

      {/* Filtro oscuro para mejorar el contraste */}
      <div className="absolute top-0 left-0 w-full h-full bg-black opacity-30"></div>
    </div>
  );
};

export default Inicio;
