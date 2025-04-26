import {useEffect, useState, useRef} from "react";
import {motion, AnimatePresence} from "framer-motion";

const Proyector = () => {
  const [parrafo, setParrafo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [numero, setNumero] = useState("");
  const [fondo, setFondo] = useState("videos/fondo.mp4");
  const [isFondoReady, setIsFondoReady] = useState(false); // Nuevo estado para controlar el fondo

  const fondoRef = useRef(fondo);

  useEffect(() => {
    fondoRef.current = fondo;
    setIsFondoReady(true); // Marca el fondo como listo cuando cambia
  }, [fondo]);

  useEffect(() => {
    window.electron?.on("mostrar-himno", (event, data) => {
      setParrafo(data.parrafo);
      setTitulo(data.titulo);
      setNumero(data.numero);
    });

    window.electron?.on("mostrar-versiculo", (event, texto) => {
      setTitulo("Versículo Bíblico");
      setParrafo(texto);
      setNumero("");
    });

    window.electron?.on("fondo-seleccionado", (event, filePath) => {
      setFondo(filePath);
    });

    window.electron?.on("mostrar-fondo", (fondoPath) => {
      setFondo(fondoPath);
    });

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        window.electron?.cerrarProyector();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const esVideo = fondoRef.current.match(/\.(mp4|mov|webm)$/i);
  const esImagen = fondoRef.current.match(/\.(jpg|jpeg|png|webp)$/i);

  return (
    <AnimatePresence>
      <motion.div
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        exit={{opacity: 0}}
        transition={{duration: 0.5}}
        className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-8 relative overflow-hidden"
      >
        {/* Fondo */}
        {isFondoReady && esVideo ? (
          <video
            autoPlay
            muted
            loop
            className="absolute inset-0 w-full h-full object-cover -z-10"
            src={fondoRef.current}
            onError={() => console.error("Error al cargar el video")}
            onLoadedData={() => console.log("Video cargado correctamente")}
          />
        ) : isFondoReady && esImagen ? (
          <img
            src={fondoRef.current}
            alt="Fondo personalizado"
            className="absolute inset-0 w-full h-full object-cover -z-10"
          />
        ) : null}

        {/* Número del himno */}
        {numero && (
          <div className="absolute top-4 right-8 text-2xl text-gray-300">
            {numero}
          </div>
        )}

        {/* Título */}
        {titulo && (
          <motion.div
            key={titulo}
            initial={{opacity: 0, y: -30}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: 30}}
            transition={{duration: 0.5}}
            className="text-center mb-6"
          >
            <h1 className="text-6xl font-bold text-orange-400 mb-6">
              {titulo}
            </h1>
          </motion.div>
        )}

        {/* Contenido */}
        <motion.div
          key={parrafo}
          initial={{opacity: 0, y: 30}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: -30}}
          transition={{duration: 0.5}}
          className="w-full max-w-5xl text-center px-6"
        >
          <p className="text-5xl font-semibold leading-tight whitespace-pre-wrap">
            {parrafo}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Proyector;
