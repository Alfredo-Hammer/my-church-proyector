import {useState, useEffect} from "react";
import {FaTrash} from "react-icons/fa";
import {useNavigate} from "react-router-dom";
import {toast} from "react-toastify";

export default function Favoritos() {
  const [favoritos, setFavoritos] = useState([]);
  const [himno, setHimno] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFavoritos();
  }, []);

  const fetchFavoritos = async () => {
    try {
      const data = await window.electron.obtenerFavoritos(); // Obtener los favoritos desde el backend
      setFavoritos(data);
    } catch (error) {
      console.error("Error al obtener los favoritos:", error);
    }
  };

  const handleEliminarFavorito = async (id) => {
    console.log("Intentando eliminar favorito con ID:", id); // Verificar si se llama
    if (
      !window.confirm("¿Seguro que quieres eliminar este himno de favoritos?")
    )
      return;
    try {
      await window.electron.eliminarFavorito(id); // Eliminar el favorito del backend
      toast.success("Himno eliminado de favoritos");
      setFavoritos((prev) => prev.filter((favorito) => favorito.id !== id)); // Actualizar el estado local
    } catch (error) {
      console.error("Error al eliminar el favorito:", error);
    }
  };

  const handleNavigate = (id) => {
    navigate(`/himno-detalle/${id}`);
  };

  return (
    <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-black text-white min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-grey-400 mb-6">
          Himnos Favoritos
        </h1>
        {favoritos.length === 0 ? (
          <p className="text-gray-400">No tienes himnos favoritos aún.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoritos.map((favorito) => (
              <div
                key={favorito.id}
                className="bg-gray-800 p-4 rounded-lg border-2 border-gray-400 hover:border-blue-300 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                onClick={() => handleNavigate(favorito.id)}
              >
                <div className="mb-4 cursor-pointer">
                  <h2 className="text-xl font-bold text-blue-300">
                    {favorito.titulo}
                  </h2>
                  <p className="text-gray-400 text-sm">{favorito.numero}</p>
                </div>
                <div className="flex justify-between items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Evitar que el clic navegue al detalle
                      handleEliminarFavorito(favorito.id);
                    }}
                    className="text-red-500 hover:text-red-400"
                  >
                    <FaTrash size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
