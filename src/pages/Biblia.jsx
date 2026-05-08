import {useEffect, useState, useCallback, useRef} from "react";
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
  FaStar,
  FaRegStar,
} from "react-icons/fa";
import librosDeLaBiblia from "../utils/libros";
import {cargarLibro} from "../utils/cargarLibro";

const API_BASE = "http://localhost:3001";

const Biblia = () => {
  const [libroSeleccionado, setLibroSeleccionado] = useState(null);
  const [capitulos, setCapitulos] = useState([]);
  const [versiculos, setVersiculos] = useState([]);
  const [capituloSeleccionado, setCapituloSeleccionado] = useState(null);
  const [versiculoSeleccionado, setVersiculoSeleccionado] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  const [favoritosBibliaIds, setFavoritosBibliaIds] = useState(() => new Set());

  const inputBuscadorRef = useRef(null);
  const inputTextoRef = useRef(null);

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

  // Estados para búsqueda full-text
  const [modoBuscador, setModoBuscador] = useState("referencia"); // "referencia" | "texto"
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const [buscandoTexto, setBuscandoTexto] = useState(false);
  const [resultadosTexto, setResultadosTexto] = useState([]);
  const [librosBuscados, setLibrosBuscados] = useState(0);

  // Auto-focus en el input del buscador al abrirse
  useEffect(() => {
    if (mostrarBuscador) {
      const t = setTimeout(() => inputBuscadorRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [mostrarBuscador]);

  // Cargar favoritos de Biblia desde el backend local
  useEffect(() => {
    const cargarFavoritosBiblia = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/biblia/favoritos`, {
          method: "GET",
          headers: {Accept: "application/json"},
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.ok && Array.isArray(json?.favoritos)) {
          const ids = new Set(
            json.favoritos
              .map((f) => String(f?.id || "").trim())
              .filter(Boolean),
          );
          setFavoritosBibliaIds(ids);
        }
      } catch (error) {
        console.warn("⚠️ Error cargando favoritos de Biblia:", error);
      }
    };

    cargarFavoritosBiblia();
  }, []);

  const obtenerLibroNombreActual = useCallback(() => {
    const libro = librosDeLaBiblia.antiguoTestamento
      .concat(librosDeLaBiblia.nuevoTestamento)
      .find((l) => l.id === libroSeleccionado);
    return libro?.nombre || "";
  }, [libroSeleccionado]);

  const idVersiculoActual =
    libroSeleccionado && capituloSeleccionado && versiculoSeleccionado
      ? `rv60:${libroSeleccionado}:${capituloSeleccionado}:${versiculoSeleccionado}`
      : "";

  const esFavoritoActual =
    Boolean(idVersiculoActual) && favoritosBibliaIds.has(idVersiculoActual);

  const toggleFavoritoActual = useCallback(async () => {
    if (!idVersiculoActual || !capituloSeleccionado || !versiculoSeleccionado)
      return;

    const nuevoValor = !favoritosBibliaIds.has(idVersiculoActual);
    const libroNombre = obtenerLibroNombreActual();
    const texto = versiculos[versiculoSeleccionado - 1] || "";

    try {
      const res = await fetch(
        `${API_BASE}/api/biblia/${encodeURIComponent(idVersiculoActual)}/favorito`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            favorito: nuevoValor,
            libroId: libroSeleccionado,
            libroNombre,
            capitulo: capituloSeleccionado,
            versiculo: versiculoSeleccionado,
            texto,
          }),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      setFavoritosBibliaIds((prev) => {
        const next = new Set(prev);
        if (nuevoValor) next.add(idVersiculoActual);
        else next.delete(idVersiculoActual);
        return next;
      });
    } catch (error) {
      console.error("❌ Error guardando favorito de Biblia:", error);
    }
  }, [
    capituloSeleccionado,
    idVersiculoActual,
    libroSeleccionado,
    favoritosBibliaIds,
    obtenerLibroNombreActual,
    versiculoSeleccionado,
    versiculos,
  ]);

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

  const enviarVersiculoA = useCallback(
    (nuevoVersiculo) => {
      setVersiculoSeleccionado(nuevoVersiculo);

      window.electron.enviarVersiculo({
        parrafo: versiculos[nuevoVersiculo - 1] || "No disponible",
        titulo: librosDeLaBiblia.antiguoTestamento
          .concat(librosDeLaBiblia.nuevoTestamento)
          .find((libro) => libro.id === libroSeleccionado)?.nombre,
        numero: `${capituloSeleccionado}:${nuevoVersiculo}`,
        origen: "biblia",
      });
    },
    [versiculos, libroSeleccionado, capituloSeleccionado],
  );

  const irAnterior = useCallback(() => {
    if (versiculoSeleccionado > 1) {
      enviarVersiculoA(versiculoSeleccionado - 1);
    }
  }, [versiculoSeleccionado, enviarVersiculoA]);

  const irSiguiente = useCallback(() => {
    if (versiculoSeleccionado < versiculos.length) {
      enviarVersiculoA(versiculoSeleccionado + 1);
    }
  }, [versiculoSeleccionado, versiculos.length, enviarVersiculoA]);

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
              libro,
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

          const numeroCapitulo = parseInt(termino, 10);
          if (
            !Number.isNaN(numeroCapitulo) &&
            numeroCapitulo > 0 &&
            numeroCapitulo <= data.length
          ) {
            resultados.push({
              tipo: "capitulo",
              capitulo: numeroCapitulo,
              titulo: `Capítulo ${numeroCapitulo}`,
              descripcion: `${data[numeroCapitulo - 1]?.length || 0} versículos`,
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
                descripcion: `${cap?.length || 0} versículos`,
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

          const numeroVersiculo = parseInt(termino, 10);
          if (
            !Number.isNaN(numeroVersiculo) &&
            numeroVersiculo > 0 &&
            numeroVersiculo <= versiculosCapitulo.length
          ) {
            const texto = versiculosCapitulo[numeroVersiculo - 1] || "";
            resultados.push({
              tipo: "versiculo",
              versiculo: numeroVersiculo,
              titulo: `Versículo ${numeroVersiculo}`,
              descripcion:
                (texto?.substring(0, 100) || "") +
                (texto?.length > 100 ? "..." : ""),
            });
          }

          // También buscar por contenido
          versiculosCapitulo.forEach((texto, index) => {
            const t = (texto || "").toLowerCase();
            if (t.includes(terminoLower)) {
              resultados.push({
                tipo: "versiculo",
                versiculo: index + 1,
                titulo: `Versículo ${index + 1}`,
                descripcion:
                  (texto?.substring(0, 100) || "") +
                  (texto?.length > 100 ? "..." : ""),
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

  // Búsqueda full-text en toda la Biblia
  const buscarEnTodaLaBiblia = useCallback(async () => {
    const termino = busquedaTexto.trim();
    if (!termino || buscandoTexto) return;
    setBuscandoTexto(true);
    setResultadosTexto([]);
    setLibrosBuscados(0);
    const libros = [...librosDeLaBiblia.antiguoTestamento, ...librosDeLaBiblia.nuevoTestamento];
    const resultados = [];
    const terminoLower = termino.toLowerCase();

    for (let li = 0; li < libros.length; li++) {
      const libro = libros[li];
      try {
        const data = await cargarLibro(libro.id);
        setLibrosBuscados(li + 1);
        if (Array.isArray(data)) {
          data.forEach((capitulo, capIdx) => {
            if (!Array.isArray(capitulo)) return;
            capitulo.forEach((texto, verIdx) => {
              if (typeof texto === "string" && texto.toLowerCase().includes(terminoLower)) {
                resultados.push({libroId: libro.id, libroNombre: libro.nombre, capitulo: capIdx + 1, versiculo: verIdx + 1, texto});
              }
            });
          });
        }
      } catch {}
      if (resultados.length >= 60) break;
    }

    setResultadosTexto(resultados.slice(0, 60));
    setBuscandoTexto(false);
  }, [busquedaTexto, buscandoTexto]);

  const proyectarResultadoTexto = async (resultado) => {
    try {
      const data = await cargarLibro(resultado.libroId);
      setLibroSeleccionado(resultado.libroId);
      setCapitulos(data);
      setCapituloSeleccionado(resultado.capitulo);
      setVersiculos(data[resultado.capitulo - 1] || []);
      setVersiculoSeleccionado(resultado.versiculo);
      window.electron.abrirProyector();
      window.electron.enviarVersiculo({
        parrafo: resultado.texto,
        titulo: resultado.libroNombre,
        numero: `${resultado.capitulo}:${resultado.versiculo}`,
        origen: "biblia",
      });
      setMostrarBuscador(false);
      setMostrarDetalle(true);
      setModoBuscador("referencia");
      setBusquedaTexto("");
      setResultadosTexto([]);
    } catch {}
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
    <div className="bg-slate-950 text-slate-100 h-full flex flex-col overflow-hidden">

      {/* ── Barra de herramientas compacta ── */}
      <div className="shrink-0 bg-slate-900/98 backdrop-blur border-b border-slate-700/50 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <FaBible className="text-indigo-400 text-sm" />
            <span className="text-sm font-semibold text-white hidden sm:inline">Biblia RVR60</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMostrarBuscador(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-500/30 rounded-lg text-xs font-medium transition-colors"
            >
              <IoSearch className="text-xs" />
              <span>Búsqueda Rápida</span>
              <kbd className="text-[10px] bg-white/15 px-1.5 py-0.5 rounded">Ctrl+K</kbd>
            </button>

            <button
              onClick={() => window.electron.enviarVersiculo({parrafo:"",titulo:"",numero:"",origen:"clear"})}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs font-medium text-red-300 transition-colors"
            >
              <FaTimes className="text-xs" />
              <span className="hidden sm:inline">Limpiar</span>
              <kbd className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded hidden sm:inline">Esc</kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 xl:p-4">
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

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1.5">
              {librosDeLaBiblia.antiguoTestamento.map((libro, index) => (
                <button
                  key={libro.id}
                  type="button"
                  onClick={() => manejarSeleccionarLibro(libro.id)}
                  className={`group text-left rounded-lg px-2 py-1.5 border transition-all duration-200 hover:scale-[1.02] ${
                    libroSeleccionado === libro.id
                      ? "border-amber-400/60 bg-amber-500/15 shadow-sm shadow-amber-500/20"
                      : "border-amber-500/15 bg-white/4 hover:border-amber-400/35 hover:bg-amber-500/8"
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    <span className={`shrink-0 text-[9px] font-bold tabular-nums mt-0.5 w-4 ${
                      libroSeleccionado === libro.id ? "text-amber-400" : "text-amber-600/60 group-hover:text-amber-500/80"
                    }`}>{index + 1}</span>
                    <span className={`text-[10px] xl:text-[11px] leading-tight font-medium ${
                      libroSeleccionado === libro.id ? "text-amber-200" : "text-slate-300 group-hover:text-amber-200"
                    }`}>{libro.nombre}</span>
                  </div>
                </button>
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

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1.5">
              {librosDeLaBiblia.nuevoTestamento.map((libro, index) => (
                <button
                  key={libro.id}
                  type="button"
                  onClick={() => manejarSeleccionarLibro(libro.id)}
                  className={`group text-left rounded-lg px-2 py-1.5 border transition-all duration-200 hover:scale-[1.02] ${
                    libroSeleccionado === libro.id
                      ? "border-emerald-400/60 bg-emerald-500/15 shadow-sm shadow-emerald-500/20"
                      : "border-emerald-500/15 bg-white/4 hover:border-emerald-400/35 hover:bg-emerald-500/8"
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    <span className={`shrink-0 text-[9px] font-bold tabular-nums mt-0.5 w-4 ${
                      libroSeleccionado === libro.id ? "text-emerald-400" : "text-emerald-600/60 group-hover:text-emerald-500/80"
                    }`}>{index + 1}</span>
                    <span className={`text-[10px] xl:text-[11px] leading-tight font-medium ${
                      libroSeleccionado === libro.id ? "text-emerald-200" : "text-slate-300 group-hover:text-emerald-200"
                    }`}>{libro.nombre}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Capítulos y Versículos ── */}
        {libroSeleccionado ? (() => {
          const nombreLibroActual = librosDeLaBiblia.antiguoTestamento
            .concat(librosDeLaBiblia.nuevoTestamento)
            .find((l) => l.id === libroSeleccionado)?.nombre || "";
          const esAT = librosDeLaBiblia.antiguoTestamento.some((l) => l.id === libroSeleccionado);
          return (
            <div className="space-y-2">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 px-0.5">
                <IoBook className={esAT ? "text-amber-500/60" : "text-emerald-500/60"} />
                <span className={`font-semibold ${esAT ? "text-amber-400/80" : "text-emerald-400/80"}`}>{nombreLibroActual}</span>
                {capituloSeleccionado && (<><span className="text-slate-700">›</span><span className="text-indigo-400/80 font-semibold">Cap. {capituloSeleccionado}</span></>)}
                {versiculoSeleccionado && (<><span className="text-slate-700">›</span><span className="text-violet-400/80 font-semibold">Vers. {versiculoSeleccionado}</span></>)}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {/* ── Capítulos ── */}
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                        <IoGrid className="text-indigo-400 text-[9px]" />
                      </div>
                      <span className="text-xs font-semibold text-white">Capítulos</span>
                      {capitulos.length > 0 && <span className="text-[10px] text-slate-600">{capitulos.length} caps.</span>}
                    </div>
                    {capituloSeleccionado && (
                      <span className="text-[11px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/25 px-2 py-0.5 rounded-full tabular-nums">
                        Cap. {capituloSeleccionado}
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 max-h-[24vh] lg:max-h-[30vh] overflow-y-auto">
                    {capitulos.length > 0 ? (
                      <div className="grid gap-1.5" style={{gridTemplateColumns: "repeat(auto-fill, minmax(2.1rem, 1fr))"}}>
                        {capitulos.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => manejarSeleccionarCapitulo(index)}
                            className={`aspect-square rounded-lg text-xs font-bold transition-all ${
                              capituloSeleccionado === index + 1
                                ? "bg-indigo-600 text-white border border-indigo-500/60 shadow-sm"
                                : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700 hover:text-white hover:border-indigo-500/40"
                            }`}
                          >
                            {index + 1}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500 mx-auto mb-2" />
                          <p className="text-slate-600 text-xs">Cargando...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Versículos ── */}
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                        <FaBible className="text-violet-400 text-[9px]" />
                      </div>
                      <span className="text-xs font-semibold text-white">Versículos</span>
                      {versiculos.length > 0 && <span className="text-[10px] text-slate-600">{versiculos.length} vers.</span>}
                    </div>
                    {versiculoSeleccionado && (
                      <span className="text-[11px] font-bold text-violet-300 bg-violet-500/15 border border-violet-500/25 px-2 py-0.5 rounded-full tabular-nums">
                        {capituloSeleccionado}:{versiculoSeleccionado}
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 max-h-[24vh] lg:max-h-[30vh] overflow-y-auto">
                    {versiculos.length > 0 ? (
                      <div className="grid gap-1.5" style={{gridTemplateColumns: "repeat(auto-fill, minmax(2.1rem, 1fr))"}}>
                        {versiculos.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => manejarSeleccionarVersiculo(index)}
                            className={`aspect-square rounded-lg text-xs font-bold transition-all ${
                              versiculoSeleccionado === index + 1
                                ? "bg-violet-600 text-white border border-violet-500/60 shadow-sm"
                                : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:bg-slate-700 hover:text-white hover:border-violet-500/40"
                            }`}
                          >
                            {index + 1}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <FaBible className="text-xl text-slate-700 mx-auto mb-2" />
                          <p className="text-slate-600 text-xs">
                            {capituloSeleccionado ? "Elige un versículo" : "Primero selecciona un capítulo"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })() : (
          /* Estado vacío */
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700/60 flex items-center justify-center mx-auto mb-4">
              <FaBible className="text-xl text-slate-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-400 mb-1">Selecciona un libro</h3>
            <p className="text-slate-600 text-xs mb-4 max-w-xs">
              Elige un libro del Antiguo o Nuevo Testamento para explorar sus capítulos y versículos
            </p>
            <button
              onClick={() => setMostrarBuscador(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-500/30 rounded-lg text-sm font-medium transition-colors"
            >
              <IoSearch className="text-sm" /> Búsqueda Rápida
              <span className="text-[10px] bg-white/15 px-1.5 py-0.5 rounded">Ctrl+K</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Modal versículo ── */}
      {mostrarDetalle && versiculoSeleccionado && (() => {
        const nombreLibroModal = librosDeLaBiblia.antiguoTestamento
          .concat(librosDeLaBiblia.nuevoTestamento)
          .find((l) => l.id === libroSeleccionado)?.nombre || "";
        return (
          <div
            className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6"
            onClick={() => setMostrarDetalle(false)}
          >
            <div
              className="bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 shrink-0 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <FaBible className="text-indigo-400 text-[10px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Versículo</p>
                    <h3 className="text-sm font-bold text-white truncate">{nombreLibroModal} {capituloSeleccionado}:{versiculoSeleccionado}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={toggleFavoritoActual}
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${esFavoritoActual ? "bg-amber-500/20 border-amber-500/30 text-amber-300" : "bg-slate-800 border-slate-700/60 text-slate-500 hover:text-amber-400"}`}
                    title={esFavoritoActual ? "Quitar favorito" : "Agregar a favoritos"}
                  >
                    {esFavoritoActual ? <FaStar className="text-xs" /> : <FaRegStar className="text-xs" />}
                  </button>
                  <button
                    onClick={proyectarVersiculo}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 text-white text-xs font-semibold transition-colors"
                  >
                    <FaPlay className="text-[9px]" /> Proyectar
                  </button>
                  <button
                    onClick={() => setMostrarDetalle(false)}
                    className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-500 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
                  >
                    <IoClose className="text-sm" />
                  </button>
                </div>
              </div>

              {/* Versículo anterior */}
              {versiculoSeleccionado > 1 && (
                <button
                  type="button"
                  onClick={irAnterior}
                  className="w-full text-left px-4 pt-3 pb-2 border-b border-slate-800 hover:bg-slate-800/50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Anterior</span>
                    <span className="text-[10px] text-slate-700 tabular-nums">{capituloSeleccionado}:{versiculoSeleccionado - 1}</span>
                  </div>
                  <p className="text-xs text-slate-600 group-hover:text-slate-500 line-clamp-2 leading-relaxed">
                    {versiculos[versiculoSeleccionado - 2] || "—"}
                  </p>
                </button>
              )}

              {/* Versículo actual */}
              <div className="px-5 py-4 bg-indigo-500/5 border-b border-indigo-500/15">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] text-indigo-400/70 uppercase tracking-wider font-semibold">Actual</span>
                  <span className="text-[11px] text-indigo-400/50 tabular-nums">{capituloSeleccionado}:{versiculoSeleccionado}</span>
                </div>
                <p className="text-base sm:text-lg text-white leading-relaxed font-medium text-center">
                  "{versiculos[versiculoSeleccionado - 1] || "No disponible"}"
                </p>
                <p className="text-[11px] text-indigo-400/50 text-center mt-2.5">
                  — {nombreLibroModal} {capituloSeleccionado}:{versiculoSeleccionado} —
                </p>
              </div>

              {/* Versículo siguiente */}
              {versiculoSeleccionado < versiculos.length && (
                <button
                  type="button"
                  onClick={irSiguiente}
                  className="w-full text-left px-4 pt-2 pb-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Siguiente</span>
                    <span className="text-[10px] text-slate-700 tabular-nums">{capituloSeleccionado}:{versiculoSeleccionado + 1}</span>
                  </div>
                  <p className="text-xs text-slate-600 group-hover:text-slate-500 line-clamp-2 leading-relaxed">
                    {versiculos[versiculoSeleccionado] || "—"}
                  </p>
                </button>
              )}

              {/* Footer */}
              <div className="px-4 py-2.5 flex items-center gap-2">
                <button
                  onClick={irAnterior}
                  disabled={versiculoSeleccionado <= 1}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
                >
                  <FaArrowLeft className="text-[9px]" /> Anterior
                </button>
                <button
                  onClick={() => { window.electron.enviarVersiculo({parrafo:"",titulo:"",numero:"",origen:"clear"}); setMostrarDetalle(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs transition-colors"
                >
                  <FaTimes className="text-[9px]" /> Limpiar
                </button>
                <span className="flex-1 text-center text-[11px] text-slate-600 tabular-nums">
                  {versiculoSeleccionado} / {versiculos.length}
                </span>
                <button
                  onClick={irSiguiente}
                  disabled={versiculoSeleccionado >= versiculos.length}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
                >
                  Siguiente <FaArrowRight className="text-[9px]" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Buscador Rápido */}
      {mostrarBuscador && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-950/98 border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]">

            {/* ── Header compacto ── */}
            <div className="px-4 pt-4 pb-3 border-b border-white/8 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <IoSearch className="text-indigo-400 text-sm" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">Búsqueda Rápida</h3>
                    <p className="text-[11px] text-slate-500">↑↓ navegar · Tab/Enter seleccionar · Esc cerrar</p>
                  </div>
                </div>
                <button
                  onClick={() => { setMostrarBuscador(false); resetearBuscador(); setModoBuscador("referencia"); }}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/15 border border-white/8 hover:border-red-500/25 flex items-center justify-center text-slate-400 hover:text-red-400 transition-all"
                >
                  <IoClose />
                </button>
              </div>

              {/* Selector de modo */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-0.5 mb-3">
                <button
                  onClick={() => setModoBuscador("referencia")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${modoBuscador === "referencia" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
                >Referencia</button>
                <button
                  onClick={() => { setModoBuscador("texto"); setBusquedaTexto(""); setResultadosTexto([]); setTimeout(() => inputTextoRef.current?.focus(), 50); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${modoBuscador === "texto" ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
                >Buscar Texto</button>
              </div>

              {/* Stepper compacto — solo en modo referencia */}
              {modoBuscador === "referencia" && (
                <div className="flex items-center gap-1">
                  {[{n:1,label:"Libro",color:"blue"},{n:2,label:"Capítulo",color:"green"},{n:3,label:"Versículo",color:"purple"}].map((step, i) => (
                    <div key={step.n} className="flex items-center gap-1 min-w-0">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                        pasoActual === step.n
                          ? step.color === "blue" ? "bg-blue-500/20 border-blue-500/40 text-blue-300" :
                            step.color === "green" ? "bg-green-500/20 border-green-500/40 text-green-300" :
                            "bg-purple-500/20 border-purple-500/40 text-purple-300"
                          : pasoActual > step.n
                            ? "bg-white/8 border-white/15 text-white/70"
                            : "bg-transparent border-white/10 text-white/30"
                      }`}>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${pasoActual >= step.n ? "bg-current/20" : ""}`}>{step.n}</span>
                        <span className="hidden sm:inline">{step.label}</span>
                      </div>
                      {i < 2 && <div className={`w-4 h-px shrink-0 ${pasoActual > step.n ? "bg-white/30" : "bg-white/10"}`} />}
                    </div>
                  ))}
                  {libroSeleccionadoBuscador && (
                    <div className="ml-auto flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] text-blue-400 font-medium truncate max-w-[100px]">{libroSeleccionadoBuscador.nombre}</span>
                      {capituloSeleccionadoBuscador && (<><span className="text-white/20 text-[10px]">·</span><span className="text-[11px] text-green-400 font-medium">Cap. {capituloSeleccionadoBuscador}</span></>)}
                      {pasoActual > 1 && (
                        <button onClick={retrocederPaso} className="ml-1 flex items-center gap-0.5 text-[11px] text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 px-1.5 py-0.5 rounded-md transition-all">
                          <IoChevronBack className="text-[10px]" /> Atrás
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Campo de búsqueda ── */}
            {modoBuscador === "referencia" && (
            <div className="px-4 py-3 border-b border-white/6 shrink-0">
              <div className="relative">
                <IoSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400/70 text-sm pointer-events-none" />
                <input
                  ref={inputBuscadorRef}
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={manejarTeclasBuscador}
                  className="w-full pl-9 pr-9 py-3 bg-slate-800 border-2 border-slate-600 hover:border-slate-500 focus:border-indigo-500 rounded-xl text-white placeholder-slate-400 focus:outline-none transition-colors text-sm"
                  placeholder={
                    pasoActual === 1
                      ? "Buscar libro... (ej: Juan, Salmos, Génesis)"
                      : pasoActual === 2
                        ? `Número de capítulo en ${libroSeleccionadoBuscador?.nombre}...`
                        : `Número de versículo...`
                  }
                />
                {busqueda && (
                  <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                    <IoClose className="text-sm" />
                  </button>
                )}
              </div>
            </div>
            )}

            {/* ── Búsqueda por texto ── */}
            {modoBuscador === "texto" && (
              <div className="px-4 py-3 border-b border-white/6 shrink-0">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <IoSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-400/70 text-sm pointer-events-none" />
                    <input
                      ref={inputTextoRef}
                      type="text"
                      value={busquedaTexto}
                      onChange={(e) => setBusquedaTexto(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") buscarEnTodaLaBiblia(); }}
                      placeholder="Ej: la paz os dejo, todo lo puedo..."
                      className="w-full pl-9 pr-3 py-3 bg-slate-800 border-2 border-slate-600 hover:border-slate-500 focus:border-violet-500 rounded-xl text-white placeholder-slate-400 focus:outline-none transition-colors text-sm"
                    />
                  </div>
                  <button
                    onClick={buscarEnTodaLaBiblia}
                    disabled={buscandoTexto || !busquedaTexto.trim()}
                    className="px-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed border border-violet-500/30 rounded-xl text-white text-sm font-semibold transition-colors shrink-0"
                  >
                    {buscandoTexto ? "..." : "Buscar"}
                  </button>
                </div>
                {buscandoTexto && (
                  <p className="text-[11px] text-slate-500 mt-2">
                    Buscando en libro {librosBuscados} / 66...
                  </p>
                )}
              </div>
            )}

            {/* ── Área de resultados / browse ── */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">

            {/* ── Resultados de búsqueda por texto ── */}
            {modoBuscador === "texto" && (
              <div>
                {!buscandoTexto && resultadosTexto.length === 0 && !busquedaTexto.trim() && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-sm font-medium text-slate-300 mb-1">Busca en toda la Biblia</p>
                    <p className="text-xs text-slate-500">Escribe una frase y presiona Buscar o Enter</p>
                  </div>
                )}
                {!buscandoTexto && resultadosTexto.length === 0 && busquedaTexto.trim() && !buscandoTexto && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <IoSearch className="text-3xl text-slate-600 mb-3" />
                    <p className="text-sm text-slate-400">Sin resultados para "{busquedaTexto}"</p>
                  </div>
                )}
                {resultadosTexto.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 mb-2">{resultadosTexto.length} resultado{resultadosTexto.length !== 1 ? "s" : ""}{resultadosTexto.length === 60 ? " (máx.)" : ""}</p>
                    {resultadosTexto.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => proyectarResultadoTexto(r)}
                        className="w-full text-left px-3 py-2.5 rounded-xl border border-white/6 bg-white/4 hover:bg-violet-500/12 hover:border-violet-400/30 transition-all"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-2 h-2 rounded-full bg-violet-400 shrink-0 mt-1.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-violet-300 mb-0.5">{r.libroNombre} {r.capitulo}:{r.versiculo}</p>
                            <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{r.texto}</p>
                          </div>
                          <span className="shrink-0 text-[9px] text-slate-600 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded mt-0.5">Proyectar</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Resultados modo referencia ── */}
            {modoBuscador === "referencia" && (<>

              {/* Sin búsqueda en paso 1: mostrar todos los libros */}
              {pasoActual === 1 && !busqueda.trim() && (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-amber-500/70 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FaBookOpen className="text-[9px]" /> Antiguo Testamento
                      <span className="text-amber-500/40">({librosDeLaBiblia.antiguoTestamento.length})</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {librosDeLaBiblia.antiguoTestamento.map((libro, i) => (
                        <button
                          key={libro.id}
                          type="button"
                          onClick={() => seleccionarResultadoRapido({tipo:"libro", libro, titulo:libro.nombre, descripcion:""})}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-amber-500/12 bg-amber-500/5 hover:border-amber-400/35 hover:bg-amber-500/12 text-left transition-all group"
                        >
                          <span className="shrink-0 text-[9px] text-amber-600/50 group-hover:text-amber-500/70 w-4 tabular-nums">{i+1}</span>
                          <span className="text-[11px] text-slate-300 group-hover:text-amber-200 leading-tight truncate">{libro.nombre}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-500/70 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <IoBook className="text-[9px]" /> Nuevo Testamento
                      <span className="text-emerald-500/40">({librosDeLaBiblia.nuevoTestamento.length})</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {librosDeLaBiblia.nuevoTestamento.map((libro, i) => (
                        <button
                          key={libro.id}
                          type="button"
                          onClick={() => seleccionarResultadoRapido({tipo:"libro", libro, titulo:libro.nombre, descripcion:""})}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-emerald-500/12 bg-emerald-500/5 hover:border-emerald-400/35 hover:bg-emerald-500/12 text-left transition-all group"
                        >
                          <span className="shrink-0 text-[9px] text-emerald-600/50 group-hover:text-emerald-500/70 w-4 tabular-nums">{i+1}</span>
                          <span className="text-[11px] text-slate-300 group-hover:text-emerald-200 leading-tight truncate">{libro.nombre}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sin búsqueda en paso 2 o 3 */}
              {(pasoActual === 2 || pasoActual === 3) && !busqueda.trim() && resultadosBusqueda.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-4xl mb-3">{pasoActual === 2 ? "📋" : "📖"}</div>
                  <p className="text-sm font-medium text-slate-300 mb-1">
                    {pasoActual === 2 ? `¿Qué capítulo de ${libroSeleccionadoBuscador?.nombre}?` : `¿Qué versículo del capítulo ${capituloSeleccionadoBuscador}?`}
                  </p>
                  <p className="text-xs text-slate-500">Escribe el número arriba</p>
                </div>
              )}

              {/* Sin resultados con búsqueda */}
              {resultadosBusqueda.length === 0 && busqueda.trim() && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <IoSearch className="text-3xl text-slate-600 mb-3" />
                  <p className="text-sm font-medium text-slate-300">Sin resultados para "{busqueda}"</p>
                  <p className="text-xs text-slate-500 mt-1">Intenta con otro término</p>
                </div>
              )}

              {/* Resultados de búsqueda */}
              {resultadosBusqueda.length > 0 && (
                <div className="space-y-1">
                  {resultadosBusqueda.map((resultado, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                        index === indiceSeleccionado
                          ? "bg-indigo-500/18 border-indigo-400/40 shadow-sm"
                          : "bg-white/4 border-white/6 hover:bg-white/8 hover:border-white/12"
                      }`}
                      onClick={() => seleccionarResultadoRapido(resultado)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          resultado.tipo === "libro" ? "bg-blue-400" :
                          resultado.tipo === "capitulo" ? "bg-green-400" : "bg-purple-400"
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{resultado.titulo}</p>
                          {resultado.descripcion && (
                            <p className="text-[11px] text-slate-400 truncate">{resultado.descripcion}</p>
                          )}
                        </div>
                        {index === indiceSeleccionado && (
                          <span className="shrink-0 text-[10px] text-indigo-400 bg-indigo-500/15 border border-indigo-500/25 px-1.5 py-0.5 rounded">Enter</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>)}
            </div>

            {/* ── Footer con acciones ── */}
            <div className="px-4 py-3 border-t border-white/6 flex items-center gap-2 shrink-0">
              {modoBuscador === "referencia" ? (
                <button
                  onClick={resetearBuscador}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 rounded-lg transition-all"
                >
                  Reiniciar
                </button>
              ) : (
                <button
                  onClick={() => { setBusquedaTexto(""); setResultadosTexto([]); setBuscandoTexto(false); }}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 rounded-lg transition-all"
                >
                  Limpiar
                </button>
              )}
              <button
                onClick={() => { setMostrarBuscador(false); resetearBuscador(); setModoBuscador("referencia"); }}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-red-500/15 border border-white/8 hover:border-red-500/20 rounded-lg transition-all"
              >
                <IoClose className="text-xs" /> Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Biblia;
