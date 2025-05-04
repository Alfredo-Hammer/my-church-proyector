import {useEffect, useState, useRef} from "react";
import {motion, AnimatePresence} from "framer-motion";

const Proyector = () => {
  const [parrafo, setParrafo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [numero, setNumero] = useState("");
  const [fondo, setFondo] = useState("videos/fondo.mp4"); // Video por defecto
  const [fondoActivo, setFondoActivo] = useState({
    url: "videos/fondo.mp4",
    tipo: "video",
  });

  const fondoRef = useRef(fondo);

  useEffect(() => {
    fondoRef.current = fondo;
  }, [fondo]);

  useEffect(() => {
    // Escuchar eventos desde el proceso principal
    window.electron?.on("mostrar-himno", (event, data) => {
      setParrafo(data.parrafo);
      setTitulo(data.titulo);
      setNumero(data.numero);
    });

    window.electron?.on(
      "mostrar-versiculo",
      (event, {parrafo, titulo, numero, origen}) => {
        if (origen === "biblia") {
          // Si los datos vienen de Biblia.jsx, mostrar el título con el número
          setTitulo(`${titulo} ${numero}`); // Ejemplo: "Mateo 12:5"
          setParrafo(parrafo || "No disponible");
          setNumero(""); // No mostrar el número por separado
        } else if (origen === "himno") {
          // Si los datos vienen de HimnoDetalle.jsx, mostrar como himno
          setTitulo(titulo || "Himno");
          setParrafo(parrafo || "No disponible");
          setNumero(numero || "");
        }
      }
    );
    // window.electron?.on(
    //   "mostrar-versiculo",
    //   (event, {parrafo, titulo, numero}) => {
    //     setTitulo(titulo || "Versículo Bíblico");
    //     setParrafo(parrafo || "No disponible");
    //     setNumero(numero || "");
    //   }
    // );

    window.electron?.on("fondo-seleccionado", (event, filePath) => {
      setFondo(filePath);
    });

    window.electron?.on("mostrar-fondo", (fondoPath) => {
      setFondo(fondoPath);
    });

    window.electron?.onFondoActivoCambiado((fondo) => {
      setFondoActivo(fondo);
    });

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        window.electron?.cerrarProyector();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.electron?.removeFondoActivoListener();
      window.electron?.removeAllListeners("mostrar-versiculo");
    };
  }, []);

  useEffect(() => {
    // Escuchar el evento desde el proceso principal
    window.electron?.on("actualizar-fondo-activo", (event, fondo) => {
      console.log("Fondo activo recibido en Proyector.jsx:", fondo);
      if (fondo && fondo.url) {
        setFondoActivo(fondo); // Usar la ruta directamente
      } else {
        console.log("No hay fondo activo, usando el video por defecto.");
        setFondoActivo({url: "videos/fondo.mp4", tipo: "video"});
      }
    });

    return () => {
      window.electron?.removeAllListeners("actualizar-fondo-activo");
    };
  }, []);

  const esVideo = (url) => url?.match(/\.(mp4|mov|webm)$/i);
  const esImagen = (url) => url?.match(/\.(jpg|jpeg|png|webp)$/i);

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
        {fondoActivo ? (
          fondoActivo.tipo === "video" ? (
            <video
              src={fondoActivo.url}
              className="absolute inset-0 w-full h-full object-cover -z-10"
              autoPlay
              muted
              loop
            />
          ) : (
            <img
              src={fondoActivo.url}
              alt="Fondo activo"
              className="absolute inset-0 w-full h-full object-cover -z-10"
            />
          )
        ) : (
          <video
            src="videos/fondo.mp4"
            className="absolute inset-0 w-full h-full object-cover -z-10"
            autoPlay
            muted
            loop
          />
        )}

        {/* Número del himno */}
        {numero && (
          <div className="absolute top-4 right-8 text-2xl text-gray-300">
            {numero}
          </div>
        )}

        {/* Título */}
        {titulo && (
          <h1 className="text-6xl font-bold text-orange-400 mb-6">{titulo}</h1>
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
          <p className="text-6xl font-semibold leading-tight whitespace-pre-wrap">
            {parrafo}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Proyector;
