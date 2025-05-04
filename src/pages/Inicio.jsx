import React, {useState, useEffect} from "react";

const Inicio = () => {
  const [mensaje, setMensaje] = useState("");
  const [fechaHora, setFechaHora] = useState("");

  // Actualizar el mensaje de bienvenida según la hora
  useEffect(() => {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) {
      setMensaje("Buenos días");
    } else if (hora >= 12 && hora < 18) {
      setMensaje("Buenas tardes");
    } else {
      setMensaje("Buenas noches");
    }
  }, []);

  // Actualizar la fecha y hora cada segundo
  useEffect(() => {
    const intervalo = setInterval(() => {
      const ahora = new Date();
      const opcionesFecha = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      const fecha = ahora.toLocaleDateString("es-ES", opcionesFecha);
      const hora = ahora.toLocaleTimeString("es-ES");
      setFechaHora(`${fecha} - ${hora}`);
    }, 1000);

    return () => clearInterval(intervalo); // Limpiar el intervalo al desmontar el componente
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Video de fondo */}
      <video
        className="absolute top-0 left-0 w-full h-full object-cover"
        src="/videos/fondo.mp4" // Ruta del video
        autoPlay
        loop
        muted
      ></video>

      {/* Contenido superpuesto */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
        {/* Logo de la iglesia */}
        <div className="absolute top-4 right-4">
          <img
            src="https://3.bp.blogspot.com/-iajkshTxbeI/WnDdQ0q1urI/AAAAAAAAAyo/1OpK28M8HUQmR7EW4a2PG8ldnhLl3ukiwCLcBGAs/s1600/Logo%2BIglesia%2BMorava.jpg" // Ruta del logo
            alt="Logo Iglesia"
            className="w-20 h-20 md:w-24 md:h-24 hover:scale-110 transition-transform duration-300 rounded-full"
          />
        </div>

        {/* Mensaje de bienvenida */}
        <h1 className="text-5xl font-extrabold mb-4 text-yellow-400 drop-shadow-lg">
          {mensaje}
        </h1>
        <h2 className="text-3xl mb-6 text-white font-semibold drop-shadow-lg">
          Bienvenido a la Iglesia Morava
        </h2>

        {/* Ubicación */}
        <h3 className="text-lg mb-8 text-gray-300 italic">Sarasota, Florida</h3>

        {/* Fecha y hora */}
        <div className="text-center text-lg bg-gray-900 bg-opacity-80 px-6 py-3 rounded-lg shadow-lg">
          <p className="text-yellow-300 font-medium">{fechaHora}</p>
        </div>
      </div>
    </div>
  );
};

export default Inicio;
