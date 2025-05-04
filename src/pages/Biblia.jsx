import {useEffect, useState} from "react";
import librosDeLaBiblia from "../utils/libros"; // Importar los libros
import {cargarLibro} from "../utils/cargarLibro"; // Función para cargar capítulos y versículos
import {IoArrowBack} from "react-icons/io5"; // Importar ícono de React Icons

const coloresGradientes = [
  "from-red-500 to-red-700",
  "from-blue-500 to-blue-700",
  "from-green-500 to-green-700",
  "from-yellow-500 to-yellow-700",
  "from-purple-500 to-purple-700",
  "from-pink-500 to-pink-700",
  "from-indigo-500 to-indigo-700",
  "from-teal-500 to-teal-700",
];

const Biblia = () => {
  const [vista, setVista] = useState("libros"); // Vista actual: "libros", "capitulos", "versiculos", o "detalle"
  const [libroSeleccionado, setLibroSeleccionado] = useState(null); // Libro seleccionado
  const [capitulos, setCapitulos] = useState([]); // Lista de capítulos
  const [versiculos, setVersiculos] = useState([]); // Lista de versículos
  const [capituloSeleccionado, setCapituloSeleccionado] = useState(null); // Capítulo seleccionado
  const [versiculoSeleccionado, setVersiculoSeleccionado] = useState(null); // Versículo seleccionado
  const [tabActivo, setTabActivo] = useState("antiguo"); // Tabs: "antiguo", "nuevo", "favoritos"

  useEffect(() => {
    if (libroSeleccionado) {
      cargarLibro(libroSeleccionado).then((data) => {
        setCapitulos(data); // Cargar capítulos del libro seleccionado
        setVista("capitulos"); // Cambiar a la vista de capítulos
      });
    }
  }, [libroSeleccionado]);

  useEffect(() => {
    const manejarTeclas = (e) => {
      if (vista === "detalle") {
        if (
          e.key === "ArrowRight" &&
          versiculoSeleccionado < versiculos.length
        ) {
          const nuevoVersiculo = versiculoSeleccionado + 1;

          // Actualizar el estado
          setVersiculoSeleccionado(nuevoVersiculo);

          // Enviar el versículo al proyector
          window.electron.enviarVersiculo({
            parrafo: versiculos[nuevoVersiculo - 1] || "No disponible",
            titulo: librosDeLaBiblia.antiguoTestamento
              .concat(librosDeLaBiblia.nuevoTestamento)
              .find((libro) => libro.id === libroSeleccionado)?.nombre,
            numero: `${capituloSeleccionado}:${nuevoVersiculo}`,
            origen: "biblia",
          });
        } else if (e.key === "ArrowLeft" && versiculoSeleccionado > 1) {
          const nuevoVersiculo = versiculoSeleccionado - 1;

          // Actualizar el estado
          setVersiculoSeleccionado(nuevoVersiculo);

          // Enviar el versículo al proyector
          window.electron.enviarVersiculo({
            parrafo: versiculos[nuevoVersiculo - 1] || "No disponible",
            titulo: librosDeLaBiblia.antiguoTestamento
              .concat(librosDeLaBiblia.nuevoTestamento)
              .find((libro) => libro.id === libroSeleccionado)?.nombre,
            numero: `${capituloSeleccionado}:${nuevoVersiculo}`,
            origen: "biblia",
          });
        }
      }
    };

    window.addEventListener("keydown", manejarTeclas);
    return () => {
      window.removeEventListener("keydown", manejarTeclas);
    };
  }, [
    vista,
    versiculoSeleccionado,
    versiculos,
    libroSeleccionado,
    capituloSeleccionado,
  ]);

  const manejarSeleccionarLibro = (libroId) => {
    setLibroSeleccionado(libroId);
  };

  const manejarSeleccionarCapitulo = (capituloIndex) => {
    setCapituloSeleccionado(capituloIndex + 1); // Guardar el capítulo seleccionado
    setVersiculos(capitulos[capituloIndex]); // Cargar los versículos del capítulo seleccionado
    setVista("versiculos"); // Cambiar a la vista de versículos
  };

  const manejarSeleccionarVersiculo = (versiculoIndex) => {
    const nuevoVersiculo = versiculoIndex + 1;

    // Actualizar el estado
    setVersiculoSeleccionado(nuevoVersiculo);

    // Enviar el versículo al proyector
    window.electron.enviarVersiculo({
      parrafo: versiculos[versiculoIndex] || "No disponible",
      titulo: librosDeLaBiblia.antiguoTestamento
        .concat(librosDeLaBiblia.nuevoTestamento)
        .find((libro) => libro.id === libroSeleccionado)?.nombre,
      numero: `${capituloSeleccionado}:${nuevoVersiculo}`,
      origen: "biblia",
    });

    setVista("detalle"); // Cambiar a la vista de detalle
  };

  //Proyectar versiculo
  const proyectarVersiculo = () => {
    if (versiculos.length > 0) {
      window.electron.abrirProyector();
      window.electron.enviarVersiculo({
        parrafo: versiculos[versiculoSeleccionado - 1] || "No disponible",
        titulo: librosDeLaBiblia.antiguoTestamento
          .concat(librosDeLaBiblia.nuevoTestamento)
          .find((libro) => libro.id === libroSeleccionado)?.nombre,
        numero: `${capituloSeleccionado}:${versiculoSeleccionado}`,
        origen: "biblia",
      });
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      {/* Vista de libros */}
      {vista === "libros" && (
        <div>
          <h2 className="text-2xl text-gray-400 font-bold mb-6 flex justify-end mr-5 ">
            Biblia RV-1960
          </h2>

          {/* Tabs de navegación */}
          <div className="flex justify-left mb-6 gap-2">
            <button
              onClick={() => setTabActivo("antiguo")}
              className={`px-4 py-2 rounded-md ${
                tabActivo === "antiguo"
                  ? "bg-blue-800 text-white"
                  : "bg-gray-600 text-gray-300"
              }`}
            >
              Antiguo Testamento
            </button>
            <button
              onClick={() => setTabActivo("nuevo")}
              className={`px-4 py-2 rounded-md ${
                tabActivo === "nuevo"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-600 text-gray-300"
              }`}
            >
              Nuevo Testamento
            </button>
            <button
              onClick={() => setTabActivo("favoritos")}
              className={`px-4 py-2 rounded-md ${
                tabActivo === "favoritos"
                  ? "bg-green-500 text-white"
                  : "bg-gray-600 text-gray-300"
              }`}
            >
              Textos Favoritos
            </button>
          </div>

          {/* Contenido de los tabs */}
          {tabActivo === "antiguo" && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {librosDeLaBiblia.antiguoTestamento.map((libro, index) => (
                  <div
                    key={libro.id}
                    className={`p-4 bg-gradient-to-r ${
                      coloresGradientes[index % coloresGradientes.length]
                    } rounded-lg shadow-lg cursor-pointer hover:opacity-80 text-center transition-transform transform hover:scale-105`}
                    onClick={() => manejarSeleccionarLibro(libro.id)}
                  >
                    <h3 className="text-2xl font-bold uppercase">
                      {libro.id.slice(0, 3)}
                    </h3>
                    <p className="text-sm mt-2">{libro.nombre}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tabActivo === "nuevo" && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {librosDeLaBiblia.nuevoTestamento.map((libro, index) => (
                  <div
                    key={libro.id}
                    className={`p-4 bg-gradient-to-r ${
                      coloresGradientes[index % coloresGradientes.length]
                    } rounded-lg shadow-lg cursor-pointer hover:opacity-90 text-center transition-transform transform hover:scale-105`}
                    onClick={() => manejarSeleccionarLibro(libro.id)}
                  >
                    <h3 className="text-2xl font-bold uppercase">
                      {libro.id.slice(0, 3)}
                    </h3>
                    <p className="text-sm mt-2">{libro.nombre}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tabActivo === "favoritos" && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Centrar el mensaje de no hay textos favoritos */}

                <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center">
                  <h3 className="text-2xl font-bold text-gray-400">
                    No hay textos favoritos
                  </h3>
                  <p className="text-sm text-gray-500">
                    Agrega versículos a tus favoritos para verlos aquí.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vista de capítulos */}
      {vista === "capitulos" && (
        <div>
          <button
            onClick={() => setVista("libros")}
            className="mb-4 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            <IoArrowBack className="h-6 w-6 text-white" />
          </button>
          <h2 className="text-xl font-bold mb-4 capitalize">
            Capítulos de{" "}
            {
              librosDeLaBiblia.antiguoTestamento
                .concat(librosDeLaBiblia.nuevoTestamento)
                .find((libro) => libro.id === libroSeleccionado)?.nombre
            }
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
            {capitulos.map((_, index) => (
              <div
                key={index}
                className={`p-4 bg-gradient-to-r ${
                  coloresGradientes[index % coloresGradientes.length]
                } rounded-lg shadow-lg cursor-pointer hover:opacity-90 text-center`}
                onClick={() => manejarSeleccionarCapitulo(index)}
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vista de versículos */}
      {vista === "versiculos" && (
        <div>
          <button
            onClick={() => setVista("capitulos")}
            className="mb-4 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            <IoArrowBack className="h-6 w-6 text-white" />
          </button>
          <h2 className="text-xl font-bold mb-4 capitalize">
            Versículos del capítulo {capituloSeleccionado}
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
            {versiculos.map((_, index) => (
              <div
                key={index}
                className={`p-4 bg-gradient-to-r ${
                  coloresGradientes[index % coloresGradientes.length]
                } rounded-lg shadow-lg cursor-pointer hover:opacity-90 text-center`}
                onClick={() => manejarSeleccionarVersiculo(index)}
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vista de detalle */}
      {vista === "detalle" && (
        <div className="flex flex-col items-center justify-between min-h-screen">
          {/* Ícono de navegación hacia atrás */}
          <div className="relative w-full">
            <button
              onClick={() => setVista("versiculos")}
              className="mb-4 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
            >
              <IoArrowBack className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Versículo seleccionado */}
          <div className="flex flex-col items-center justify-center flex-grow">
            <h2 className="text-2xl  mb-4 capitalize text-center text-orange-300">
              {
                librosDeLaBiblia.antiguoTestamento
                  .concat(librosDeLaBiblia.nuevoTestamento)
                  .find((libro) => libro.id === libroSeleccionado)?.nombre
              }{" "}
              {capituloSeleccionado} : {versiculoSeleccionado}{" "}
            </h2>
            <p className="text-3xl text-purple-200 text-center w-10/12">
              {versiculos[versiculoSeleccionado - 1] || "No disponible"}
            </p>
            <button
              onClick={proyectarVersiculo}
              className="relative group mt-20 flex items-center justify-center w-16 h-16 bg-green-500 rounded-full hover:bg-green-600 transition-transform transform hover:scale-110 shadow-lg"
            >
              {/* Ícono de reproducir */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="white"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.25 5.25v13.5L19.5 12 5.25 5.25z"
                />
              </svg>

              {/* Tooltip */}
              <span className="absolute bottom-[-2.5rem] left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Proyectar
              </span>
            </button>
          </div>

          {/* Mini-cards de versículos */}
          <div className="w-full overflow-x-auto bg-gray-800 p-4 rounded-lg">
            <div className="flex gap-4">
              {versiculos.map((_, index) => (
                <div
                  key={index}
                  className={`p-2 w-16 h-16 flex items-center justify-center bg-gradient-to-r ${
                    coloresGradientes[index % coloresGradientes.length]
                  } rounded-lg shadow-lg cursor-pointer hover:opacity-90 text-center ${
                    index + 1 === versiculoSeleccionado
                      ? "ring-4 ring-yellow-400"
                      : ""
                  }`}
                  onClick={() => manejarSeleccionarVersiculo(index)}
                >
                  {index + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Biblia;
