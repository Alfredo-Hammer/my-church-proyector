// src/pages/AgregarHimno.jsx
import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {toast, ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaEdit,
  FaTrash,
  FaHeart,
  FaRegHeart,
  FaPlus,
  FaSearch,
  FaDownload,
  FaBookOpen,
  FaCloud,
  FaCopy,
  FaExternalLinkAlt,
  FaGlobe,
  FaClipboard,
  FaFilter,
  FaTh,
  FaList,
  FaThLarge,
  FaTimes,
  FaMusic,
  FaCalendar,
  FaStar,
  FaUsers,
  FaChurch,
  FaBible,
} from "react-icons/fa";

const coloresGradientes = [
  "bg-gradient-to-r from-blue-500 to-blue-700",
  "bg-gradient-to-r from-green-500 to-green-700",
  "bg-gradient-to-r from-yellow-500 to-yellow-700",
  "bg-gradient-to-r from-purple-500 to-purple-700",
  "bg-gradient-to-r from-pink-500 to-pink-700",
  "bg-gradient-to-r from-indigo-500 to-indigo-700",
  "bg-gradient-to-r from-teal-500 to-teal-700",
  "bg-gradient-to-r from-red-500 to-red-700",
  "bg-gradient-to-r from-orange-500 to-orange-700",
  "bg-gradient-to-r from-cyan-500 to-cyan-700",
];

export default function AgregarHimno() {
  const [himnos, setHimnos] = useState([]);
  const [himnosEnLinea, setHimnosEnLinea] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalBusquedaVisible, setModalBusquedaVisible] = useState(false);
  const [numero, setNumero] = useState("");
  const [titulo, setTitulo] = useState("");
  const [letra, setLetra] = useState("");
  const [autor, setAutor] = useState("");
  const [categoria, setCategoria] = useState("Adoración");
  const [editId, setEditId] = useState(null);
  const [favoritos, setFavoritos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaEnLinea, setBusquedaEnLinea] = useState("");
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [ordenamiento, setOrdenamiento] = useState("titulo");
  const [vistaActual, setVistaActual] = useState("list");

  // Estados para navegador integrado
  const [modalBrowserVisible, setModalBrowserVisible] = useState(false);
  const [browserUrl, setBrowserUrl] = useState("");
  const [himnoParaBuscar, setHimnoParaBuscar] = useState(null);
  const [letraEncontrada, setLetraEncontrada] = useState("");

  const navigate = useNavigate();

  const categorias = [
    "Adoración",
    "Alabanza",
    "Navideñas",
    "Pascua",
    "Juveniles",
    "Infantiles",
    "Evangelísticas",
    "Consolación",
    "Acción de Gracias",
    "Bautismo",
    "Cena del Señor",
    "Oración",
    "Misiones",
    "Avivamiento",
    "Despedida",
    "Especiales",
    "Himnario Adventista",
    "Otros",
  ];

  useEffect(() => {
    fetchHimnos();
    fetchFavoritos();
  }, []);

  // Función para obtener himnos de la base de datos
  const fetchHimnos = async () => {
    try {
      const data = await window.electron.obtenerHimnos();
      setHimnos(data);
    } catch (error) {
      console.error("Error al obtener los himnos:", error);
      toast.error("Error al cargar los himnos");
    }
  };

  // Función para obtener favoritos de la base de datos
  const fetchFavoritos = async () => {
    try {
      const data = await window.electron.obtenerFavoritos();
      setFavoritos(data.map((fav) => fav.id));
    } catch (error) {
      console.error("Error al obtener los favoritos:", error);
      toast.error("Error al cargar los favoritos");
    }
  };

  // Base de datos expandida de himnos locales
  const buscarHimnosLocales = async (query) => {
    const himnosExpandidos = [
      {
        id: "local_1",
        titulo: "Sublime Gracia",
        autor: "John Newton",
        categoria: "Adoración",
        letra: [
          "Sublime gracia del Señor",
          "que a un infeliz salvó",
          "Fui ciego mas hoy miro yo",
          "perdido y él me halló",
          "",
          "Su gracia me enseñó a temer",
          "mis dudas ahuyentó",
          "¡Oh cuán precioso fue a mi ser",
          "cuando él me transformó!",
        ],
        fuente: "Himnario Bautista",
      },
      {
        id: "local_2",
        titulo: "Santo, Santo, Santo",
        autor: "Reginald Heber",
        categoria: "Adoración",
        letra: [
          "Santo, Santo, Santo, Señor Omnipotente",
          "Siempre el labio mío loores te dará",
          "Santo, Santo, Santo, te adoro reverente",
          "Dios en tres personas, bendita trinidad",
          "",
          "Santo, Santo, Santo, la inmensa muchedumbre",
          "de ángeles que están ante el trono celestial",
          "ante Ti se postra, bañada en tu vislumbre",
          "ante Ti que has sido, que eres y serás",
        ],
        fuente: "Himnario Tradicional",
      },
      {
        id: "local_3",
        titulo: "Cuán Grande es Él",
        autor: "Stuart K. Hine",
        categoria: "Alabanza",
        letra: [
          "Señor mi Dios, al contemplar los cielos",
          "El firmamento y las estrellas mil",
          "Al oír tu voz en los potentes truenos",
          "Y ver brillar el sol en su cenit",
          "",
          "Mi corazón entona la canción",
          "Cuán grande es Él, cuán grande es Él",
          "Mi corazón entona la canción",
          "Cuán grande es Él, cuán grande es Él",
        ],
        fuente: "Himnario Adventista",
      },
      {
        id: "local_4",
        titulo: "Amazing Grace",
        autor: "John Newton",
        categoria: "Worship",
        letra: [
          "Amazing grace, how sweet the sound",
          "That saved a wretch like me",
          "I once was lost, but now I'm found",
          "Was blind, but now I see",
          "",
          "'Twas grace that taught my heart to fear",
          "And grace my fears relieved",
          "How precious did that grace appear",
          "The hour I first believed",
        ],
        fuente: "Traditional Hymnal",
      },
      {
        id: "local_5",
        titulo: "Tu Fidelidad",
        autor: "Marcos Witt",
        categoria: "Adoración Moderna",
        letra: [
          "Tu fidelidad es grande",
          "Tu fidelidad incomparable es",
          "Nadie como tú, bendito Dios",
          "Grande es tu fidelidad",
          "",
          "Grande es tu fidelidad",
          "Grande es tu fidelidad",
          "Cada mañana veo",
          "Grande es tu fidelidad",
        ],
        fuente: "CanZion Producciones",
      },
    ];

    return himnosExpandidos.filter(
      (himno) =>
        himno.titulo.toLowerCase().includes(query.toLowerCase()) ||
        himno.autor.toLowerCase().includes(query.toLowerCase()) ||
        himno.categoria.toLowerCase().includes(query.toLowerCase()) ||
        himno.letra.some((linea) =>
          linea.toLowerCase().includes(query.toLowerCase()),
        ),
    );
  };

  // Función de búsqueda local
  const buscarHimnosEnLinea = async () => {
    if (!busquedaEnLinea.trim()) {
      toast.warning("Ingresa un término de búsqueda");
      return;
    }

    setCargandoBusqueda(true);
    try {
      const himnosLocales = await buscarHimnosLocales(busquedaEnLinea);
      setHimnosEnLinea(himnosLocales);

      if (himnosLocales.length > 0) {
        toast.success(`📚 ${himnosLocales.length} himnos encontrados`);
      } else {
        toast.info("No se encontraron himnos con ese término de búsqueda");
      }
    } catch (error) {
      console.error("Error en búsqueda:", error);
      toast.error("❌ Error en la búsqueda");
    } finally {
      setCargandoBusqueda(false);
    }
  };

  // Función para importar himno local
  const importarHimnoLocal = (himnoLocal) => {
    setNumero("");
    setTitulo(himnoLocal.titulo);
    setLetra(himnoLocal.letra.join("\n\n"));
    setAutor(himnoLocal.autor);
    setCategoria(himnoLocal.categoria);
    setTags([himnoLocal.fuente]);
    setModalBusquedaVisible(false);
    setModalVisible(true);
    toast.info("📖 Himno importado, completa los datos y guarda");
  };

  // Función para abrir navegador para buscar letra
  const buscarLetraEnNavegador = (terminoBusqueda = "") => {
    const query = terminoBusqueda || busquedaEnLinea;
    if (!query.trim()) {
      toast.warning("Ingresa un término de búsqueda");
      return;
    }

    setHimnoParaBuscar({titulo: query, autor: ""});
    setBrowserUrl(
      `https://www.musica.com/letras.asp?letra=${encodeURIComponent(query)}`,
    );
    setModalBrowserVisible(true);
    setLetraEncontrada("");
  };

  // Función para abrir sitio externo
  const abrirSitioExterno = (url) => {
    if (window.electron && window.electron.abrirEnlaceExterno) {
      window.electron.abrirEnlaceExterno(url);
    } else {
      window.open(url, "_blank");
    }
  };

  // Función para cambiar URL del navegador
  const cambiarUrlBrowser = (nuevaUrl) => {
    setBrowserUrl(nuevaUrl);
  };

  // Función para procesar letra encontrada
  const procesarLetraEncontrada = () => {
    if (!letraEncontrada.trim()) {
      toast.warning("Por favor, pega la letra encontrada");
      return;
    }

    const letraProcesada = letraEncontrada
      .trim()
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p !== "");

    setNumero("");
    setTitulo(himnoParaBuscar?.titulo || "");
    setLetra(letraProcesada.join("\n\n"));
    setAutor(himnoParaBuscar?.autor || "");
    setCategoria("Adoración");

    setModalBrowserVisible(false);
    setModalBusquedaVisible(false);
    setModalVisible(true);

    toast.success(
      "✅ Letra agregada exitosamente. Completa los datos y guarda el himno.",
    );
  };

  const handleGuardar = async () => {
    if (!titulo.trim() || !letra.trim()) {
      toast.error("Título y letra son obligatorios.");
      return;
    }

    const himno = {
      numero: numero.trim() || "",
      titulo,
      letra: letra
        .split("\n\n")
        .map((p) => p.trim())
        .filter((p) => p !== ""),
      autor: autor.trim(),
      categoria,
      fecha_creacion: new Date().toISOString(),
      fecha_modificacion: new Date().toISOString(),
    };

    try {
      if (editId) {
        await window.electron.actualizarHimno({id: editId, ...himno});
        toast.success("Himno actualizado con éxito");
      } else {
        await window.electron.agregarHimno(himno);
        toast.success("Himno agregado con éxito");
      }
      cerrarModal();
      fetchHimnos();
    } catch (error) {
      console.error("Error al guardar el himno:", error);
      toast.error("Ocurrió un error al guardar el himno.");
    }
  };

  const handleEditar = (himno) => {
    setNumero(himno.numero || "");
    setTitulo(himno.titulo);
    setLetra(himno.letra.join("\n\n"));
    setAutor(himno.autor || "");
    setCategoria(himno.categoria || "Adoración");
    setEditId(himno.id);
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
    setAutor("");
    setCategoria("Adoración");
    setEditId(null);
  };

  const handleNavigate = (id) => {
    navigate(`/himno-detalle/${id}`);
  };

  const toggleFavorito = async (id) => {
    try {
      if (favoritos.includes(id)) {
        await window.electron.marcarFavorito(id, false);
        setFavoritos((prev) => prev.filter((favId) => favId !== id));
        toast.info("Himno eliminado de favoritos.");
      } else {
        await window.electron.marcarFavorito(id, true);
        setFavoritos((prev) => [...prev, id]);
        toast.success("Himno agregado a favoritos.");
      }
    } catch (error) {
      console.error("Error al actualizar favoritos:", error);
      toast.error("Ocurrió un error al actualizar favoritos.");
    }
  };

  const duplicarHimno = async (himno) => {
    const himnoDuplicado = {
      ...himno,
      titulo: `${himno.titulo} (Copia)`,
      numero: `${himno.numero}-C`,
    };
    delete himnoDuplicado.id;

    try {
      await window.electron.agregarHimno(himnoDuplicado);
      toast.success("Himno duplicado exitosamente");
      fetchHimnos();
    } catch (error) {
      toast.error("Error al duplicar himno");
    }
  };

  // Filtrar y ordenar himnos
  const himnosFiltrados = himnos
    .filter((himno) => {
      const cumpleBusqueda =
        !busqueda ||
        himno.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        himno.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
        (himno.autor &&
          himno.autor.toLowerCase().includes(busqueda.toLowerCase())) ||
        himno.letra.some((parrafo) =>
          parrafo.toLowerCase().includes(busqueda.toLowerCase()),
        );

      const cumpleCategoria =
        !filtroCategoria || himno.categoria === filtroCategoria;

      return cumpleBusqueda && cumpleCategoria;
    })
    .sort((a, b) => {
      switch (ordenamiento) {
        case "titulo":
          return a.titulo.localeCompare(b.titulo);
        case "numero":
          return a.numero.localeCompare(b.numero);
        case "autor":
          return (a.autor || "").localeCompare(b.autor || "");
        case "categoria":
          return (a.categoria || "").localeCompare(b.categoria || "");
        case "fecha":
          return (
            new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0)
          );
        default:
          return 0;
      }
    });

  // Función para obtener el icono de categoría
  const getCategoryIcon = (categoria) => {
    switch (categoria) {
      case "Adoración":
        return <FaStar className="text-yellow-400" />;
      case "Alabanza":
        return <FaMusic className="text-green-400" />;
      case "Navideñas":
        return <FaChurch className="text-red-400" />;
      case "Juveniles":
        return <FaUsers className="text-blue-400" />;
      case "Infantiles":
        return <FaHeart className="text-pink-400" />;
      default:
        return <FaBible className="text-purple-400" />;
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 h-full flex flex-col overflow-hidden">
      <ToastContainer />

      {/* ── Barra de herramientas compacta ── */}
      <div className="shrink-0 bg-slate-900/98 backdrop-blur border-b border-slate-700/50 px-3 py-2">
        <div className="flex items-center gap-2">

          {/* Título */}
          <div className="flex items-center gap-1.5 shrink-0">
            <FaBible className="text-violet-400 text-sm" />
            <span className="text-sm font-semibold text-white hidden sm:inline">Mis Himnos</span>
          </div>

          <div className="w-px h-5 bg-slate-700 shrink-0" />

          {/* Búsqueda */}
          <div className="flex-1 relative min-w-0">
            <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar himnos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-7 pr-7 py-1.5 bg-slate-800 border border-slate-600/60 hover:border-slate-500 focus:border-violet-500/70 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <FaTimes className="text-xs" />
              </button>
            )}
          </div>

          {/* Categoría */}
          <div className="flex items-center gap-1 shrink-0">
            <FaFilter className="text-slate-500 text-xs" />
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="bg-slate-800 border border-slate-600/60 hover:border-slate-500 focus:border-violet-500/70 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none transition-colors"
            >
              <option value="" className="bg-slate-800">Todas</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-800">{cat}</option>
              ))}
            </select>
          </div>

          {/* Ordenamiento */}
          <select
            value={ordenamiento}
            onChange={(e) => setOrdenamiento(e.target.value)}
            className="shrink-0 bg-slate-800 border border-slate-600/60 hover:border-slate-500 focus:border-violet-500/70 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none transition-colors hidden md:block"
          >
            <option value="titulo" className="bg-slate-800">Título</option>
            <option value="numero" className="bg-slate-800">Número</option>
            <option value="autor" className="bg-slate-800">Autor</option>
            <option value="categoria" className="bg-slate-800">Categoría</option>
            <option value="fecha" className="bg-slate-800">Fecha</option>
          </select>

          {/* Vista toggle */}
          <div className="flex items-center gap-0.5 bg-slate-800 border border-slate-600/60 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setVistaActual("list")}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${vistaActual === "list" ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
              title="Lista"
            ><FaList className="text-xs" /></button>
            <button
              onClick={() => setVistaActual("grid")}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${vistaActual === "grid" ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
              title="Grid"
            ><FaTh className="text-xs" /></button>
            <button
              onClick={() => setVistaActual("compact")}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${vistaActual === "compact" ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
              title="Compacto"
            ><FaThLarge className="text-xs" /></button>
          </div>

          {/* Stats */}
          <span className="hidden md:block text-[11px] text-slate-500 tabular-nums shrink-0">
            {himnosFiltrados.length}/{himnos.length}
          </span>

          {/* Crear */}
          <button
            onClick={() => { cerrarModal(); setModalVisible(true); }}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/80 hover:bg-violet-600 border border-violet-500/30 rounded-lg text-xs font-semibold text-white transition-colors"
          >
            <FaPlus className="text-[10px]" />
            <span className="hidden sm:inline">Crear</span>
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {himnosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <FaBookOpen className="text-3xl text-slate-700 mb-3" />
            <p className="text-slate-400 text-sm mb-1 font-medium">
              {busqueda ? "Sin resultados" : "Biblioteca vacía"}
            </p>
            <p className="text-slate-600 text-xs mb-4">
              {busqueda ? `No hay himnos para "${busqueda}"` : "Crea tu primer himno personalizado"}
            </p>
            <button
              onClick={() => { cerrarModal(); setModalVisible(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600/80 hover:bg-violet-600 border border-violet-500/30 rounded-lg text-sm font-medium transition-colors"
            >
              <FaPlus className="text-xs" /> Crear himno
            </button>
          </div>
        ) : (
          <div
            className={
              vistaActual === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                : vistaActual === "list"
                  ? "flex flex-col gap-1"
                  : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9 gap-2"
            }
          >
            {himnosFiltrados.map((himno, index) => (
              <div
                key={himno.id}
                className={
                  vistaActual === "grid"
                    ? "bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-violet-500/30 rounded-xl p-4 transition-all group cursor-pointer"
                    : vistaActual === "list"
                      ? "flex items-center gap-3 px-3 py-2 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/50 hover:border-slate-600/70 rounded-lg transition-colors group"
                      : "bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-violet-500/30 rounded-xl p-3 transition-all group cursor-pointer text-center"
                }
              >
                {vistaActual === "grid" && (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(himno.categoria)}
                        <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">
                          #{himno.numero}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorito(himno.id);
                        }}
                        className={`transition-colors ${
                          favoritos.includes(himno.id)
                            ? "text-red-400 hover:text-red-300"
                            : "text-gray-400 hover:text-red-400"
                        }`}
                      >
                        {favoritos.includes(himno.id) ? (
                          <FaHeart />
                        ) : (
                          <FaRegHeart />
                        )}
                      </button>
                    </div>

                    <div
                      onClick={() => handleNavigate(himno.id)}
                      className="mb-4"
                    >
                      <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                        {himno.titulo}
                      </h3>
                      {himno.autor && (
                        <p className="text-sm text-gray-400 mb-2">
                          por {himno.autor}
                        </p>
                      )}
                      <span className="inline-block bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full">
                        {himno.categoria}
                      </span>
                    </div>

                    {himno.tags && himno.tags.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {himno.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicarHimno(himno);
                          }}
                          className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors"
                          title="Duplicar"
                        >
                          <FaCopy />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditar(himno);
                          }}
                          className="p-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEliminar(himno.id);
                          }}
                          className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {vistaActual === "list" && (
                  <>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="shrink-0 text-[10px] text-violet-400/70 font-bold tabular-nums w-8 text-center">{himno.numero || "—"}</span>
                      <div
                        onClick={() => handleNavigate(himno.id)}
                        className="cursor-pointer flex-1 min-w-0"
                      >
                        <p className="text-sm text-slate-300 group-hover:text-white truncate transition-colors">{himno.titulo}</p>
                        {(himno.autor || himno.categoria) && (
                          <p className="text-[11px] text-slate-400 truncate">{himno.autor}{himno.autor && himno.categoria ? " · " : ""}{himno.categoria}</p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleFavorito(himno.id)}
                        className={`shrink-0 p-1.5 rounded-lg transition-colors ${favoritos.includes(himno.id) ? "text-rose-400" : "text-slate-600 hover:text-rose-400"}`}
                      >
                        {favoritos.includes(himno.id) ? <FaHeart className="text-xs" /> : <FaRegHeart className="text-xs" />}
                      </button>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      <button onClick={() => handleEditar(himno)} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors" title="Editar">
                        <FaEdit className="text-xs" />
                      </button>
                      <button onClick={() => handleEliminar(himno.id)} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Eliminar">
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </>
                )}

                {vistaActual === "compact" && (
                  <div onClick={() => handleNavigate(himno.id)}>
                    <div className="flex items-center justify-center mb-2">
                      {getCategoryIcon(himno.categoria)}
                    </div>
                    <div className="text-sm font-bold truncate mb-1">
                      {himno.titulo}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                      #{himno.numero}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorito(himno.id);
                      }}
                      className={`${
                        favoritos.includes(himno.id)
                          ? "text-red-400"
                          : "text-gray-400 hover:text-red-400"
                      }`}
                    >
                      {favoritos.includes(himno.id) ? (
                        <FaHeart size={12} />
                      ) : (
                        <FaRegHeart size={12} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para crear/editar himno */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
            {/* Header compacto */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 shrink-0">
              <div className="flex items-center gap-2">
                <FaMusic className="text-violet-400 text-sm" />
                <span className="text-sm font-semibold text-white">
                  {editId ? "Editar Himno" : "Nuevo Himno"}
                </span>
              </div>
              <button onClick={cerrarModal} className="text-slate-400 hover:text-white transition-colors p-1 rounded">
                <FaTimes className="text-sm" />
              </button>
            </div>

            {/* Cuerpo */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna izquierda */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Número <span className="text-slate-600">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: 001"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600/60 hover:border-slate-500 focus:border-violet-500/70 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Categoría</label>
                      <select
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600/60 hover:border-slate-500 focus:border-violet-500/70 rounded-lg text-sm text-white focus:outline-none transition-colors"
                      >
                        {categorias.map((cat) => (
                          <option key={cat} value={cat} className="bg-slate-800">{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Título <span className="text-violet-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Título del himno"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600/60 hover:border-slate-500 focus:border-violet-500/70 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Autor</label>
                    <input
                      type="text"
                      placeholder="Nombre del autor"
                      value={autor}
                      onChange={(e) => setAutor(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600/60 hover:border-slate-500 focus:border-violet-500/70 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Columna derecha - Letra */}
                <div className="flex flex-col">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Letra <span className="text-violet-400">*</span>
                    <span className="text-slate-600 ml-1">(doble Enter = nuevo párrafo)</span>
                  </label>
                  <textarea
                    placeholder={"Escribe la letra del himno aquí...\n\nSepara cada párrafo con doble Enter"}
                    value={letra}
                    onChange={(e) => setLetra(e.target.value)}
                    className="flex-1 min-h-[180px] px-3 py-2 bg-slate-800 border border-slate-600/60 hover:border-slate-500 focus:border-violet-500/70 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-700/50 shrink-0">
              <button
                onClick={cerrarModal}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600/50 text-slate-300 text-sm rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={!titulo.trim() || !letra.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-violet-600/80 hover:bg-violet-600 disabled:bg-slate-700 disabled:text-slate-500 border border-violet-500/30 disabled:border-slate-600/30 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                <FaDownload className="text-xs" />
                {editId ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de búsqueda online */}
      {modalBusquedaVisible && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-500/20 p-3 rounded-full">
                    <FaCloud className="text-green-400 text-xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Buscar Himnos Online
                    </h2>
                    <p className="text-gray-400 text-sm">
                      Encuentra letras en nuestra biblioteca local
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setModalBusquedaVisible(false)}
                  className="text-gray-400 hover:text-white transition-colors p-2"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar himno o letra..."
                    value={busquedaEnLinea}
                    onChange={(e) => setBusquedaEnLinea(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && buscarHimnosEnLinea()
                    }
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300"
                  />
                </div>
                <button
                  onClick={buscarHimnosEnLinea}
                  disabled={cargandoBusqueda}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-700 disabled:to-gray-800 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-all duration-300"
                >
                  {cargandoBusqueda ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Buscando...
                    </>
                  ) : (
                    <>
                      <FaSearch />
                      Buscar Local
                    </>
                  )}
                </button>
              </div>

              {/* Sección de búsqueda en línea - REDISEÑADA */}
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 rounded-lg">
                    <FaGlobe className="text-white text-lg" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Buscar en Internet
                    </h3>
                    <p className="text-xs text-gray-400">
                      Encuentra letras en sitios especializados
                    </p>
                  </div>
                </div>

                {/* Botones principales - Navegador integrado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => buscarLetraEnNavegador()}
                    disabled={!busquedaEnLinea.trim()}
                    className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-50 text-white px-6 py-4 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-green-500/50 hover:scale-105 disabled:hover:scale-100"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    <FaMusic className="text-xl relative z-10" />
                    <span className="relative z-10">Musica.com</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!busquedaEnLinea.trim()) {
                        toast.warning("Ingresa un término de búsqueda");
                        return;
                      }
                      setHimnoParaBuscar({
                        titulo: busquedaEnLinea,
                        autor: "",
                      });
                      setBrowserUrl(
                        `https://www.azlyrics.com/search.php?q=${encodeURIComponent(
                          busquedaEnLinea,
                        )}`,
                      );
                      setModalBrowserVisible(true);
                    }}
                    disabled={!busquedaEnLinea.trim()}
                    className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-50 text-white px-6 py-4 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-blue-500/50 hover:scale-105 disabled:hover:scale-100"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    <FaGlobe className="text-xl relative z-10" />
                    <span className="relative z-10">AZLyrics</span>
                  </button>
                </div>

                {/* Divisor con texto */}
                <div className="relative flex items-center justify-center my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600/50"></div>
                  </div>
                  <span className="relative bg-gray-800/80 px-4 py-1 rounded-full text-xs text-gray-400 font-medium">
                    o buscar en navegador externo
                  </span>
                </div>

                {/* Botones secundarios - Más compactos */}
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() =>
                      abrirSitioExterno(
                        `https://www.google.com/search?q=${encodeURIComponent(
                          busquedaEnLinea + " letra lyrics",
                        )}`,
                      )
                    }
                    disabled={!busquedaEnLinea.trim()}
                    className="bg-gray-700/50 hover:bg-gradient-to-r hover:from-red-500/80 hover:to-orange-500/80 disabled:bg-gray-800/50 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all duration-300 border border-gray-600/30 hover:border-red-500/50"
                  >
                    <FaExternalLinkAlt className="text-xs" />
                    Google
                  </button>
                  <button
                    onClick={() =>
                      abrirSitioExterno(
                        `https://www.letras.com/buscar?q=${encodeURIComponent(
                          busquedaEnLinea,
                        )}`,
                      )
                    }
                    disabled={!busquedaEnLinea.trim()}
                    className="bg-gray-700/50 hover:bg-gradient-to-r hover:from-purple-500/80 hover:to-pink-500/80 disabled:bg-gray-800/50 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all duration-300 border border-gray-600/30 hover:border-purple-500/50"
                  >
                    <FaExternalLinkAlt className="text-xs" />
                    Letras.com
                  </button>
                  <button
                    onClick={() =>
                      abrirSitioExterno(
                        `https://genius.com/search?q=${encodeURIComponent(
                          busquedaEnLinea,
                        )}`,
                      )
                    }
                    disabled={!busquedaEnLinea.trim()}
                    className="bg-gray-700/50 hover:bg-gradient-to-r hover:from-yellow-500/80 hover:to-amber-500/80 disabled:bg-gray-800/50 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all duration-300 border border-gray-600/30 hover:border-yellow-500/50"
                  >
                    <FaExternalLinkAlt className="text-xs" />
                    Genius
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FaBookOpen className="text-purple-400" />
                Biblioteca Local
              </h3>

              {himnosEnLinea.length > 0 ? (
                <div className="space-y-4">
                  {himnosEnLinea.map((himno) => (
                    <div
                      key={himno.id}
                      className="bg-gray-700/50 rounded-xl p-4 border-l-4 border-purple-500 hover:bg-gray-600/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-lg font-bold text-white">
                              {himno.titulo}
                            </h4>
                            <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                              📚 {himno.fuente}
                            </span>
                          </div>
                          <p className="text-gray-400 mb-1">
                            por {himno.autor} • {himno.categoria}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setHimnoParaBuscar(himno);
                              setBrowserUrl(
                                `https://www.musica.com/letras.asp?letra=${encodeURIComponent(
                                  himno.titulo,
                                )}`,
                              );
                              setModalBrowserVisible(true);
                            }}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                          >
                            <FaGlobe />
                            Buscar Letra
                          </button>
                          <button
                            onClick={() => importarHimnoLocal(himno)}
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300"
                          >
                            <FaDownload />
                            Importar
                          </button>
                        </div>
                      </div>

                      <div className="text-sm text-gray-300 bg-gray-800/50 p-3 rounded-lg">
                        {himno.letra.slice(0, 3).map((linea, index) => (
                          <p key={index} className="mb-1">
                            {linea}
                          </p>
                        ))}
                        {himno.letra.length > 3 && (
                          <p className="text-gray-500 italic">...</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : busquedaEnLinea && !cargandoBusqueda ? (
                <div className="text-center py-12">
                  <FaSearch className="mx-auto text-6xl text-gray-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    No se encontraron resultados
                  </h3>
                  <p className="text-gray-500 mb-4">
                    No hay himnos locales que coincidan con "{busquedaEnLinea}"
                  </p>
                  <p className="text-sm text-gray-400">
                    Intenta buscar en internet usando los botones de arriba
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FaBookOpen className="mx-auto text-6xl text-gray-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    Busca en nuestra biblioteca local
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Incluye himnos tradicionales y modernos
                  </p>
                  <div className="bg-gray-700/30 p-4 rounded-lg max-w-md mx-auto">
                    <p className="font-semibold text-purple-400 mb-2">
                      💡 Sugerencias:
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• Busca por título: "Amazing Grace"</li>
                      <li>• Busca por autor: "John Newton"</li>
                      <li>• Busca por categoría: "Adoración"</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de navegador integrado */}
      {modalBrowserVisible && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
            {/* Header simplificado */}
            <div className="bg-gray-900 p-4 rounded-t-lg border-b border-gray-600">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">
                  🔍 Buscar Letra: {himnoParaBuscar?.titulo}
                </h2>
                <button
                  onClick={() => setModalBrowserVisible(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Barra de navegación */}
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="url"
                  value={browserUrl}
                  onChange={(e) => setBrowserUrl(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && cambiarUrlBrowser(browserUrl)
                  }
                  className="flex-1 px-3 py-2 bg-gray-700 rounded-lg text-white text-sm"
                  placeholder="https://..."
                />
                <button
                  onClick={() => cambiarUrlBrowser(browserUrl)}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
                >
                  Ir
                </button>
              </div>

              {/* Sitios recomendados */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() =>
                    cambiarUrlBrowser(
                      `https://www.musica.com/letras.asp?letra=${encodeURIComponent(
                        himnoParaBuscar?.titulo || busquedaEnLinea,
                      )}`,
                    )
                  }
                  className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
                >
                  ✅ Musica.com
                </button>
                <button
                  onClick={() =>
                    cambiarUrlBrowser(
                      `https://www.azlyrics.com/search.php?q=${encodeURIComponent(
                        himnoParaBuscar?.titulo || busquedaEnLinea,
                      )}`,
                    )
                  }
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                >
                  🔍 AZLyrics
                </button>
                <button
                  onClick={() =>
                    abrirSitioExterno(
                      `https://www.google.com/search?q=${encodeURIComponent(
                        (himnoParaBuscar?.titulo || busquedaEnLinea) +
                          " letra lyrics",
                      )}`,
                    )
                  }
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm flex items-center gap-1"
                >
                  <FaExternalLinkAlt />
                  Google
                </button>
              </div>
            </div>

            {/* Contenido principal - Layout horizontal */}
            <div className="flex-1 flex">
              {/* Navegador - Lado izquierdo (más ancho) */}
              <div className="flex-1 bg-white">
                <iframe
                  src={browserUrl}
                  className="w-full h-full border-0"
                  title="Navegador integrado"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>

              {/* Área para pegar letra - Lado derecho (más estrecho) */}
              <div className="w-80 bg-gray-700 p-4 border-l border-gray-600 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <FaClipboard />
                  <label className="font-semibold text-white">
                    Pega la letra aquí:
                  </label>
                </div>
                <textarea
                  value={letraEncontrada}
                  onChange={(e) => setLetraEncontrada(e.target.value)}
                  placeholder="Copia y pega la letra de la canción aquí..."
                  className="w-full flex-1 p-3 bg-gray-600 rounded text-white resize-none text-sm min-h-[300px] max-h-[500px]"
                />
                <div className="flex justify-between gap-2 mt-3">
                  <button
                    onClick={() => setLetraEncontrada("")}
                    className="bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded text-sm"
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={procesarLetraEncontrada}
                    disabled={!letraEncontrada.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 px-4 py-2 rounded text-sm flex items-center gap-2"
                  >
                    <FaDownload />
                    Crear Himno
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
