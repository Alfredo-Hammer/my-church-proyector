// src/pages/AgregarHimno.jsx
import {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {toast, ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {FaEdit, FaTrash, FaHeart, FaRegHeart} from "react-icons/fa"; // Importar íconos

export default function AgregarHimno() {
  const [himnos, setHimnos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [numero, setNumero] = useState("");
  const [titulo, setTitulo] = useState("");
  const [letra, setLetra] = useState("");
  const [editId, setEditId] = useState(null);
  const [favoritos, setFavoritos] = useState([]); // Estado para favoritos
  const navigate = useNavigate();

  useEffect(() => {
    fetchHimnos();
    fetchFavoritos(); // Cargar favoritos al inicio
  }, []);

  const fetchHimnos = async () => {
    try {
      const data = await window.electron.obtenerHimnos();
      setHimnos(data);
    } catch (error) {
      console.error("Error al obtener los himnos:", error);
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

  const handleGuardar = async () => {
    if (!numero.trim() || !titulo.trim() || !letra.trim()) {
      toast.error("Todos los campos son obligatorios.");
      return;
    }

    const himno = {
      numero,
      titulo,
      letra: letra
        .split("\n\n")
        .map((p) => p.trim())
        .filter((p) => p !== ""),
    };

    try {
      if (editId) {
        // Actualizar himno existente
        await window.electron.actualizarHimno({id: editId, ...himno});
        toast.success("Himno actualizado con éxito");
      } else {
        // Agregar nuevo himno
        await window.electron.agregarHimno(himno);
        toast.success("Himno agregado con éxito");
      }
      cerrarModal();
      fetchHimnos(); // Refrescar lista
    } catch (error) {
      console.error("Error al guardar el himno:", error);
      toast.error("Ocurrió un error al guardar el himno.");
    }
  };

  const handleEditar = (himno) => {
    setNumero(himno.numero);
    setTitulo(himno.titulo);
    setLetra(himno.letra.join("\n\n")); // reconstruir para textarea
    setEditId(himno.id); // guardar ID para actualizar
    setModalVisible(true);
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Seguro que quieres eliminar este himno?")) return;
    try {
      await window.electron.eliminarHimno(id);
      toast.success("Himno eliminado con éxito");
      fetchHimnos();
    } catch (error) {
      console.error("Error al eliminar el himno:", error);
      toast.error("Ocurrió un error al eliminar el himno.");
    }
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setNumero("");
    setTitulo("");
    setLetra("");
    setEditId(null);
  };

  const handleNavigate = (id) => {
    navigate(`/himno-detalle/${id}`);
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

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4">
      <ToastContainer />
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Lista de Himnos</h1>
          <button
            onClick={() => {
              cerrarModal();
              setModalVisible(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Crear Himno
          </button>
        </div>

        {himnos.length === 0 ? (
          <p className="text-gray-400">No hay himnos agregados aún.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {himnos.map((himno) => (
              <div
                key={himno.id}
                className="relative bg-gray-800 p-4 rounded-lg border-2 border-blue-500 hover:border-blue-400 transition-transform duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <button
                  onClick={() => toggleFavorito(himno.id)}
                  className={`absolute top-2 right-2 ${
                    favoritos.includes(himno.id)
                      ? "text-red-500 hover:text-red-400"
                      : "text-gray-500 hover:text-gray-400"
                  }`}
                >
                  {favoritos.includes(himno.id) ? (
                    <FaHeart size={20} />
                  ) : (
                    <FaRegHeart size={20} />
                  )}
                </button>
                <div
                  onClick={() => handleNavigate(himno.id)}
                  className="cursor-pointer mb-4"
                >
                  <h2 className="text-xl font-bold text-blue-300">
                    {himno.titulo}
                  </h2>
                  <p className="text-gray-400 text-sm">{himno.numero}</p>
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => handleEditar(himno)}
                    className="text-yellow-500 hover:text-yellow-400"
                  >
                    <FaEdit size={20} />
                  </button>
                  <button
                    onClick={() => handleEliminar(himno.id)}
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

      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-gray-800 text-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editId ? "Editar Himno" : "Agregar Himno"}
            </h2>
            <input
              type="text"
              placeholder="Número (puede ser texto o números)"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="w-full p-2 border border-gray-600 rounded mb-3 bg-gray-700 text-white"
            />
            <input
              type="text"
              placeholder="Título"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full p-2 border border-gray-600 rounded mb-3 bg-gray-700 text-white"
            />
            <textarea
              placeholder="Letra (separa cada párrafo con doble salto de línea)"
              value={letra}
              onChange={(e) => setLetra(e.target.value)}
              rows={8}
              className="w-full p-2 border border-gray-600 rounded mb-1 bg-gray-700 text-white"
            />
            <small className="text-gray-400 block mb-3">
              * Usa doble salto de línea para separar párrafos.
            </small>
            <div className="flex justify-end">
              <button
                onClick={cerrarModal}
                className="bg-gray-500 text-white px-4 py-2 rounded mr-2 hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                {editId ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
