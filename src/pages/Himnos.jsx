import {useState, useEffect} from "react";
import {Link} from "react-router-dom";
import himnosData from "../data/himnos.json";

const Himnos = () => {
  const [busqueda, setBusqueda] = useState("");
  const [himnos, setHimnos] = useState([]);

  useEffect(() => {
    setHimnos(himnosData);
  }, []);

  const filtrados = himnos.filter(
    (himno) =>
      himno.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      himno.numero.toString().includes(busqueda)
  );

  return (
    <div className="p-4 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Lista de Himnos</h1>

      <input
        type="text"
        placeholder="Buscar himno por título o número..."
        className="w-full p-2 mb-4 border rounded bg-gray-800 text-white placeholder-gray-400"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <div className="bg-gray-800 rounded shadow divide-y divide-gray-700">
        {filtrados.map((himno) => (
          <Link
            key={himno.numero}
            to={`/himno/${himno.numero}`}
            className="block p-2 hover:bg-gray-700 cursor-pointer text-gray-300 font-medium"
          >
            {himno.numero}. {himno.titulo}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Himnos;
