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
  FaStar,
  FaUsers,
  FaChurch,
  FaBible,
  FaHashtag,
  FaUserAlt,
  FaTag,
  FaAlignLeft,
  FaCheck,
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

const INPUT_BASE =
  "w-full px-3 py-2.5 bg-slate-800/80 border border-slate-600/50 hover:border-slate-500 focus:border-violet-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all duration-200 focus:bg-slate-800";

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

  const fetchHimnos = async () => {
    try {
      const todos = await window.electron.obtenerHimnos();
      setHimnos(todos.filter((h) => !h.fuente || h.fuente === "personal"));
    } catch {
      toast.error("Error al cargar los himnos");
    }
  };

  const fetchFavoritos = async () => {
    try {
      const data = await window.electron.obtenerFavoritos();
      setFavoritos(data.map((f) => f.id));
    } catch {
      toast.error("Error al cargar los favoritos");
    }
  };

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
        categoria: "Adoración",
        letra: [
          "Amazing grace, how sweet the sound",
          "That saved a wretch like me",
          "I once was lost, but now I'm found",
          "Was blind, but now I see",
        ],
        fuente: "Traditional Hymnal",
      },
      {
        id: "local_5",
        titulo: "Tu Fidelidad",
        autor: "Marcos Witt",
        categoria: "Adoración",
        letra: [
          "Tu fidelidad es grande",
          "Tu fidelidad incomparable es",
          "Nadie como tú, bendito Dios",
          "Grande es tu fidelidad",
        ],
        fuente: "CanZion Producciones",
      },
    ];
    return himnosExpandidos.filter(
      (h) =>
        h.titulo.toLowerCase().includes(query.toLowerCase()) ||
        h.autor.toLowerCase().includes(query.toLowerCase()) ||
        h.categoria.toLowerCase().includes(query.toLowerCase()) ||
        h.letra.some((l) => l.toLowerCase().includes(query.toLowerCase())),
    );
  };

  const buscarHimnosEnLinea = async () => {
    if (!busquedaEnLinea.trim()) {
      toast.warning("Ingresa un término de búsqueda");
      return;
    }
    setCargandoBusqueda(true);
    try {
      const res = await buscarHimnosLocales(busquedaEnLinea);
      setHimnosEnLinea(res);
      res.length > 0
        ? toast.success(`📚 ${res.length} himnos encontrados`)
        : toast.info("No se encontraron himnos");
    } catch {
      toast.error("Error en la búsqueda");
    } finally {
      setCargandoBusqueda(false);
    }
  };

  const importarHimnoLocal = (h) => {
    setNumero("");
    setTitulo(h.titulo);
    setLetra(h.letra.join("\n\n"));
    setAutor(h.autor);
    setCategoria(h.categoria);
    setModalBusquedaVisible(false);
    setModalVisible(true);
    toast.info("📖 Himno importado, completa los datos y guarda");
  };

  const buscarLetraEnNavegador = (term = "") => {
    const q = term || busquedaEnLinea;
    if (!q.trim()) {
      toast.warning("Ingresa un término de búsqueda");
      return;
    }
    setHimnoParaBuscar({titulo: q, autor: ""});
    setBrowserUrl(
      `https://www.musica.com/letras.asp?letra=${encodeURIComponent(q)}`,
    );
    setModalBrowserVisible(true);
    setLetraEncontrada("");
  };

  const abrirSitioExterno = (url) => {
    window.electron?.abrirEnlaceExterno
      ? window.electron.abrirEnlaceExterno(url)
      : window.open(url, "_blank");
  };

  const procesarLetraEncontrada = () => {
    if (!letraEncontrada.trim()) {
      toast.warning("Por favor, pega la letra encontrada");
      return;
    }
    const letraProcesada = letraEncontrada
      .trim()
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    setNumero("");
    setTitulo(himnoParaBuscar?.titulo || "");
    setLetra(letraProcesada.join("\n\n"));
    setAutor(himnoParaBuscar?.autor || "");
    setCategoria("Adoración");
    setModalBrowserVisible(false);
    setModalBusquedaVisible(false);
    setModalVisible(true);
    toast.success("✅ Letra agregada. Completa los datos y guarda el himno.");
  };

  const handleGuardar = async () => {
    if (!titulo.trim() || !letra.trim()) {
      toast.error("Título y letra son obligatorios.");
      return;
    }
    const himno = {
      numero: numero.trim() || "",
      titulo,
      autor: autor.trim(),
      categoria,
      letra: letra
        .split("\n\n")
        .map((p) => p.trim())
        .filter(Boolean),
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
    } catch {
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
      toast.success("Himno eliminado");
      fetchHimnos();
    } catch {
      toast.error("Error al eliminar el himno.");
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

  const handleNavigate = (id) => navigate(`/himno-detalle/${id}`);

  const toggleFavorito = async (id) => {
    try {
      if (favoritos.includes(id)) {
        await window.electron.marcarFavorito(id, false);
        setFavoritos((p) => p.filter((f) => f !== id));
        toast.info("Himno eliminado de favoritos.");
      } else {
        await window.electron.marcarFavorito(id, true);
        setFavoritos((p) => [...p, id]);
        toast.success("Himno agregado a favoritos.");
      }
    } catch {
      toast.error("Error al actualizar favoritos.");
    }
  };

  const duplicarHimno = async (himno) => {
    const dup = {
      ...himno,
      titulo: `${himno.titulo} (Copia)`,
      numero: `${himno.numero}-C`,
    };
    delete dup.id;
    try {
      await window.electron.agregarHimno(dup);
      toast.success("Himno duplicado");
      fetchHimnos();
    } catch {
      toast.error("Error al duplicar himno");
    }
  };

  const himnosFiltrados = himnos
    .filter((h) => {
      const q = busqueda.toLowerCase();
      const matchBusqueda =
        !busqueda ||
        h.titulo.toLowerCase().includes(q) ||
        h.numero.toLowerCase().includes(q) ||
        (h.autor && h.autor.toLowerCase().includes(q)) ||
        h.letra.some((p) => p.toLowerCase().includes(q));
      return (
        matchBusqueda && (!filtroCategoria || h.categoria === filtroCategoria)
      );
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

  const getCategoryIcon = (cat) => {
    switch (cat) {
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

  const getCategoryColor = (cat) => {
    const map = {
      Adoración: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
      Alabanza: "text-green-400 bg-green-500/10 border-green-500/20",
      Navideñas: "text-red-400 bg-red-500/10 border-red-500/20",
      Juveniles: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      Infantiles: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    };
    return map[cat] || "text-violet-400 bg-violet-500/10 border-violet-500/20";
  };

  const conteoCategoria = categorias.reduce((acc, cat) => {
    acc[cat] = himnos.filter((h) => h.categoria === cat).length;
    return acc;
  }, {});

  return (
    <div className="bg-[#080c14] h-full flex flex-col overflow-hidden">
      <ToastContainer theme="dark" position="bottom-right" />

      {/* ── HEADER ── */}
      <div className="shrink-0 bg-[#0d1117]/95 backdrop-blur border-b border-white/[0.06] px-4 pt-4 pb-3">
        {/* Título + stats */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
              <FaMusic className="text-violet-400 text-sm" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">
                Mis Himnos
              </h1>
              <p className="text-[11px] text-white/40 mt-0.5 leading-none">
                Biblioteca personalizada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stats compactos */}
            <div className="hidden sm:flex items-center gap-3 mr-2">
              <div className="text-center">
                <p className="text-base font-bold text-white leading-none">
                  {himnos.length}
                </p>
                <p className="text-[9px] text-white/35 mt-0.5">Total</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-center">
                <p className="text-base font-bold text-violet-400 leading-none">
                  {himnosFiltrados.length}
                </p>
                <p className="text-[9px] text-white/35 mt-0.5">Filtrados</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-center">
                <p className="text-base font-bold text-rose-400 leading-none">
                  {favoritos.length}
                </p>
                <p className="text-[9px] text-white/35 mt-0.5">Favoritos</p>
              </div>
            </div>

            <button
              onClick={() => {
                cerrarModal();
                setModalVisible(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-semibold text-white transition-all shadow-lg shadow-violet-900/40"
            >
              <FaPlus className="text-[10px]" />
              Nuevo Himno
            </button>
          </div>
        </div>

        {/* ── Barra de filtros ── */}
        <div className="flex items-center gap-2">
          {/* Búsqueda */}
          <div className="flex-1 relative min-w-0">
            <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por título, número, autor o letra..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-7 pr-7 py-1.5 bg-white/5 border border-white/8 hover:border-white/14 focus:border-violet-500/60 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <FaTimes className="text-xs" />
              </button>
            )}
          </div>

          {/* Categoría */}
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="shrink-0 bg-white/5 border border-white/8 hover:border-white/14 focus:border-violet-500/60 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none transition-colors"
          >
            <option value="" className="bg-slate-900">
              Todas las categorías
            </option>
            {categorias.map((cat) => (
              <option key={cat} value={cat} className="bg-slate-900">
                {cat} {conteoCategoria[cat] ? `(${conteoCategoria[cat]})` : ""}
              </option>
            ))}
          </select>

          {/* Ordenamiento */}
          <select
            value={ordenamiento}
            onChange={(e) => setOrdenamiento(e.target.value)}
            className="shrink-0 hidden md:block bg-white/5 border border-white/8 hover:border-white/14 focus:border-violet-500/60 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none transition-colors"
          >
            <option value="titulo" className="bg-slate-900">
              A–Z Título
            </option>
            <option value="numero" className="bg-slate-900">
              Número
            </option>
            <option value="autor" className="bg-slate-900">
              Autor
            </option>
            <option value="categoria" className="bg-slate-900">
              Categoría
            </option>
            <option value="fecha" className="bg-slate-900">
              Más reciente
            </option>
          </select>

          {/* Vista toggle */}
          <div className="flex items-center gap-0.5 bg-white/5 border border-white/8 rounded-lg p-0.5 shrink-0">
            {[
              {
                id: "list",
                icon: <FaList className="text-[11px]" />,
                title: "Lista",
              },
              {
                id: "grid",
                icon: <FaTh className="text-[11px]" />,
                title: "Grid",
              },
              {
                id: "compact",
                icon: <FaThLarge className="text-[11px]" />,
                title: "Compacto",
              },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setVistaActual(v.id)}
                title={v.title}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${vistaActual === v.id ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
              >
                {v.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── LISTA DE HIMNOS ── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {himnosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-4">
              <FaBookOpen className="text-2xl text-white/20" />
            </div>
            <p className="text-white/50 font-medium mb-1">
              {busqueda ? "Sin resultados" : "Biblioteca vacía"}
            </p>
            <p className="text-white/25 text-sm mb-5">
              {busqueda
                ? `No hay himnos para "${busqueda}"`
                : "Crea tu primer himno personalizado"}
            </p>
            <button
              onClick={() => {
                cerrarModal();
                setModalVisible(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-semibold text-white transition-all shadow-lg shadow-violet-900/40"
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
                  : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-2"
            }
          >
            {himnosFiltrados.map((himno) => (
              <div
                key={himno.id}
                className={
                  vistaActual === "grid"
                    ? "group bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] hover:border-violet-500/30 rounded-2xl p-4 transition-all cursor-pointer"
                    : vistaActual === "list"
                      ? "flex items-center gap-3 px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-xl transition-all group"
                      : "group bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] hover:border-violet-500/30 rounded-xl p-3 transition-all cursor-pointer text-center"
                }
              >
                {/* ── VISTA GRID ── */}
                {vistaActual === "grid" && (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryColor(himno.categoria)}`}
                        >
                          {himno.categoria}
                        </span>
                        {himno.numero && (
                          <span className="text-[10px] text-white/30 font-mono">
                            #{himno.numero}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorito(himno.id);
                        }}
                        className={`transition-colors ${favoritos.includes(himno.id) ? "text-rose-400" : "text-white/20 hover:text-rose-400"}`}
                      >
                        {favoritos.includes(himno.id) ? (
                          <FaHeart className="text-xs" />
                        ) : (
                          <FaRegHeart className="text-xs" />
                        )}
                      </button>
                    </div>

                    <div
                      onClick={() => handleNavigate(himno.id)}
                      className="mb-3"
                    >
                      <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2 group-hover:text-violet-200 transition-colors">
                        {himno.titulo}
                      </h3>
                      {himno.autor && (
                        <p className="text-[11px] text-white/40">
                          por {himno.autor}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicarHimno(himno);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                        title="Duplicar"
                      >
                        <FaCopy className="text-xs" />
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditar(himno);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                          title="Editar"
                        >
                          <FaEdit className="text-xs" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEliminar(himno.id);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Eliminar"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* ── VISTA LIST ── */}
                {vistaActual === "list" && (
                  <>
                    {/* Número */}
                    <span className="shrink-0 text-[10px] text-violet-400/50 font-bold tabular-nums w-7 text-center">
                      {himno.numero || "—"}
                    </span>
                    {/* Icono categoría */}
                    <span className="shrink-0 text-[11px]">
                      {getCategoryIcon(himno.categoria)}
                    </span>
                    {/* Info */}
                    <div
                      onClick={() => handleNavigate(himno.id)}
                      className="cursor-pointer flex-1 min-w-0"
                    >
                      <p className="text-sm text-white/70 group-hover:text-white truncate transition-colors font-medium">
                        {himno.titulo}
                      </p>
                      {(himno.autor || himno.categoria) && (
                        <p className="text-[11px] text-white/30 truncate">
                          {himno.autor}
                          {himno.autor && himno.categoria ? " · " : ""}
                          {himno.categoria}
                        </p>
                      )}
                    </div>
                    {/* Acciones */}
                    <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleFavorito(himno.id)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${favoritos.includes(himno.id) ? "text-rose-400" : "text-white/20 hover:text-rose-400"}`}
                      >
                        {favoritos.includes(himno.id) ? (
                          <FaHeart className="text-xs" />
                        ) : (
                          <FaRegHeart className="text-xs" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEditar(himno)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                        title="Editar"
                      >
                        <FaEdit className="text-xs" />
                      </button>
                      <button
                        onClick={() => handleEliminar(himno.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Eliminar"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </>
                )}

                {/* ── VISTA COMPACT ── */}
                {vistaActual === "compact" && (
                  <div onClick={() => handleNavigate(himno.id)}>
                    <div className="flex items-center justify-center mb-2 text-sm">
                      {getCategoryIcon(himno.categoria)}
                    </div>
                    <p className="text-xs font-semibold text-white/80 truncate leading-tight mb-1">
                      {himno.titulo}
                    </p>
                    <p className="text-[10px] text-white/30">
                      #{himno.numero || "—"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════
          MODAL CREAR / EDITAR HIMNO — Rediseñado
      ════════════════════════════════════════════════════ */}
      {modalVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background: "rgba(0,0,0,0.80)", backdropFilter: "blur(8px)"}}
        >
          <div
            className="relative w-full max-w-5xl max-h-[95vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background:
                "linear-gradient(160deg,#0f172a 0%,#111827 60%,#0d1525 100%)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          >
            {/* Acento superior violeta */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background:
                  "linear-gradient(90deg,transparent 0%,#7c3aed 35%,#a78bfa 50%,#7c3aed 65%,transparent 100%)",
              }}
            />

            {/* ── HEADER MODAL ── */}
            <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${editId ? "bg-amber-500/20 border border-amber-500/30" : "bg-violet-500/20 border border-violet-500/30"}`}
                >
                  {editId ? (
                    <FaEdit className="text-amber-400" />
                  ) : (
                    <FaMusic className="text-violet-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-none">
                    {editId ? "Editar Himno" : "Nuevo Himno"}
                  </h2>
                  <p className="text-[11px] text-white/35 mt-0.5 leading-none">
                    {editId
                      ? "Modifica los datos del himno"
                      : "Completa los campos para agregar un himno"}
                  </p>
                </div>
              </div>
              <button
                onClick={cerrarModal}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white/80 hover:bg-white/[0.07] transition-all"
              >
                <FaTimes className="text-sm" />
              </button>
            </div>

            {/* ── CUERPO MODAL ── */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] h-full divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
                {/* ── Columna izquierda: Metadata ── */}
                <div className="p-6 space-y-5">
                  {/* Número + Categoría */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                        <FaHashtag className="text-[9px]" /> Número
                        <span className="text-white/25 font-normal normal-case tracking-normal">
                          (opc.)
                        </span>
                      </label>
                      <input
                        type="text"
                        placeholder="001"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        className={INPUT_BASE}
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                        <FaTag className="text-[9px]" /> Categoría
                      </label>
                      <select
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        className={INPUT_BASE}
                      >
                        {categorias.map((cat) => (
                          <option
                            key={cat}
                            value={cat}
                            className="bg-slate-900"
                          >
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Título */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                      <FaMusic className="text-[9px]" /> Título
                      <span className="text-violet-400 ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Título del himno"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      className={INPUT_BASE}
                    />
                    {titulo && (
                      <p className="text-[10px] text-white/25 mt-1 truncate">
                        {titulo}
                      </p>
                    )}
                  </div>

                  {/* Autor */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                      <FaUserAlt className="text-[9px]" /> Autor
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre del compositor"
                      value={autor}
                      onChange={(e) => setAutor(e.target.value)}
                      className={INPUT_BASE}
                    />
                  </div>

                  {/* Vista previa resumen */}
                  {(titulo || autor || categoria) && (
                    <div
                      className="rounded-xl p-4 border border-white/[0.06]"
                      style={{background: "rgba(255,255,255,0.025)"}}
                    >
                      <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">
                        Vista previa
                      </p>
                      <p className="text-sm font-semibold text-white/85 leading-snug mb-1">
                        {titulo || (
                          <span className="text-white/20">Sin título</span>
                        )}
                      </p>
                      {autor && (
                        <p className="text-[11px] text-white/40 mb-1.5">
                          por {autor}
                        </p>
                      )}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryColor(categoria)}`}
                      >
                        {categoria}
                      </span>
                      {letra && (
                        <p className="text-[11px] text-white/30 mt-2 line-clamp-2 italic">
                          {letra.split("\n")[0]}...
                        </p>
                      )}
                    </div>
                  )}

                  {/* Tip */}
                  <div className="rounded-xl p-3 bg-violet-500/[0.07] border border-violet-500/[0.15]">
                    <p className="text-[11px] text-violet-300/70 leading-relaxed">
                      <span className="font-semibold text-violet-300">
                        Tip:
                      </span>{" "}
                      Separa cada estrofa con una línea en blanco. Los párrafos
                      se mostrarán separados en el proyector.
                    </p>
                  </div>
                </div>

                {/* ── Columna derecha: Letra ── */}
                <div className="flex flex-col p-6">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                    <FaAlignLeft className="text-[9px]" /> Letra
                    <span className="text-violet-400 ml-0.5">*</span>
                    <span className="ml-auto text-white/20 font-normal normal-case tracking-normal text-[10px]">
                      {letra
                        ? `${letra.split("\n\n").filter(Boolean).length} estrofas`
                        : ""}
                    </span>
                  </label>
                  <textarea
                    placeholder={
                      "Escribe o pega la letra aquí...\n\nSepara cada estrofa con una línea en blanco\n\nEjemplo:\nEstrofa 1 verso 1\nEstrofa 1 verso 2\n\nEstrofa 2 verso 1\nEstrofa 2 verso 2"
                    }
                    value={letra}
                    onChange={(e) => setLetra(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-800/60 border border-white/[0.08] hover:border-white/[0.15] focus:border-violet-500/60 rounded-xl text-sm text-white/85 placeholder-white/20 focus:outline-none transition-all resize-none leading-relaxed font-mono"
                    style={{minHeight: "320px"}}
                  />
                </div>
              </div>
            </div>

            {/* ── FOOTER MODAL ── */}
            <div
              className="flex items-center justify-between px-6 py-4 border-t border-white/[0.07] shrink-0"
              style={{background: "rgba(0,0,0,0.25)"}}
            >
              <div className="flex items-center gap-2">
                {!titulo.trim() && (
                  <span className="text-[11px] text-white/30">
                    Título requerido
                  </span>
                )}
                {!letra.trim() && titulo.trim() && (
                  <span className="text-[11px] text-white/30">
                    Letra requerida
                  </span>
                )}
                {titulo.trim() && letra.trim() && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400/70">
                    <FaCheck className="text-[9px]" /> Listo para guardar
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={cerrarModal}
                  className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/60 hover:text-white/90 text-sm rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={!titulo.trim() || !letra.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-white/[0.05] disabled:text-white/25 border border-violet-500/40 disabled:border-white/[0.06] text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-violet-900/30 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {editId ? (
                    <>
                      <FaCheck className="text-xs" /> Actualizar
                    </>
                  ) : (
                    <>
                      <FaDownload className="text-xs" /> Guardar Himno
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal búsqueda online (sin cambios visuales mayores) ── */}
      {modalBusquedaVisible && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/95 backdrop-blur border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-700/50">
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
                  className="text-gray-400 hover:text-white p-2"
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
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <button
                  onClick={buscarHimnosEnLinea}
                  disabled={cargandoBusqueda}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-700 disabled:to-gray-800 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-all"
                >
                  {cargandoBusqueda ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
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

              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-5 rounded-xl border border-blue-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 rounded-lg">
                    <FaGlobe className="text-white text-lg" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Buscar en Internet
                    </h3>
                    <p className="text-xs text-gray-400">
                      Encuentra letras en sitios especializados
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    onClick={() => buscarLetraEnNavegador()}
                    disabled={!busquedaEnLinea.trim()}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <FaMusic /> Musica.com
                  </button>
                  <button
                    onClick={() => {
                      if (!busquedaEnLinea.trim()) {
                        toast.warning("Ingresa un término");
                        return;
                      }
                      setHimnoParaBuscar({titulo: busquedaEnLinea, autor: ""});
                      setBrowserUrl(
                        `https://www.azlyrics.com/search.php?q=${encodeURIComponent(busquedaEnLinea)}`,
                      );
                      setModalBrowserVisible(true);
                    }}
                    disabled={!busquedaEnLinea.trim()}
                    className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:from-gray-700 disabled:to-gray-800 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <FaGlobe /> AZLyrics
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    {
                      label: "Google",
                      url: `https://www.google.com/search?q=${encodeURIComponent(busquedaEnLinea + " letra lyrics")}`,
                    },
                    {
                      label: "Letras.com",
                      url: `https://www.letras.com/buscar?q=${encodeURIComponent(busquedaEnLinea)}`,
                    },
                    {
                      label: "Genius",
                      url: `https://genius.com/search?q=${encodeURIComponent(busquedaEnLinea)}`,
                    },
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => abrirSitioExterno(s.url)}
                      disabled={!busquedaEnLinea.trim()}
                      className="bg-gray-700/50 hover:bg-gray-600/70 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-gray-600/30 transition-all"
                    >
                      <FaExternalLinkAlt className="text-[9px]" /> {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <FaBookOpen className="text-purple-400" /> Biblioteca Local
              </h3>
              {himnosEnLinea.length > 0 ? (
                <div className="space-y-3">
                  {himnosEnLinea.map((h) => (
                    <div
                      key={h.id}
                      className="bg-gray-700/50 rounded-xl p-4 border-l-4 border-purple-500 hover:bg-gray-600/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-base font-bold text-white">
                              {h.titulo}
                            </h4>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                              📚 {h.fuente}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm">
                            por {h.autor} · {h.categoria}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0 ml-3">
                          <button
                            onClick={() => {
                              setHimnoParaBuscar(h);
                              setBrowserUrl(
                                `https://www.musica.com/letras.asp?letra=${encodeURIComponent(h.titulo)}`,
                              );
                              setModalBrowserVisible(true);
                            }}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors"
                          >
                            <FaGlobe className="text-[10px]" /> Buscar Letra
                          </button>
                          <button
                            onClick={() => importarHimnoLocal(h)}
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all"
                          >
                            <FaDownload className="text-[10px]" /> Importar
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-300 bg-gray-800/50 p-3 rounded-lg">
                        {h.letra.slice(0, 3).map((linea, i) => (
                          <p key={i} className="mb-0.5">
                            {linea}
                          </p>
                        ))}
                        {h.letra.length > 3 && (
                          <p className="text-gray-500 italic">...</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FaBookOpen className="mx-auto text-5xl text-gray-600 mb-4" />
                  <p className="text-gray-400 font-semibold mb-1">
                    {busquedaEnLinea && !cargandoBusqueda
                      ? "No se encontraron resultados"
                      : "Busca en nuestra biblioteca local"}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {busquedaEnLinea
                      ? `Sin coincidencias para "${busquedaEnLinea}"`
                      : "Incluye himnos tradicionales y modernos"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal navegador integrado (sin cambios) ── */}
      {modalBrowserVisible && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/95 backdrop-blur border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
            <div className="bg-slate-800/80 p-4 rounded-t-2xl border-b border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-white">
                  🔍 Buscar Letra: {himnoParaBuscar?.titulo}
                </h2>
                <button
                  onClick={() => setModalBrowserVisible(false)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="url"
                  value={browserUrl}
                  onChange={(e) => setBrowserUrl(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && setBrowserUrl(browserUrl)
                  }
                  className="flex-1 px-3 py-2 bg-gray-700 rounded-lg text-white text-sm"
                  placeholder="https://..."
                />
                <button
                  onClick={() => setBrowserUrl(browserUrl)}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
                >
                  Ir
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: "✅ Musica.com",
                    url: `https://www.musica.com/letras.asp?letra=${encodeURIComponent(himnoParaBuscar?.titulo || busquedaEnLinea)}`,
                    cls: "bg-green-600 hover:bg-green-700",
                  },
                  {
                    label: "🔍 AZLyrics",
                    url: `https://www.azlyrics.com/search.php?q=${encodeURIComponent(himnoParaBuscar?.titulo || busquedaEnLinea)}`,
                    cls: "bg-blue-600 hover:bg-blue-700",
                  },
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setBrowserUrl(s.url)}
                    className={`${s.cls} px-3 py-1 rounded-lg text-xs text-white`}
                  >
                    {s.label}
                  </button>
                ))}
                <button
                  onClick={() =>
                    abrirSitioExterno(
                      `https://www.google.com/search?q=${encodeURIComponent((himnoParaBuscar?.titulo || busquedaEnLinea) + " letra lyrics")}`,
                    )
                  }
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-xs text-white flex items-center gap-1"
                >
                  <FaExternalLinkAlt className="text-[9px]" /> Google
                </button>
              </div>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 bg-white">
                <iframe
                  src={browserUrl}
                  className="w-full h-full border-0"
                  title="Navegador integrado"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
              <div className="w-80 bg-gray-700 p-4 border-l border-gray-600 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <FaClipboard className="text-gray-300 text-sm" />
                  <label className="font-semibold text-white text-sm">
                    Pega la letra aquí:
                  </label>
                </div>
                <textarea
                  value={letraEncontrada}
                  onChange={(e) => setLetraEncontrada(e.target.value)}
                  placeholder="Copia y pega la letra de la canción aquí..."
                  className="w-full flex-1 p-3 bg-gray-600 rounded-lg text-white resize-none text-sm min-h-[300px]"
                />
                <div className="flex justify-between gap-2 mt-3">
                  <button
                    onClick={() => setLetraEncontrada("")}
                    className="bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded-lg text-sm"
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={procesarLetraEncontrada}
                    disabled={!letraEncontrada.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:cursor-not-allowed"
                  >
                    <FaDownload className="text-xs" /> Crear Himno
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
