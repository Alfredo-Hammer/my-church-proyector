import {useState, useEffect} from "react";

const GestionFondos = () => {
  const [fondos, setFondos] = useState([]);
  const [fondoActivo, setFondoActivo] = useState(null);
  const [tabActivo, setTabActivo] = useState("imagen"); // Estado para controlar el tab activo

  useEffect(() => {
    cargarFondos();
  }, []);

  const cargarFondos = async () => {
    try {
      const fondosGuardados = await window.electron.obtenerFondos();
      const activo = await window.electron.obtenerFondoActivo();
      setFondos(fondosGuardados);
      setFondoActivo(activo?.url || null);
    } catch (error) {
      console.error("Error al cargar los fondos:", error);
    }
  };

  const agregarFondoDesdeDispositivo = async () => {
    try {
      const resultado = await window.electron.seleccionarFondo();
      if (!resultado || !resultado.filePath) return;

      const fondosActuales = await window.electron.obtenerFondos();
      const fondoDuplicado = fondosActuales.some(
        (fondo) => fondo.url === resultado.filePath
      );

      if (fondoDuplicado) {
        alert("El fondo ya existe en la base de datos.");
        return;
      }

      await window.electron.agregarFondo({
        url: resultado.filePath,
        tipo: resultado.tipo,
      });

      const fondosActualizados = await window.electron.obtenerFondos();
      setFondos(fondosActualizados);
    } catch (error) {
      console.error("Error al agregar fondo desde dispositivo:", error);
    }
  };

  const eliminarFondo = async (id) => {
    try {
      await window.electron.eliminarFondo(id);
      const fondosActualizados = await window.electron.obtenerFondos();
      setFondos(fondosActualizados);
      if (fondoActivo?.id === id) {
        setFondoActivo(null);
      }
    } catch (error) {
      console.error("Error al eliminar fondo:", error);
    }
  };

  const seleccionarComoActivo = async (id) => {
    try {
      await window.electron.establecerFondoActivo(id);
      const activo = await window.electron.obtenerFondoActivo();
      setFondoActivo(activo?.url || null);

      // Notificar al proceso principal que el fondo activo ha cambiado
      window.electron.notificarFondoActivo({
        url: activo?.url,
        tipo: activo?.tipo,
      });
      console.log("Fondo activo notificado:", {
        url: activo?.url,
        tipo: activo?.tipo,
      });
    } catch (error) {
      console.error("Error al seleccionar fondo como activo:", error);
    }
  };

  return (
    <div className="p-4 bg-zinc-800 text-white h-screen">
      <div className="flex justify-between items-center mb-4">
        {/* Tabs */}
        <div className="flex mb-4 gap-2">
          <button
            onClick={() => setTabActivo("imagen")}
            className={`px-4 py-2 rounded-md ${
              tabActivo === "imagen" ? "bg-blue-600" : "bg-gray-700"
            }`}
          >
            Imágenes
          </button>
          <button
            onClick={() => setTabActivo("video")}
            className={`px-4 py-2 rounded-md ${
              tabActivo === "video" ? "bg-blue-600" : "bg-gray-700"
            }`}
          >
            Videos
          </button>
        </div>

        <button
          onClick={agregarFondoDesdeDispositivo}
          className="bg-green-500 px-4 py-2 rounded"
        >
          Crear Fondo
        </button>
      </div>

      {/* Fondos locales */}
      <div className="grid grid-cols-4 gap-4">
        {fondos.filter((fondo) => fondo.tipo === tabActivo).length === 0 ? (
          <div className="col-span-4 text-center text-gray-400">
            No hay fondos disponibles para mostrar.
          </div>
        ) : (
          fondos
            .filter((fondo) => fondo.tipo === tabActivo) // Filtrar por tipo (imagen o video)
            .map((fondo) => (
              <div
                key={fondo.id}
                className="relative border-2 rounded overflow-hidden border-white"
              >
                {fondo.tipo === "video" ? (
                  <video
                    src={fondo.url}
                    className="w-full h-40 object-cover"
                    autoPlay
                    muted
                    loop
                  />
                ) : (
                  <img
                    src={fondo.url}
                    alt={`Fondo ${fondo.id}`}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => eliminarFondo(fondo.id)}
                    className="bg-red-500 px-2 py-1 text-xs rounded"
                  >
                    Eliminar
                  </button>
                  <button
                    onClick={() => seleccionarComoActivo(fondo.id)}
                    className={`${
                      fondoActivo === fondo.url ? "bg-blue-600" : "bg-gray-700"
                    } px-2 py-1 text-xs rounded`}
                  >
                    {fondoActivo === fondo.url ? "Activo" : "Usar"}
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default GestionFondos;
