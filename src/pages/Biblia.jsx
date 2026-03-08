import {useEffect, useState, useCallback} from "react";
import {
  IoSearch,
  IoClose,
  IoBook,
  IoGrid,
  IoChevronBack,
} from "react-icons/io5";
import {
  FaPlay,
  FaTimes,
  FaArrowLeft,
  FaArrowRight,
  FaBible,
  FaBookOpen,
} from "react-icons/fa";
import librosDeLaBiblia from "../utils/libros";
import {cargarLibro} from "../utils/cargarLibro";

const Biblia = () => {
  const [libroSeleccionado, setLibroSeleccionado] = useState(null);
  const [capitulos, setCapitulos] = useState([]);
  const [versiculos, setVersiculos] = useState([]);
  const [capituloSeleccionado, setCapituloSeleccionado] = useState(null);
  const [versiculoSeleccionado, setVersiculoSeleccionado] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  // Estado para logo de la iglesia
  const [logoIglesia, setLogoIglesia] = useState(null);

  // Estados para el buscador rápido
  const [busqueda, setBusqueda] = useState("");
  const [mostrarBuscador, setMostrarBuscador] = useState(false);
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [pasoActual, setPasoActual] = useState(1);
  const [libroSeleccionadoBuscador, setLibroSeleccionadoBuscador] =
    useState(null);
  const [capituloSeleccionadoBuscador, setCapituloSeleccionadoBuscador] =
    useState(null);
  const [versiculoSeleccionadoBuscador, setVersiculoSeleccionadoBuscador] =
    useState(null);
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(0);

  // Cargar logo de la iglesia
  useEffect(() => {
    const cargarLogoIglesia = async () => {
      try {
        if (!window.electron?.obtenerConfiguracion) {
          setLogoIglesia("/images/icon-256.png");
          return;
        }
        const configuracion = await window.electron.obtenerConfiguracion();
        const logo = configuracion?.logoUrl || "/images/icon-256.png";
        setLogoIglesia(logo);
      } catch (error) {
        console.log("No se pudo cargar el logo:", error);
        setLogoIglesia("/images/icon-256.png");
      }
    };
    cargarLogoIglesia();
  }, []);

  useEffect(() => {
    if (libroSeleccionado) {
      cargarLibro(libroSeleccionado).then((data) => {
        setCapitulos(data);
      });
    }
  }, [libroSeleccionado]);

  useEffect(() => {
    const manejarTeclas = (e) => {
      if (mostrarDetalle) {
        if (
          e.key === "ArrowRight" &&
          versiculoSeleccionado < versiculos.length
        ) {
          const nuevoVersiculo = versiculoSeleccionado + 1;
          setVersiculoSeleccionado(nuevoVersiculo);

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
          setVersiculoSeleccionado(nuevoVersiculo);

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
    mostrarDetalle,
    versiculoSeleccionado,
    versiculos,
    libroSeleccionado,
    capituloSeleccionado,
  ]);

  const manejarSeleccionarLibro = (libroId) => {
    setLibroSeleccionado(libroId);
  };

  const manejarSeleccionarCapitulo = (capituloIndex) => {
    setCapituloSeleccionado(capituloIndex + 1);
    setVersiculos(capitulos[capituloIndex]);
  };

  const manejarSeleccionarVersiculo = (versiculoIndex) => {
    const nuevoVersiculo = versiculoIndex + 1;
    setVersiculoSeleccionado(nuevoVersiculo);

    window.electron.enviarVersiculo({
      parrafo: versiculos[nuevoVersiculo - 1] || "No disponible",
      titulo: librosDeLaBiblia.antiguoTestamento
        .concat(librosDeLaBiblia.nuevoTestamento)
        .find((libro) => libro.id === libroSeleccionado)?.nombre,
      numero: `${capituloSeleccionado}:${nuevoVersiculo}`,
      origen: "biblia",
    });

    setMostrarDetalle(true);
  };

  const proyectarVersiculo = () => {
    if (versiculos.length > 0 && versiculoSeleccionado) {
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

  // Función mejorada para búsqueda rápida
  const realizarBusquedaRapida = useCallback(
    async (termino) => {
      if (!termino.trim()) {
        setResultadosBusqueda([]);
        return;
      }

      const resultados = [];
      const terminoLower = termino.toLowerCase();
      const todosLosLibros = [
        ...librosDeLaBiblia.antiguoTestamento,
        ...librosDeLaBiblia.nuevoTestamento,
      ];

      if (pasoActual === 1) {
        // Buscar libros
        todosLosLibros.forEach((libro) => {
          if (
            libro.nombre.toLowerCase().includes(terminoLower) ||
            libro.id.toLowerCase().includes(terminoLower)
          ) {
            resultados.push({
              tipo: "libro",
              libro: libro,
              titulo: libro.nombre,
              descripcion: `Libro del ${
                librosDeLaBiblia.antiguoTestamento.includes(libro)
                  ? "Antiguo"
                  : "Nuevo"
              } Testamento`,
            });
          }
        });
      } else if (pasoActual === 2 && libroSeleccionadoBuscador) {
        // Buscar capítulos
        try {
          const data = await cargarLibro(libroSeleccionadoBuscador.id);

          const numeroCapitulo = parseInt(termino);

          if (
            !isNaN(numeroCapitulo) &&
            numeroCapitulo > 0 &&
            numeroCapitulo <= data.length
          ) {
            resultados.push({
              tipo: "capitulo",
              capitulo: numeroCapitulo,
              titulo: `Capítulo ${numeroCapitulo}`,
              descripcion: `${
                data[numeroCapitulo - 1]?.length || 0
              } versículos`,
            });
          }

          // También mostrar capítulos que contengan el número
          data.forEach((cap, index) => {
            const numCap = index + 1;
            if (
              numCap.toString().includes(termino) &&
              numCap !== numeroCapitulo
            ) {
              resultados.push({
                tipo: "capitulo",
                capitulo: numCap,
                titulo: `Capítulo ${numCap}`,
                descripcion: `${cap.length} versículos`,
              });
            }
          });
        } catch (error) {
          console.error("Error cargando capítulos:", error);
        }
      } else if (
        pasoActual === 3 &&
        libroSeleccionadoBuscador &&
        capituloSeleccionadoBuscador
      ) {
        // Buscar versículos
        try {
          const data = await cargarLibro(libroSeleccionadoBuscador.id);
          const versiculosCapitulo =
            data[capituloSeleccionadoBuscador - 1] || [];

          const numeroVersiculo = parseInt(termino);

          if (
            !isNaN(numeroVersiculo) &&
            numeroVersiculo > 0 &&
            numeroVersiculo <= versiculosCapitulo.length
          ) {
            resultados.push({
              tipo: "versiculo",
              versiculo: numeroVersiculo,
              titulo: `Versículo ${numeroVersiculo}`,
              descripcion:
                versiculosCapitulo[numeroVersiculo - 1]?.substring(0, 100) +
                "...",
            });
          }

          // También buscar por contenido
          versiculosCapitulo.forEach((versiculo, index) => {
            if (
              versiculo.toLowerCase().includes(terminoLower) &&
              index + 1 !== numeroVersiculo
            ) {
              resultados.push({
                tipo: "versiculo",
                versiculo: index + 1,
                titulo: `Versículo ${index + 1}`,
                descripcion: versiculo.substring(0, 100) + "...",
              });
            }
          });
        } catch (error) {
          console.error("Error cargando versículos:", error);
        }
      }

      setResultadosBusqueda(resultados);
      setIndiceSeleccionado(0);
    },
    [pasoActual, libroSeleccionadoBuscador, capituloSeleccionadoBuscador],
  );

  // Función para manejar teclas en el buscador
  const manejarTeclasBuscador = useCallback(
    (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndiceSeleccionado((prev) =>
          prev < resultadosBusqueda.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndiceSeleccionado((prev) =>
          prev > 0 ? prev - 1 : resultadosBusqueda.length - 1,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (resultadosBusqueda[indiceSeleccionado]) {
          seleccionarResultadoRapido(resultadosBusqueda[indiceSeleccionado]);
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        if (resultadosBusqueda[indiceSeleccionado]) {
          seleccionarResultadoRapido(resultadosBusqueda[indiceSeleccionado]);
        }
      }
    },
    [resultadosBusqueda, indiceSeleccionado],
  );

  // Función para seleccionar resultado y avanzar al siguiente paso
  const seleccionarResultadoRapido = async (resultado) => {
    if (resultado.tipo === "libro") {
      setLibroSeleccionadoBuscador(resultado.libro);
      setPasoActual(2);
      setBusqueda("");
      setResultadosBusqueda([]);
      setIndiceSeleccionado(0);
    } else if (resultado.tipo === "capitulo") {
      setCapituloSeleccionadoBuscador(resultado.capitulo);
      setPasoActual(3);
      setBusqueda("");
      setResultadosBusqueda([]);
      setIndiceSeleccionado(0);
    } else if (resultado.tipo === "versiculo") {
      setVersiculoSeleccionadoBuscador(resultado.versiculo);

      // Proyectar automáticamente
      await proyectarDesdeBuscador(
        libroSeleccionadoBuscador,
        capituloSeleccionadoBuscador,
        resultado.versiculo,
      );
    }
  };

  // Función para proyectar desde el buscador
  const proyectarDesdeBuscador = async (libro, capitulo, versiculo) => {
    try {
      // Cargar datos y establecer estados principales
      setLibroSeleccionado(libro.id);
      const data = await cargarLibro(libro.id);
      setCapitulos(data);
      setCapituloSeleccionado(capitulo);
      setVersiculos(data[capitulo - 1] || []);
      setVersiculoSeleccionado(versiculo);

      // Proyectar el versículo
      window.electron.abrirProyector();
      window.electron.enviarVersiculo({
        parrafo: (data[capitulo - 1] || [])[versiculo - 1] || "No disponible",
        titulo: libro.nombre,
        numero: `${capitulo}:${versiculo}`,
        origen: "biblia",
      });

      // Cerrar buscador y mostrar detalle
      setMostrarBuscador(false);
      setMostrarDetalle(true);

      // Resetear buscador
      resetearBuscador();
    } catch (error) {
      console.error("Error proyectando desde buscador:", error);
    }
  };

  // Función para resetear el buscador
  const resetearBuscador = () => {
    setPasoActual(1);
    setLibroSeleccionadoBuscador(null);
    setCapituloSeleccionadoBuscador(null);
    setVersiculoSeleccionadoBuscador(null);
    setBusqueda("");
    setResultadosBusqueda([]);
    setIndiceSeleccionado(0);
  };

  // Función para retroceder en el buscador
  const retrocederPaso = () => {
    if (pasoActual === 2) {
      setPasoActual(1);
      setLibroSeleccionadoBuscador(null);
    } else if (pasoActual === 3) {
      setPasoActual(2);
      setCapituloSeleccionadoBuscador(null);
    }
    setBusqueda("");
    setResultadosBusqueda([]);
    setIndiceSeleccionado(0);
  };

  // Función para manejar teclas de acceso rápido
  const manejarTeclasGlobales = useCallback(
    (e) => {
      // Ctrl/Cmd + K para abrir el buscador
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setMostrarBuscador(true);
      }
      // Escape para cerrar el buscador O limpiar proyección
      if (e.key === "Escape") {
        if (mostrarBuscador) {
          setMostrarBuscador(false);
          resetearBuscador();
        } else if (mostrarDetalle) {
          // Si está abierto el modal de detalle, solo cerrarlo
          setMostrarDetalle(false);
        } else {
          // Si no hay modales abiertos, limpiar la proyección
          window.electron.enviarVersiculo({
            parrafo: "",
            titulo: "",
            numero: "",
            origen: "clear",
          });
        }
      }
    },
    [mostrarBuscador, mostrarDetalle],
  );

  useEffect(() => {
    window.addEventListener("keydown", manejarTeclasGlobales);
    return () => window.removeEventListener("keydown", manejarTeclasGlobales);
  }, [manejarTeclasGlobales]);

  // Efecto para búsqueda rápida en tiempo real
  useEffect(() => {
    if (busqueda.trim() && mostrarBuscador) {
      realizarBusquedaRapida(busqueda);
    } else {
      setResultadosBusqueda([]);
    }
  }, [busqueda, realizarBusquedaRapida, mostrarBuscador]);

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 h-full overflow-hidden">
      {/* Header más compacto */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 border border-white/10 rounded-xl">
                <FaBible className="text-lg" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-white">
                  Biblia Reina-Valera 1960
                </h1>
                <p className="text-white/60 text-sm">
                  Busca y proyecta versículos de las Sagradas Escrituras
                </p>
              </div>
            </div>

            {/* Estadísticas más compactas */}
            <div className="flex items-center gap-2">
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 border border-white/10">
                <div className="text-center">
                  <div className="text-sm font-semibold text-white">66</div>
                  <div className="text-xs text-slate-400">Libros</div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 border border-white/10">
                <div className="text-center">
                  <div className="text-sm font-semibold text-white">
                    {librosDeLaBiblia.antiguoTestamento.length}
                  </div>
                  <div className="text-xs text-slate-400">A.T.</div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2 border border-white/10">
                <div className="text-center">
                  <div className="text-sm font-semibold text-white">
                    {librosDeLaBiblia.nuevoTestamento.length}
                  </div>
                  <div className="text-xs text-slate-400">N.T.</div>
                </div>
              </div>

              {/* Logo de la iglesia - siempre visible */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                <img
                  src={logoIglesia || "/images/icon-256.png"}
                  alt="Logo Iglesia"
                  className="w-10 h-10 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.src = "/images/icon-256.png";
                  }}
                />
              </div>
            </div>
          </div>

          {/* Botones de acción más compactos */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setMostrarBuscador(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 border border-emerald-500/20 rounded-xl transition-colors text-sm"
            >
              <IoSearch className="text-sm" />
              <span>Búsqueda Rápida</span>
              <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
                Ctrl+K
              </span>
            </button>

            <button
              onClick={() => {
                window.electron.enviarVersiculo({
                  parrafo: "",
                  titulo: "",
                  numero: "",
                  origen: "clear",
                });
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors text-sm text-red-200"
            >
              <FaTimes className="text-sm" />
              <span>Limpiar Proyección</span>
              <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
                Esc
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal con altura fija */}
      <div className="max-w-7xl mx-auto p-3 h-[calc(100vh-140px)] overflow-y-auto">
        {/* Sección de libros - Layout horizontal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Antiguo Testamento */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-gradient-to-r from-amber-500/20 to-orange-600/20 rounded-lg">
                <FaBookOpen className="text-amber-400 text-sm" />
              </div>
              <h2 className="text-lg font-bold text-amber-400">
                Antiguo Testamento
              </h2>
              <span className="text-xs text-slate-400 bg-amber-500/20 px-2 py-1 rounded-full">
                {librosDeLaBiblia.antiguoTestamento.length}
              </span>
            </div>

            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {librosDeLaBiblia.antiguoTestamento.map((libro, index) => (
                <div
                  key={libro.id}
                  className={`group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-amber-500/20 rounded-lg p-2 hover:border-amber-400/50 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-amber-500/20 hover:scale-105 ${
                    libroSeleccionado === libro.id
                      ? "border-amber-400 shadow-lg shadow-amber-500/30"
                      : ""
                  }`}
                  onClick={() => manejarSeleccionarLibro(libro.id)}
                  style={{animationDelay: `${index * 30}ms`}}
                >
                  <div className="text-center">
                    <div className="text-sm font-bold text-amber-300 mb-1">
                      {libro.id.slice(0, 3).toUpperCase()}
                    </div>
                    <div className="text-xs text-slate-300 group-hover:text-amber-200 transition-colors leading-tight">
                      {libro.nombre}
                    </div>
                  </div>

                  {libroSeleccionado === libro.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 to-orange-400/10 rounded-lg"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Nuevo Testamento */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-gradient-to-r from-emerald-500/20 to-green-600/20 rounded-lg">
                <IoBook className="text-emerald-400 text-sm" />
              </div>
              <h2 className="text-lg font-bold text-emerald-400">
                Nuevo Testamento
              </h2>
              <span className="text-xs text-slate-400 bg-emerald-500/20 px-2 py-1 rounded-full">
                {librosDeLaBiblia.nuevoTestamento.length}
              </span>
            </div>

            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {librosDeLaBiblia.nuevoTestamento.map((libro, index) => (
                <div
                  key={libro.id}
                  className={`group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-emerald-500/20 rounded-lg p-2 hover:border-emerald-400/50 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-105 ${
                    libroSeleccionado === libro.id
                      ? "border-emerald-400 shadow-lg shadow-emerald-500/30"
                      : ""
                  }`}
                  onClick={() => manejarSeleccionarLibro(libro.id)}
                  style={{animationDelay: `${index * 30}ms`}}
                >
                  <div className="text-center">
                    <div className="text-sm font-bold text-emerald-300 mb-1">
                      {libro.id.slice(0, 3).toUpperCase()}
                    </div>
                    <div className="text-xs text-slate-300 group-hover:text-emerald-200 transition-colors leading-tight">
                      {libro.nombre}
                    </div>
                  </div>

                  {libroSeleccionado === libro.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-green-400/10 rounded-lg"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sección de capítulos y versículos - Layout horizontal compacto */}
        {libroSeleccionado ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Capítulos */}
            <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-sm border border-blue-500/20 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-blue-500/20">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-lg">
                    <IoGrid className="text-blue-400 text-sm" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-300">
                      Capítulos
                    </h3>
                    <p className="text-slate-400 text-xs">
                      {
                        librosDeLaBiblia.antiguoTestamento
                          .concat(librosDeLaBiblia.nuevoTestamento)
                          .find((libro) => libro.id === libroSeleccionado)
                          ?.nombre
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 h-48 overflow-y-auto">
                {capitulos.length > 0 ? (
                  <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
                    {capitulos.map((_, index) => (
                      <div
                        key={index}
                        className={`w-8 h-8 flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 rounded-md cursor-pointer hover:shadow-md hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 ${
                          capituloSeleccionado === index + 1
                            ? "ring-2 ring-yellow-400 scale-105 shadow-md shadow-yellow-400/25"
                            : ""
                        }`}
                        onClick={() => manejarSeleccionarCapitulo(index)}
                      >
                        <span className="text-xs font-bold text-white">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto mb-2"></div>
                      <p className="text-slate-400 text-xs">
                        Cargando capítulos...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Versículos */}
            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm border border-purple-500/20 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-purple-500/20">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-purple-500/20 to-pink-600/20 rounded-lg">
                    <FaBible className="text-purple-400 text-sm" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-purple-300">
                      Versículos
                    </h3>
                    <p className="text-slate-400 text-xs">
                      {capituloSeleccionado
                        ? `Capítulo ${capituloSeleccionado}`
                        : "Selecciona un capítulo"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 h-48 overflow-y-auto">
                {versiculos.length > 0 ? (
                  <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
                    {versiculos.map((_, index) => (
                      <div
                        key={index}
                        className={`w-8 h-8 flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-600 rounded-md cursor-pointer hover:shadow-md hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 ${
                          versiculoSeleccionado === index + 1
                            ? "ring-2 ring-yellow-400 scale-105 shadow-md shadow-yellow-400/25"
                            : ""
                        }`}
                        onClick={() => manejarSeleccionarVersiculo(index)}
                      >
                        <span className="text-xs font-bold text-white">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center text-slate-400">
                      <FaBible className="text-2xl mx-auto mb-2 text-slate-600" />
                      <p className="text-xs">
                        {capituloSeleccionado
                          ? "Selecciona un capítulo para ver los versículos"
                          : "Primero selecciona un capítulo"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Estado vacío compacto */
          <div className="text-center py-8">
            <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-lg p-6 border border-indigo-500/20">
              <FaBible className="text-3xl text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-300 mb-2">
                Selecciona un libro para comenzar
              </h3>
              <p className="text-slate-400 text-sm mb-4 max-w-md mx-auto">
                Elige cualquier libro del Antiguo o Nuevo Testamento para
                explorar sus capítulos y versículos
              </p>
              <button
                onClick={() => setMostrarBuscador(true)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transform hover:scale-105 transition-all duration-300 flex items-center gap-2 mx-auto text-sm"
              >
                <IoSearch />
                <span>Búsqueda Rápida</span>
              </button>
              <div className="mt-3 text-xs text-slate-500">
                💡 <strong>Atajos:</strong> Ctrl/Cmd + K (buscador), Esc
                (limpiar), ←→ (navegar versículos)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalle del versículo - REDISEÑADO */}
      {mostrarDetalle && versiculoSeleccionado && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="p-6 border-b border-indigo-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full">
                    <FaBible className="text-xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                      {
                        librosDeLaBiblia.antiguoTestamento
                          .concat(librosDeLaBiblia.nuevoTestamento)
                          .find((libro) => libro.id === libroSeleccionado)
                          ?.nombre
                      }
                    </h2>
                    <p className="text-slate-400">
                      Capítulo {capituloSeleccionado}, Versículo{" "}
                      {versiculoSeleccionado}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMostrarDetalle(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-red-500/10 rounded-lg transition-all duration-200"
                >
                  <IoClose className="text-xl" />
                </button>
              </div>
            </div>

            {/* Contenido del versículo */}
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-8">
                  <p className="text-2xl text-white leading-relaxed font-medium">
                    "{versiculos[versiculoSeleccionado - 1] || "No disponible"}"
                  </p>
                  <div className="mt-4 text-indigo-300 font-semibold">
                    —{" "}
                    {
                      librosDeLaBiblia.antiguoTestamento
                        .concat(librosDeLaBiblia.nuevoTestamento)
                        .find((libro) => libro.id === libroSeleccionado)?.nombre
                    }{" "}
                    {capituloSeleccionado}:{versiculoSeleccionado} —
                  </div>
                </div>
              </div>

              {/* Controles de navegación */}
              <div className="flex justify-center gap-4 mb-8">
                <button
                  onClick={() => {
                    if (versiculoSeleccionado > 1) {
                      const nuevoVersiculo = versiculoSeleccionado - 1;
                      setVersiculoSeleccionado(nuevoVersiculo);

                      window.electron.enviarVersiculo({
                        parrafo:
                          versiculos[nuevoVersiculo - 1] || "No disponible",
                        titulo: librosDeLaBiblia.antiguoTestamento
                          .concat(librosDeLaBiblia.nuevoTestamento)
                          .find((libro) => libro.id === libroSeleccionado)
                          ?.nombre,
                        numero: `${capituloSeleccionado}:${nuevoVersiculo}`,
                        origen: "biblia",
                      });
                    }
                  }}
                  disabled={versiculoSeleccionado <= 1}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 rounded-xl transition-all duration-300 hover:scale-105"
                >
                  <FaArrowLeft />
                  <span>Anterior</span>
                </button>

                <button
                  onClick={() => {
                    window.electron.enviarVersiculo({
                      parrafo: "",
                      titulo: "",
                      numero: "",
                      origen: "clear",
                    });
                    setMostrarDetalle(false);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-xl transition-all duration-300 hover:scale-105"
                >
                  <FaTimes />
                  <span>Limpiar</span>
                </button>

                <button
                  onClick={proyectarVersiculo}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl transition-all duration-300 hover:scale-105 font-semibold"
                >
                  <FaPlay />
                  <span>Proyectar</span>
                </button>

                <button
                  onClick={() => {
                    if (versiculoSeleccionado < versiculos.length) {
                      const nuevoVersiculo = versiculoSeleccionado + 1;
                      setVersiculoSeleccionado(nuevoVersiculo);

                      window.electron.enviarVersiculo({
                        parrafo:
                          versiculos[nuevoVersiculo - 1] || "No disponible",
                        titulo: librosDeLaBiblia.antiguoTestamento
                          .concat(librosDeLaBiblia.nuevoTestamento)
                          .find((libro) => libro.id === libroSeleccionado)
                          ?.nombre,
                        numero: `${capituloSeleccionado}:${nuevoVersiculo}`,
                        origen: "biblia",
                      });
                    }
                  }}
                  disabled={versiculoSeleccionado >= versiculos.length}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 rounded-xl transition-all duration-300 hover:scale-105"
                >
                  <span>Siguiente</span>
                  <FaArrowRight />
                </button>
              </div>

              {/* Mini navegador de versículos */}
              <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6">
                <h4 className="text-lg font-semibold mb-4 text-indigo-300">
                  Navegación rápida - Capítulo {capituloSeleccionado}
                </h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {versiculos.map((_, index) => (
                    <div
                      key={index}
                      className={`flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg cursor-pointer hover:shadow-lg hover:shadow-indigo-500/25 text-sm font-bold transition-all duration-300 hover:scale-110 ${
                        versiculoSeleccionado === index + 1
                          ? "ring-2 ring-yellow-400 scale-110 shadow-lg shadow-yellow-400/25"
                          : ""
                      }`}
                      onClick={() => {
                        const nuevoVersiculo = index + 1;
                        setVersiculoSeleccionado(nuevoVersiculo);

                        window.electron.enviarVersiculo({
                          parrafo:
                            versiculos[nuevoVersiculo - 1] || "No disponible",
                          titulo: librosDeLaBiblia.antiguoTestamento
                            .concat(librosDeLaBiblia.nuevoTestamento)
                            .find((libro) => libro.id === libroSeleccionado)
                            ?.nombre,
                          numero: `${capituloSeleccionado}:${nuevoVersiculo}`,
                          origen: "biblia",
                        });
                      }}
                    >
                      {index + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buscador Rápido - REDISEÑADO */}
      {mostrarBuscador && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            {/* Header del buscador */}
            <div className="p-6 border-b border-indigo-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full">
                    <IoSearch className="text-xl" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                      Búsqueda Rápida
                    </h3>
                    <p className="text-slate-400">
                      Encuentra versículos en 3 pasos simples
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMostrarBuscador(false);
                    resetearBuscador();
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-red-500/10 rounded-lg transition-all duration-200"
                >
                  <IoClose className="text-xl" />
                </button>
              </div>
            </div>

            {/* Indicador de pasos */}
            <div className="p-6 border-b border-indigo-500/20">
              <div className="flex items-center justify-center gap-6">
                <div
                  className={`flex items-center ${
                    pasoActual >= 1 ? "text-blue-400" : "text-gray-500"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold ${
                      pasoActual >= 1
                        ? "border-blue-400 bg-blue-400 text-white"
                        : "border-gray-500"
                    }`}
                  >
                    1
                  </div>
                  <span className="ml-3 font-medium">Libro</span>
                </div>

                <div className="h-0.5 w-12 bg-gradient-to-r from-blue-400 to-green-400"></div>

                <div
                  className={`flex items-center ${
                    pasoActual >= 2 ? "text-green-400" : "text-gray-500"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold ${
                      pasoActual >= 2
                        ? "border-green-400 bg-green-400 text-white"
                        : "border-gray-500"
                    }`}
                  >
                    2
                  </div>
                  <span className="ml-3 font-medium">Capítulo</span>
                </div>

                <div className="h-0.5 w-12 bg-gradient-to-r from-green-400 to-purple-400"></div>

                <div
                  className={`flex items-center ${
                    pasoActual >= 3 ? "text-purple-400" : "text-gray-500"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold ${
                      pasoActual >= 3
                        ? "border-purple-400 bg-purple-400 text-white"
                        : "border-gray-500"
                    }`}
                  >
                    3
                  </div>
                  <span className="ml-3 font-medium">Versículo</span>
                </div>
              </div>
            </div>

            {/* Contexto actual */}
            <div className="p-6">
              {(libroSeleccionadoBuscador || capituloSeleccionadoBuscador) && (
                <div className="mb-6 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {libroSeleccionadoBuscador && (
                        <span className="flex items-center gap-2 text-blue-400 font-semibold">
                          <FaBible className="text-sm" />
                          {libroSeleccionadoBuscador.nombre}
                        </span>
                      )}
                      {capituloSeleccionadoBuscador && (
                        <span className="flex items-center gap-2 text-green-400 font-semibold">
                          <IoGrid className="text-sm" />
                          Capítulo {capituloSeleccionadoBuscador}
                        </span>
                      )}
                    </div>

                    {pasoActual > 1 && (
                      <button
                        onClick={retrocederPaso}
                        className="flex items-center gap-2 text-slate-400 hover:text-white text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-lg transition-all duration-200"
                      >
                        <IoChevronBack />
                        Atrás
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Campo de búsqueda */}
              <div className="mb-6">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={manejarTeclasBuscador}
                  className="w-full p-4 bg-white/10 border border-indigo-500/30 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300 text-lg"
                  placeholder={
                    pasoActual === 1
                      ? "🔍 Escribe el nombre del libro (ej: Genesis, Juan, Salmos)..."
                      : pasoActual === 2
                        ? `🔍 Escribe el número del capítulo en ${libroSeleccionadoBuscador?.nombre}...`
                        : `🔍 Escribe el número del versículo o busca por contenido...`
                  }
                  autoFocus
                />
                <p className="text-sm text-slate-400 mt-2">
                  💡 Usa las flechas ↑↓ para navegar, Tab o Enter para
                  seleccionar
                </p>
              </div>

              {/* Resultados de búsqueda */}
              <div className="max-h-64 overflow-y-auto">
                {resultadosBusqueda.length === 0 && busqueda.trim() && (
                  <div className="text-center py-12">
                    <IoSearch className="text-4xl text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">
                      No se encontraron resultados
                    </h3>
                    <p className="text-slate-400">
                      Intenta con otro término de búsqueda para "{busqueda}"
                    </p>
                  </div>
                )}

                {resultadosBusqueda.length === 0 && !busqueda.trim() && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">
                      {pasoActual === 1 && "📚"}
                      {pasoActual === 2 && "📋"}
                      {pasoActual === 3 && "📖"}
                    </div>
                    <h3 className="text-xl font-semibold text-slate-300 mb-2">
                      {pasoActual === 1 && "¿Qué libro buscas?"}
                      {pasoActual === 2 &&
                        `¿Qué capítulo de ${libroSeleccionadoBuscador?.nombre}?`}
                      {pasoActual === 3 &&
                        `¿Qué versículo del capítulo ${capituloSeleccionadoBuscador}?`}
                    </h3>
                    <p className="text-slate-400">
                      {pasoActual === 1 &&
                        "Puedes escribir el nombre completo o una abreviación"}
                      {pasoActual === 2 &&
                        "Escribe el número del capítulo que deseas"}
                      {pasoActual === 3 &&
                        "Escribe el número del versículo o busca por contenido"}
                    </p>
                  </div>
                )}

                {resultadosBusqueda.map((resultado, index) => (
                  <div
                    key={index}
                    className={`p-4 mb-3 rounded-xl cursor-pointer transition-all duration-300 border-l-4 ${
                      index === indiceSeleccionado
                        ? "bg-indigo-500/20 border-indigo-400 transform scale-[1.02] shadow-lg"
                        : "bg-white/5 border-transparent hover:bg-white/10"
                    }`}
                    onClick={() => seleccionarResultadoRapido(resultado)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            resultado.tipo === "libro"
                              ? "bg-blue-400"
                              : resultado.tipo === "capitulo"
                                ? "bg-green-400"
                                : "bg-purple-400"
                          }`}
                        ></div>
                        <div>
                          <h4 className="font-semibold text-white text-lg">
                            {resultado.titulo}
                          </h4>
                          <p className="text-sm text-slate-400 mt-1">
                            {resultado.descripcion}
                          </p>
                        </div>
                      </div>

                      {index === indiceSeleccionado && (
                        <span className="text-indigo-400 text-sm font-medium bg-indigo-500/20 px-3 py-1 rounded-full">
                          Tab/Enter
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Botones de acción */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setMostrarBuscador(false);
                    resetearBuscador();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-xl transition-all duration-300 hover:scale-105"
                >
                  <IoClose />
                  Cerrar
                </button>

                <button
                  onClick={resetearBuscador}
                  className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 rounded-xl transition-all duration-300 hover:scale-105"
                >
                  Reiniciar
                </button>

                {pasoActual > 1 && (
                  <button
                    onClick={retrocederPaso}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 rounded-xl transition-all duration-300 hover:scale-105"
                  >
                    <IoChevronBack />
                    Atrás
                  </button>
                )}
              </div>

              {/* Ayuda */}
              <div className="mt-6 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl">
                <p className="text-xs text-slate-400">
                  <strong>Atajos de teclado:</strong> Ctrl/Cmd + K (abrir
                  buscador), Esc (cerrar/limpiar), ↑↓ (navegar), Tab/Enter
                  (seleccionar)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Biblia;
