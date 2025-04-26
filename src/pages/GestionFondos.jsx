import {useEffect, useState} from "react";

const GestionFondos = () => {
  const [fondos, setFondos] = useState([]);
  const [fondoActivo, setFondoActivo] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);

  useEffect(() => {
    const cargarFondos = async () => {
      try {
        const fondosGuardados = await window.electron.obtenerFondos();
        const activo = await window.electron.obtenerFondoActivo();
        setFondos(fondosGuardados);
        setFondoActivo(activo);
      } catch (error) {
        console.error("Error al cargar los fondos:", error);
      }
    };
    cargarFondos();
  }, []);

  const fetchImages = async (query) => {
    try {
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${query}&per_page=10`,
        {
          headers: {
            Authorization:
              "zIqOnk9z16U0MrMF47SQnx7h7JiJuSt8Ab31uWGAJMq1nhNfwuXSRUkv", // Reemplaza con tu clave de API
          },
        }
      );
      const data = await response.json();
      setResultadosBusqueda(data.photos);
    } catch (error) {
      console.error("Error al buscar imágenes:", error);
    }
  };

  const agregarFondoDesdeBusqueda = async (url) => {
    try {
      const nuevosFondos = [...fondos, url];
      setFondos(nuevosFondos);
      await window.electron.guardarFondos(nuevosFondos);
    } catch (error) {
      console.error("Error al agregar fondo desde búsqueda:", error);
    }
  };

  const agregarFondo = async () => {
    try {
      const {filePaths} = await window.electron.seleccionarFondo();
      if (filePaths?.length) {
        const nuevosFondos = [...fondos, filePaths[0]];
        setFondos(nuevosFondos);
        await window.electron.guardarFondos(nuevosFondos);
      }
    } catch (error) {
      console.error("Error al agregar fondo:", error);
    }
  };

  const eliminarFondo = async (index) => {
    try {
      const nuevoFondo = fondos.filter((_, i) => i !== index);
      setFondos(nuevoFondo);
      await window.electron.guardarFondos(nuevoFondo);
      if (fondos[index] === fondoActivo) {
        setFondoActivo(null);
        await window.electron.establecerFondoActivo(null);
      }
    } catch (error) {
      console.error("Error al eliminar fondo:", error);
    }
  };

  const seleccionarComoActivo = async (fondo) => {
    try {
      if (
        !fondo ||
        (!fondo.endsWith(".jpg") &&
          !fondo.endsWith(".png") &&
          !fondo.endsWith(".mp4") &&
          !fondo.endsWith(".webm"))
      ) {
        throw new Error("El archivo seleccionado no es un fondo válido.");
      }
      console.log("Seleccionando fondo como activo:", fondo);
      setFondoActivo(fondo);
      await window.electron.establecerFondoActivo(fondo);
      window.electron.send("mostrar-fondo", fondo);
      console.log("Fondo enviado al proyector:", fondo);
    } catch (error) {
      console.error("Error al seleccionar fondo como activo:", error);
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white h-screen">
      <h1 className="text-3xl font-bold mb-4">Gestión de Fondos</h1>
      <button
        onClick={agregarFondo}
        className="bg-green-500 px-4 py-2 rounded mb-4"
      >
        Agregar Fondo
      </button>

      {/* Campo de búsqueda */}
      <div className="mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar imágenes en Pexels"
          className="px-4 py-2 rounded bg-gray-800 text-white w-full"
        />
        <button
          onClick={() => fetchImages(busqueda)}
          className="bg-blue-500 px-4 py-2 rounded mt-2"
        >
          Buscar
        </button>
      </div>

      {/* Resultados de búsqueda */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {resultadosBusqueda.map((foto, index) => (
          <div
            key={index}
            className="relative border-2 rounded overflow-hidden border-white"
          >
            <img
              src={foto.src.medium}
              alt={foto.alt}
              className="w-full h-40 object-cover"
            />
            <button
              onClick={() => agregarFondoDesdeBusqueda(foto.src.original)}
              className="absolute bottom-2 right-2 bg-green-500 px-2 py-1 text-xs rounded"
            >
              Agregar
            </button>
          </div>
        ))}
      </div>

      {/* Fondos locales */}
      <div className="grid grid-cols-3 gap-4">
        {fondos.map((fondo, index) => {
          const esVideo =
            fondo.endsWith(".mp4") ||
            fondo.endsWith(".mov") ||
            fondo.endsWith(".webm");
          const esActivo = fondo === fondoActivo;

          return (
            <div
              key={index}
              className="relative border-2 rounded overflow-hidden border-white"
            >
              {esVideo ? (
                <video
                  src={`file://${fondo}`}
                  className="w-full h-40 object-cover"
                  muted
                  autoPlay
                  loop
                />
              ) : (
                <img
                  src={`file://${fondo}`}
                  alt={`Fondo ${index + 1}`}
                  className="w-full h-40 object-cover"
                />
              )}
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  onClick={() => eliminarFondo(index)}
                  className="bg-red-500 px-2 py-1 text-xs rounded"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => seleccionarComoActivo(fondo)}
                  className={`${
                    esActivo ? "bg-blue-600" : "bg-gray-700"
                  } px-2 py-1 text-xs rounded`}
                >
                  {esActivo ? "Activo" : "Usar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GestionFondos;
