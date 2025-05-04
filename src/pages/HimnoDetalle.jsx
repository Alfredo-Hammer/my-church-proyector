import {useParams, useNavigate, useLocation} from "react-router-dom";
import {useState, useEffect} from "react";
import himnosData from "../data/himnos.json";
import vidacristianaData from "../data/vidacristiana.json";
import {FaProjectDiagram, FaStar, FaHeart, FaRegHeart} from "react-icons/fa";
import {toast} from "react-toastify";

const coloresGradientes = [
  "bg-gradient-to-r from-red-500 to-red-700",
  "bg-gradient-to-r from-blue-500 to-blue-700",
  "bg-gradient-to-r from-green-500 to-green-700",
  "bg-gradient-to-r from-yellow-500 to-yellow-700",
  "bg-gradient-to-r from-purple-500 to-purple-700",
  "bg-gradient-to-r from-pink-500 to-pink-700",
  "bg-gradient-to-r from-indigo-500 to-indigo-700",
  "bg-gradient-to-r from-teal-500 to-teal-700",
];

const HimnoDetalle = () => {
  const {id, numero} = useParams(); // Recibe tanto el id como el numero
  const {state} = useLocation(); // 👈 Aquí leemos el "state"
  const [himno, setHimno] = useState(null);
  const [selectedParrafo, setSelectedParrafo] = useState(0);
  const [favoritos, setFavoritos] = useState([]); // Estado para favoritos
  const navigate = useNavigate();

  useEffect(() => {
    const cargarHimno = async () => {
      try {
        if (numero) {
          if (state?.tipo === "vidaCristiana") {
            // 👈 Si viene de vidaCristiana
            const vidaCristianaHimno = vidacristianaData.find(
              (h) => h.numero.toString() === numero
            );
            if (vidaCristianaHimno) {
              setHimno(vidaCristianaHimno);
              return;
            }
          } else {
            // 👈 Si viene de himnos normales
            const jsonHimno = himnosData.find(
              (h) => h.numero.toString() === numero
            );
            if (jsonHimno) {
              setHimno(jsonHimno);
              return;
            }
          }
        }

        if (id) {
          const himnoDB = await window.electron.obtenerHimnoPorId(id);
          if (himnoDB) {
            setHimno({
              numero: himnoDB.numero,
              titulo: himnoDB.titulo,
              parrafos: himnoDB.letra,
            });
            return;
          }
        }

        throw new Error("Himno no encontrado");
      } catch (error) {
        console.error("Error al cargar el himno:", error);
        setHimno(null);
      }
    };

    cargarHimno();
  }, [id, numero, state]);

  useEffect(() => {
    fetchFavoritos(); // Cargar favoritos al inicio
  }, []);

  const proyectarHimno = () => {
    if (himno) {
      window.electron.abrirProyector();
      window.electron.enviarHimno({
        parrafo: himno.parrafos[selectedParrafo],
        titulo: himno.titulo,
        numero: himno.numero,
        origen: "himno",
      });
    }
  };

  const fetchFavoritos = async () => {
    try {
      const data = await window.electron.obtenerFavoritos(); // Obtener favoritos del backend
      setFavoritos(data.map((fav) => fav.id)); // Guardar solo los IDs de los favoritos
    } catch (error) {
      console.error("Error al obtener los favoritos:", error);
    }
  };

  const toggleFavorito = async (id) => {
    try {
      if (favoritos.includes(id)) {
        // Si ya está en favoritos, eliminar
        await window.electron.marcarFavorito(id, false); // Cambié esto
        setFavoritos((prev) => prev.filter((favId) => favId !== id));
        toast.info("Himno eliminado de favoritos.");
      } else {
        // Si no está en favoritos, agregar
        await window.electron.marcarFavorito(id, true); // Cambié esto
        setFavoritos((prev) => [...prev, id]);
        toast.success("Himno agregado a favoritos.");
      }
    } catch (error) {
      console.error("Error al actualizar favoritos:", error);
      toast.error("Ocurrió un error al actualizar favoritos.");
    }
  };
  const handleKeyDown = (e) => {
    if (!himno) return;

    if (["ArrowUp", "ArrowLeft"].includes(e.key)) {
      setSelectedParrafo((prev) => {
        const newIndex = Math.max(0, prev - 1);
        window.electron.enviarHimno({
          parrafo: himno.parrafos[newIndex],
          titulo: himno.titulo,
          numero: himno.numero,
        });
        return newIndex;
      });
    }

    if (["ArrowDown", "ArrowRight"].includes(e.key)) {
      setSelectedParrafo((prev) => {
        const newIndex = Math.min(himno.parrafos.length - 1, prev + 1);
        window.electron.enviarHimno({
          parrafo: himno.parrafos[newIndex],
          titulo: himno.titulo,
          numero: himno.numero,
        });
        return newIndex;
      });
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [himno]);

  if (!himno) {
    return (
      <div className="text-white bg-gray-900 h-screen flex flex-col items-center justify-center">
        <p>Himno no encontrado</p>
        <button
          onClick={() => navigate("/agregar-himno")}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Volver a la lista
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 h-screen flex flex-col justify-between bg-gray-900 text-white">
      {/* Contenedor superior: Título y párrafo centrados */}
      <div className="flex-grow flex flex-col justify-center items-center text-center">
        <div className="absolute top-4 right-4 flex gap-4 mr-7">
          {/* Botón para proyectar */}
          <button
            onClick={proyectarHimno}
            className="p-2 bg-green-500 rounded-full text-white hover:bg-green-600"
          >
            <FaProjectDiagram size={24} />
          </button>

          {/* Botón para agregar o quitar de favoritos */}
          <button
            onClick={() => toggleFavorito(himno.id)}
            className={`p-2 rounded-full ${
              favoritos.includes(himno.id)
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {favoritos.includes(himno.id) ? (
              <FaHeart size={20} />
            ) : (
              <FaRegHeart size={20} />
            )}
          </button>
        </div>

        <div className="mb-8 w-5/6 mx-auto">
          <h1 className="text-4xl font-bold mb-4 text-orange-200">
            {himno.titulo}
          </h1>
          <p className="text-xl text-red-300 mb-4">{himno.numero}</p>
          <div className="text-3xl max-w-screen-md mx-auto text-blue-100">
            {himno.parrafos[selectedParrafo]}
          </div>
        </div>
      </div>

      {/* Contenedor inferior: Tarjetas en miniatura */}
      <div className="flex justify-center items-center">
        <div className="flex gap-4 mb-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          {himno.parrafos.map((parrafo, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border max-w-[280px] justify-center cursor-pointer ${
                selectedParrafo === index
                  ? "text-white border-4 border-yellow-400"
                  : "text-gray-300 border border-gray-600"
              } hover:opacity-90 transition-all duration-300 ${
                coloresGradientes[index % coloresGradientes.length]
              }`}
              onClick={() => {
                setSelectedParrafo(index);
                window.electron.enviarHimno({
                  parrafo,
                  titulo: himno.titulo,
                  numero: himno.numero,
                });
              }}
            >
              <p className="text-sm">{parrafo}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HimnoDetalle;
