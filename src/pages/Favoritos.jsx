import {useState, useEffect} from "react";
import {FaTrash} from "react-icons/fa";

export default function Favoritos() {
  const [favoritos, setFavoritos] = useState([]);

  useEffect(() => {
    fetchFavoritos();
  }, []);

  const fetchFavoritos = async () => {
    try {
      const data = await window.electron.obtenerFavoritos(); // Supongamos que tienes esta función en tu backend
      setFavoritos(data);
    } catch (error) {
      console.error("Error al obtener los favoritos:", error);
    }
  };

  const handleEliminarFavorito = async (id) => {
    if (
      !window.confirm("¿Seguro que quieres eliminar este himno de favoritos?")
    )
      return;
    try {
      await window.electron.eliminarFavorito(id); // Supongamos que tienes esta función en tu backend
      setFavoritos((prev) => prev.filter((favorito) => favorito.id !== id));
    } catch (error) {
      console.error("Error al eliminar el favorito:", error);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Himnos Favoritos</h1>
        {favoritos.length === 0 ? (
          <p className="text-gray-400">No tienes himnos favoritos aún.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoritos.map((favorito) => (
              <div
                key={favorito.id}
                className="bg-gray-800 p-4 rounded-lg border-2 border-yellow-500 hover:border-yellow-400 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-yellow-300">
                    {favorito.titulo}
                  </h2>
                  <p className="text-gray-400 text-sm">{favorito.numero}</p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => handleEliminarFavorito(favorito.id)}
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
