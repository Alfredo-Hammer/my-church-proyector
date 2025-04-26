import {useState} from "react";

const librosBiblia = [
  "Génesis",
  "Éxodo",
  "Levítico",
  "Números",
  "Deuteronomio",
  "Josué",
  "Jueces",
  "Rut",
  "1 Samuel",
  "2 Samuel",
  "1 Reyes",
  "2 Reyes",
  "1 Crónicas",
  "2 Crónicas",
  "Esdras",
  "Nehemías",
  "Ester",
  "Job",
  "Salmos",
  "Proverbios",
  "Eclesiastés",
  "Cantares",
  "Isaías",
  "Jeremías",
  "Lamentaciones",
  "Ezequiel",
  "Daniel",
  "Oseas",
  "Joel",
  "Amós",
  "Abdías",
  "Jonás",
  "Miqueas",
  "Nahúm",
  "Habacuc",
  "Sofonías",
  "Hageo",
  "Zacarías",
  "Malaquías",
  "Mateo",
  "Marcos",
  "Lucas",
  "Juan",
  "Hechos",
  "Romanos",
  "1 Corintios",
  "2 Corintios",
  "Gálatas",
  "Efesios",
  "Filipenses",
  "Colosenses",
  "1 Tesalonicenses",
  "2 Tesalonicenses",
  "1 Timoteo",
  "2 Timoteo",
  "Tito",
  "Filemón",
  "Hebreos",
  "Santiago",
  "1 Pedro",
  "2 Pedro",
  "1 Juan",
  "2 Juan",
  "3 Juan",
  "Judas",
  "Apocalipsis",
];

export const obtenerVersiculo = async (libro, capitulo, versiculo) => {
  try {
    const cita = `${libro} ${capitulo}:${versiculo}`;
    const response = await fetch(
      `https://biblia-api.vercel.app/api?cita=${encodeURIComponent(cita)}`
    );

    // Verifica si la respuesta es correcta
    if (!response.ok) {
      throw new Error(`Error al obtener el versículo: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Error: ${data.error}`);
    }

    return `${data.cita} - ${data.versiculo}`;
  } catch (error) {
    console.error("Error al obtener el versículo:", error);
    return `No se pudo obtener el versículo. ${error.message}`;
  }
};

export default function Biblia() {
  const [libro, setLibro] = useState("Juan");
  const [capitulo, setCapitulo] = useState(3);
  const [versiculo, setVersiculo] = useState(16);
  const [texto, setTexto] = useState("");

  const manejarBusqueda = async () => {
    const resultado = await obtenerVersiculo(libro, capitulo, versiculo);
    setTexto(resultado);
    if (resultado) {
      window.electron?.send("mostrar-versiculo", resultado); // Enviar al proyector
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white h-screen">
      <h1 className="text-3xl font-bold mb-4">Buscar Versículo</h1>
      <div className="mb-4">
        <select
          value={libro}
          onChange={(e) => setLibro(e.target.value)}
          className="px-4 py-2 rounded bg-gray-800 text-white w-full mb-2"
        >
          {librosBiblia.map((nombreLibro) => (
            <option key={nombreLibro} value={nombreLibro}>
              {nombreLibro}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={capitulo}
          onChange={(e) => setCapitulo(Number(e.target.value))}
          placeholder="Capítulo"
          className="px-4 py-2 rounded bg-gray-800 text-white w-full mb-2"
        />
        <input
          type="number"
          value={versiculo}
          onChange={(e) => setVersiculo(Number(e.target.value))}
          placeholder="Versículo"
          className="px-4 py-2 rounded bg-gray-800 text-white w-full mb-2"
        />
        <button
          onClick={manejarBusqueda}
          className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
        >
          Buscar
        </button>
      </div>
      <div className="bg-gray-800 p-4 rounded">
        <h2 className="text-xl font-bold mb-2">Texto del Versículo:</h2>
        <p className="text-lg whitespace-pre-wrap">{texto}</p>
      </div>
    </div>
  );
}
