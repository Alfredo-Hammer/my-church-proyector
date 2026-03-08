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
  FaEye,
  FaBookOpen,
  FaCloud,
  FaTag,
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
  const [modalPreviewVisible, setModalPreviewVisible] = useState(false);
  const [himnoPreview, setHimnoPreview] = useState(null);
  const [numero, setNumero] = useState("");
  const [titulo, setTitulo] = useState("");
  const [letra, setLetra] = useState("");
  const [autor, setAutor] = useState("");
  const [categoria, setCategoria] = useState("Adoración");
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [acordes, setAcordes] = useState("");
  const [notas, setNotas] = useState("");
  const [editId, setEditId] = useState(null);
  const [favoritos, setFavoritos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaEnLinea, setBusquedaEnLinea] = useState("");
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [ordenamiento, setOrdenamiento] = useState("titulo");
  const [vistaActual, setVistaActual] = useState("grid");

  // Estado para logo de la iglesia
  const [logoIglesia, setLogoIglesia] = useState(null);

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
    cargarLogoIglesia();
  }, []);

  // Función para cargar logo de la iglesia
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
    setTags(["Letra Online"]);
    setNotas(
      `Letra encontrada en línea para: ${
        himnoParaBuscar?.titulo || busquedaEnLinea
      }`,
    );

    setModalBrowserVisible(false);
    setModalBusquedaVisible(false);
    setModalVisible(true);

    toast.success(
      "✅ Letra agregada exitosamente. Completa los datos y guarda el himno.",
    );
  };

  const handleGuardar = async () => {
    if (!numero.trim() || !titulo.trim() || !letra.trim()) {
      toast.error("Número, título y letra son obligatorios.");
      return;
    }

    const himno = {
      numero,
      titulo,
      letra: letra
        .split("\n\n")
        .map((p) => p.trim())
        .filter((p) => p !== ""),
      autor: autor || "Desconocido",
      categoria,
      tags,
      acordes,
      notas,
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
    setNumero(himno.numero);
    setTitulo(himno.titulo);
    setLetra(himno.letra.join("\n\n"));
    setAutor(himno.autor || "");
    setCategoria(himno.categoria || "Adoración");
    setTags(himno.tags || []);
    setAcordes(himno.acordes || "");
    setNotas(himno.notas || "");
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
    setTags([]);
    setNewTag("");
    setAcordes("");
    setNotas("");
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

  const agregarTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag("");
    }
  };

  const eliminarTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
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

  const verPreview = (himno) => {
    setHimnoPreview(himno);
    setModalPreviewVisible(true);
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
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 min-h-screen overflow-y-auto">
      <ToastContainer />

      {/* Header con gradiente */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <FaBible className="text-2xl" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-white">
                  Biblioteca de Himnos
                </h1>
                <p className="text-white/60">
                  {himnosFiltrados.length} himnos en tu colección
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  cerrarModal();
                  setModalVisible(true);
                }}
                className="bg-emerald-600/90 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl border border-emerald-500/20 transition-colors flex items-center gap-2"
              >
                <FaPlus />
                <span>Crear Himno</span>
              </button>
            </div>
          </div>

          {/* Barra de búsqueda y filtros */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-3 text-white/40" />
                <input
                  type="text"
                  placeholder="Buscar himnos..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div className="flex items-center gap-2">
                <FaFilter className="text-white/40" />
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="" className="bg-gray-800">
                    Todas las categorías
                  </option>
                  {categorias.map((cat) => (
                    <option key={cat} value={cat} className="bg-gray-800">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={ordenamiento}
                onChange={(e) => setOrdenamiento(e.target.value)}
                className="bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="titulo" className="bg-gray-800">
                  Ordenar por Título
                </option>
                <option value="numero" className="bg-gray-800">
                  Ordenar por Número
                </option>
                <option value="autor" className="bg-gray-800">
                  Ordenar por Autor
                </option>
                <option value="categoria" className="bg-gray-800">
                  Ordenar por Categoría
                </option>
                <option value="fecha" className="bg-gray-800">
                  Ordenar por Fecha
                </option>
              </select>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVistaActual("grid")}
                  className={`p-2 rounded-lg transition-colors ${
                    vistaActual === "grid"
                      ? "bg-purple-500 text-white"
                      : "bg-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <FaTh />
                </button>
                <button
                  onClick={() => setVistaActual("list")}
                  className={`p-2 rounded-lg transition-colors ${
                    vistaActual === "list"
                      ? "bg-purple-500 text-white"
                      : "bg-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <FaList />
                </button>
                <button
                  onClick={() => setVistaActual("compact")}
                  className={`p-2 rounded-lg transition-colors ${
                    vistaActual === "compact"
                      ? "bg-purple-500 text-white"
                      : "bg-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <FaThLarge />
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-400">
              {himnosFiltrados.length} de {himnos.length} himnos
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {himnosFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-12 border border-gray-700/50 shadow-xl">
              <FaBookOpen className="mx-auto text-6xl text-gray-600 mb-6" />
              <h3 className="text-2xl font-bold text-gray-300 mb-4">
                {busqueda
                  ? "No se encontraron resultados"
                  : "Tu biblioteca está vacía"}
              </h3>
              <p className="text-gray-400 mb-6">
                {busqueda
                  ? "Intenta con otros términos de búsqueda o ajusta los filtros"
                  : "Comienza agregando tu primer himno a la colección"}
              </p>
              <button
                onClick={() => {
                  cerrarModal();
                  setModalVisible(true);
                }}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 flex items-center gap-2 mx-auto"
              >
                <FaPlus />
                Crear mi primer himno
              </button>
            </div>
          </div>
        ) : (
          <div
            className={
              vistaActual === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : vistaActual === "list"
                  ? "space-y-4"
                  : "grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8 gap-3"
            }
          >
            {himnosFiltrados.map((himno, index) => (
              <div
                key={himno.id}
                className={
                  vistaActual === "grid"
                    ? "bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group cursor-pointer"
                    : vistaActual === "list"
                      ? "bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-between group"
                      : "bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-lg p-3 border border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group cursor-pointer text-center"
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

                    <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            verPreview(himno);
                          }}
                          className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
                          title="Vista previa"
                        >
                          <FaEye />
                        </button>
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
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(himno.categoria)}
                        <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">
                          #{himno.numero}
                        </span>
                      </div>
                      <div
                        onClick={() => handleNavigate(himno.id)}
                        className="cursor-pointer flex-1"
                      >
                        <h3 className="font-bold text-white">{himno.titulo}</h3>
                        <p className="text-sm text-gray-400">
                          {himno.autor && `${himno.autor} • `}
                          {himno.categoria}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleFavorito(himno.id)}
                        className={`transition-colors ${
                          favoritos.includes(himno.id)
                            ? "text-red-400"
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
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={() => verPreview(himno)}
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => handleEditar(himno)}
                        className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleEliminar(himno.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <FaTrash />
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-500/20 p-3 rounded-full">
                    <FaBible className="text-purple-400 text-xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {editId ? "Editar Himno" : "Crear Nuevo Himno"}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      Completa la información del himno
                    </p>
                  </div>
                </div>
                <button
                  onClick={cerrarModal}
                  className="text-gray-400 hover:text-white transition-colors p-2"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Columna izquierda - Información básica */}
                <div className="space-y-6">
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FaTag className="text-purple-400" />
                      Información Básica
                    </h3>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Número *
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: 001"
                          value={numero}
                          onChange={(e) => setNumero(e.target.value)}
                          className="w-full p-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Categoría
                        </label>
                        <select
                          value={categoria}
                          onChange={(e) => setCategoria(e.target.value)}
                          className="w-full p-3 bg-white/10 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                        >
                          {categorias.map((cat) => (
                            <option
                              key={cat}
                              value={cat}
                              className="bg-gray-800"
                            >
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Título *
                      </label>
                      <input
                        type="text"
                        placeholder="Título del himno"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        className="w-full p-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Autor
                      </label>
                      <input
                        type="text"
                        placeholder="Nombre del autor"
                        value={autor}
                        onChange={(e) => setAutor(e.target.value)}
                        className="w-full p-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FaTag className="text-blue-400" />
                      Etiquetas y Notas
                    </h3>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Etiquetas
                      </label>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          placeholder="Agregar etiqueta..."
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && agregarTag()}
                          className="flex-1 p-2 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                        />
                        <button
                          onClick={agregarTag}
                          className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-lg transition-colors"
                        >
                          <FaTag />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                          >
                            #{tag}
                            <button
                              onClick={() => eliminarTag(tag)}
                              className="hover:bg-purple-600/30 rounded-full w-5 h-5 flex items-center justify-center transition-colors"
                            >
                              <FaTimes className="text-xs" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Notas adicionales
                      </label>
                      <textarea
                        placeholder="Notas sobre el himno..."
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        rows={3}
                        className="w-full p-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Columna derecha - Contenido */}
                <div className="space-y-6">
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FaMusic className="text-green-400" />
                      Letra del Himno
                    </h3>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Letra *
                      </label>
                      <textarea
                        placeholder="Escribe la letra del himno aquí...&#10;&#10;Separa cada párrafo con doble salto de línea"
                        value={letra}
                        onChange={(e) => setLetra(e.target.value)}
                        rows={15}
                        className="w-full p-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 resize-none"
                      />
                      <small className="text-gray-400 mt-2 block">
                        💡 Tip: Usa doble Enter para separar párrafos
                      </small>
                    </div>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FaMusic className="text-orange-400" />
                      Acordes (Opcional)
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Acordes musicales
                      </label>
                      <textarea
                        placeholder="Acordes del himno...&#10;Ej: G - D - Em - C"
                        value={acordes}
                        onChange={(e) => setAcordes(e.target.value)}
                        rows={6}
                        className="w-full p-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-700/50">
                <button
                  onClick={cerrarModal}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={!numero.trim() || !titulo.trim() || !letra.trim()}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-700 disabled:to-gray-800 text-white px-6 py-3 rounded-lg transition-all duration-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FaDownload />
                  {editId ? "Actualizar Himno" : "Guardar Himno"}
                </button>
              </div>
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

      {/* Modal de vista previa */}
      {modalPreviewVisible && himnoPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Vista Previa</h2>
              <button
                onClick={() => setModalPreviewVisible(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-blue-400">
                  {himnoPreview.titulo}
                </h3>
                <p className="text-gray-400">#{himnoPreview.numero}</p>
                {himnoPreview.autor && (
                  <p className="text-gray-400">por {himnoPreview.autor}</p>
                )}
                {himnoPreview.categoria && (
                  <span className="inline-block bg-blue-600 text-white text-sm px-3 py-1 rounded-full mt-2">
                    {himnoPreview.categoria}
                  </span>
                )}
              </div>

              <div className="border-t border-gray-600 pt-4">
                {himnoPreview.letra.map((parrafo, index) => (
                  <p key={index} className="mb-4 leading-relaxed">
                    {parrafo}
                  </p>
                ))}
              </div>

              {himnoPreview.acordes && (
                <div className="border-t border-gray-600 pt-4">
                  <h4 className="font-semibold mb-2">Acordes:</h4>
                  <pre className="text-sm bg-gray-700 p-3 rounded whitespace-pre-wrap">
                    {himnoPreview.acordes}
                  </pre>
                </div>
              )}

              {himnoPreview.tags && himnoPreview.tags.length > 0 && (
                <div className="border-t border-gray-600 pt-4">
                  <h4 className="font-semibold mb-2">Etiquetas:</h4>
                  <div className="flex flex-wrap gap-2">
                    {himnoPreview.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-600 px-2 py-1 rounded text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {himnoPreview.notas && (
              <div className="border-t border-gray-600 pt-4">
                <h4 className="font-semibold mb-2">Notas:</h4>
                <p className="text-sm text-gray-300">{himnoPreview.notas}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalPreviewVisible(false)}
                className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setModalPreviewVisible(false);
                  handleNavigate(himnoPreview.id);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Ver Completo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
