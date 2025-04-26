import {useParams, useNavigate} from "react-router-dom";
import {useState, useEffect} from "react";
import himnosData from "../data/himnos.json";
import {FaProjectDiagram} from "react-icons/fa";

const HimnoDetalle = () => {
  const {id, numero} = useParams(); // Recibe tanto el id como el numero
  const [himno, setHimno] = useState(null);
  const [selectedParrafo, setSelectedParrafo] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const cargarHimno = async () => {
      try {
        if (numero) {
          const jsonHimno = himnosData.find(
            (h) => h.numero.toString() === numero
          );
          if (jsonHimno) {
            setHimno(jsonHimno);
            return;
          }
        }

        if (id) {
          const himnoDB = await window.electron.obtenerHimnoPorId(id);
          if (himnoDB) {
            setHimno({
              numero: himnoDB.numero,
              titulo: himnoDB.titulo,
              parrafos: himnoDB.letra, // 👈🏻 Aquí corregido
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
  }, [id, numero]);

  const proyectarHimno = () => {
    if (himno) {
      window.electron.abrirProyector();
      window.electron.enviarHimno({
        parrafo: himno.parrafos[selectedParrafo],
        titulo: himno.titulo,
        numero: himno.numero,
      });
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
      <div className="relative flex-grow flex flex-col justify-center items-center text-center">
        <button
          onClick={proyectarHimno}
          className="absolute top-4 right-4 p-2 bg-green-500 rounded-full text-white hover:bg-green-600"
        >
          <FaProjectDiagram size={24} />
        </button>

        <div className="mb-8 w-5/6 mx-auto">
          <h1 className="text-4xl font-bold mb-4">
            {himno.numero}. {himno.titulo}
          </h1>
          <div className="text-3xl max-w-10/12 mx-auto">
            {himno.parrafos[selectedParrafo]}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mb-4">
        {himno.parrafos.map((parrafo, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border max-w-[250px] cursor-pointer ${
              selectedParrafo === index
                ? "bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-white"
                : "bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 text-gray-300"
            } hover:from-gray-800 hover:via-gray-700 hover:to-gray-600`}
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
  );
};

export default HimnoDetalle;
