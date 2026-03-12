import {useState, useEffect} from "react";
import {
  FaTrash,
  FaHeart,
  FaPlay,
  FaMusic,
  FaStar,
  FaBook,
  FaList,
  FaTh,
  FaUser,
  FaExclamationTriangle,
  FaTimes,
  FaSearch,
} from "react-icons/fa";
import {useNavigate} from "react-router-dom";
import {toast, ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Favoritos() {
  const API_BASE = "http://localhost:3001";

  const [favoritosHimnos, setFavoritosHimnos] = useState([]);
  const [favoritosVidaCristiana, setFavoritosVidaCristiana] = useState([]);
  const [favoritosPersonalizados, setFavoritosPersonalizados] = useState([]);
  const [favoritosBiblia, setFavoritosBiblia] = useState([]);
  const [logoIglesia, setLogoIglesia] = useState(null);
  const [vistaActual, setVistaActual] = useState("lista");
  const [modalEliminar, setModalEliminar] = useState({
    visible: false,
    himno: null,
  });
  // ✨ NUEVO: Estado para filtro de himnos personalizados
  const [filtroPersonalizados, setFiltroPersonalizados] = useState("");
  const [loadingPersonalizados, setLoadingPersonalizados] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    cargarFavoritos();
    cargarLogoIglesia();
  }, []);

  const cargarFavoritos = async () => {
    // ✨ CARGAR FAVORITOS DESDE EL BACKEND COMPARTIDO (mismo estado que la app móvil)
    let himnosFavoritos = [];
    let vidaCristianaFavoritos = [];

    try {
      const resMoravo = await fetch(
        `${API_BASE}/api/himnos/favoritos?tipo=moravo`,
        {
          method: "GET",
          headers: {Accept: "application/json"},
        },
      );
      const jsonMoravo = await resMoravo.json().catch(() => null);
      if (resMoravo.ok && jsonMoravo?.ok && Array.isArray(jsonMoravo?.himnos)) {
        himnosFavoritos = jsonMoravo.himnos.map((h) => ({
          id: h?.id,
          numero: h?.numero,
          titulo: h?.titulo,
          parrafos: Array.isArray(h?.parrafos) ? h.parrafos : [],
          tipo: "moravo",
        }));
      }

      const resVida = await fetch(
        `${API_BASE}/api/himnos/favoritos?tipo=vida`,
        {
          method: "GET",
          headers: {Accept: "application/json"},
        },
      );
      const jsonVida = await resVida.json().catch(() => null);
      if (resVida.ok && jsonVida?.ok && Array.isArray(jsonVida?.himnos)) {
        vidaCristianaFavoritos = jsonVida.himnos.map((h) => ({
          id: h?.id,
          numero: h?.numero,
          titulo: h?.titulo,
          parrafos: Array.isArray(h?.parrafos) ? h.parrafos : [],
          tipo: "vidaCristiana",
        }));
      }
    } catch (error) {
      console.warn("⚠️ Error cargando favoritos base desde backend:", error);
    }

    // ✨ CARGAR FAVORITOS DE BIBLIA DESDE EL BACKEND
    let bibliaFavoritos = [];
    try {
      const resBiblia = await fetch(`${API_BASE}/api/biblia/favoritos`, {
        method: "GET",
        headers: {Accept: "application/json"},
      });
      const jsonBiblia = await resBiblia.json().catch(() => null);
      if (
        resBiblia.ok &&
        jsonBiblia?.ok &&
        Array.isArray(jsonBiblia?.favoritos)
      ) {
        bibliaFavoritos = jsonBiblia.favoritos
          .map((f) => ({
            id: String(f?.id || "").trim(),
            libroId: String(f?.libroId || "").trim(),
            libroNombre: String(f?.libroNombre || "").trim(),
            capitulo: Number(f?.capitulo) || null,
            versiculo: Number(f?.versiculo) || null,
            texto: typeof f?.texto === "string" ? f.texto : "",
          }))
          .filter((f) => Boolean(f.id));
      }
    } catch (error) {
      console.warn("⚠️ Error cargando favoritos de Biblia:", error);
    }

    // ✨ CARGAR FAVORITOS PERSONALIZADOS CON LOADING
    try {
      setLoadingPersonalizados(true);
      const favoritosDB = (await window.electron?.obtenerFavoritos?.()) || [];
      const favoritosPersonalizadosData = favoritosDB.map((favorito) => ({
        ...favorito,
        tipo: "personalizado",
      }));
      setFavoritosPersonalizados(favoritosPersonalizadosData);
    } catch (error) {
      console.error("Error cargando favoritos personalizados:", error);
    } finally {
      setLoadingPersonalizados(false);
    }

    setFavoritosHimnos(himnosFavoritos);
    setFavoritosVidaCristiana(vidaCristianaFavoritos);
    setFavoritosBiblia(bibliaFavoritos);
  };

  // ✨ FUNCIÓN PARA CARGAR EL LOGO
  const cargarLogoIglesia = async () => {
    try {
      if (!window.electron?.obtenerConfiguracion) {
        setLogoIglesia("/images/icon-256.png");
        return;
      }
      const configuracion = await window.electron.obtenerConfiguracion();
      // Usar logoUrl o el logo por defecto
      const logo = configuracion?.logoUrl || "/images/icon-256.png";
      setLogoIglesia(logo);
    } catch (error) {
      console.log("No se pudo cargar el logo de la iglesia:", error);
      setLogoIglesia("/images/icon-256.png");
    }
  };

  // ✨ FUNCIÓN MEJORADA PARA MOSTRAR MODAL DE CONFIRMACIÓN
  const confirmarEliminarFavorito = (numero, titulo, tipo) => {
    const identificador = numero;
    setModalEliminar({
      visible: true,
      himno: {identificador, titulo, tipo},
    });
  };

  // ✨ FUNCIÓN PARA ELIMINAR DESPUÉS DE CONFIRMACIÓN (ACTUALIZADA PARA PERSONALIZADOS)
  const handleEliminarFavorito = async () => {
    const {himno} = modalEliminar;
    try {
      if (himno.tipo === "moravo") {
        const idApi = `base:moravo:${String(himno.identificador)}`;
        const res = await fetch(
          `${API_BASE}/api/himnos/${encodeURIComponent(idApi)}/favorito`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({favorito: false}),
          },
        );
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `Error HTTP ${res.status}`);
        }
        setFavoritosHimnos((prev) =>
          prev.filter(
            (himno_item) => himno_item.numero !== himno.identificador,
          ),
        );
      } else if (himno.tipo === "vidaCristiana") {
        const idApi = `base:vida:${String(himno.identificador)}`;
        const res = await fetch(
          `${API_BASE}/api/himnos/${encodeURIComponent(idApi)}/favorito`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({favorito: false}),
          },
        );
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `Error HTTP ${res.status}`);
        }
        setFavoritosVidaCristiana((prev) =>
          prev.filter(
            (himno_item) => himno_item.numero !== himno.identificador,
          ),
        );
      } else if (himno.tipo === "personalizado") {
        // ✨ ACTUALIZADO: Usar quitarFavorito en lugar de eliminarFavorito
        await window.electron.eliminarFavorito(himno.identificador);

        // Actualizar estado inmediatamente
        setFavoritosPersonalizados((prev) =>
          prev.filter((favorito) => favorito.id !== himno.identificador),
        );

        toast.success(`💔 "${himno.titulo}" quitado de favoritos`, {
          position: "top-right",
          autoClose: 3000,
          theme: "dark",
        });
      }

      // Cerrar modal
      setModalEliminar({visible: false, himno: null});

      // Toast para otros tipos
      if (himno.tipo !== "personalizado") {
        toast.success(`🗑️ "${himno.titulo}" eliminado de favoritos`, {
          position: "top-right",
          autoClose: 3000,
          theme: "dark",
        });
      }
    } catch (error) {
      console.error("Error al eliminar el favorito:", error);
      setModalEliminar({visible: false, himno: null});
      toast.error("❌ Error al eliminar de favoritos", {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
    }
  };

  const handleNavigate = (numero, tipo) => {
    if (tipo === "moravo") {
      navigate(`/himno/${numero}`);
    } else if (tipo === "vidaCristiana") {
      navigate(`/himno/${numero}`, {state: {tipo: "vidaCristiana"}});
    } else if (tipo === "personalizado") {
      navigate(`/himno-detalle/${numero}`);
    }
  };

  const proyectarFavoritoBiblia = (favorito) => {
    try {
      if (
        !window.electron?.abrirProyector ||
        !window.electron?.enviarVersiculo
      ) {
        throw new Error("Electron bridge no disponible");
      }

      const titulo = favorito?.libroNombre || "Biblia";
      const numero = `${favorito?.capitulo || ""}:${favorito?.versiculo || ""}`;
      const parrafo = favorito?.texto || "";

      window.electron.abrirProyector();
      window.electron.enviarVersiculo({
        parrafo,
        titulo,
        numero,
        origen: "biblia",
      });
    } catch (error) {
      console.error("Error proyectando favorito de Biblia:", error);
      toast.error("❌ No se pudo proyectar el versículo", {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
    }
  };

  const quitarFavoritoBiblia = async (favorito) => {
    try {
      const id = String(favorito?.id || "").trim();
      if (!id) throw new Error("id inválido");

      const res = await fetch(
        `${API_BASE}/api/biblia/${encodeURIComponent(id)}/favorito`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({favorito: false}),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      }

      setFavoritosBiblia((prev) => prev.filter((f) => f.id !== id));
      toast.success("🗑️ Versículo quitado de favoritos", {
        position: "top-right",
        autoClose: 2500,
        theme: "dark",
      });
    } catch (error) {
      console.error("Error quitando favorito de Biblia:", error);
      toast.error("❌ Error al quitar de favoritos", {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
    }
  };

  const totalFavoritos =
    favoritosPersonalizados.length +
    favoritosHimnos.length +
    favoritosVidaCristiana.length +
    favoritosBiblia.length;

  // ✨ FILTRAR HIMNOS PERSONALIZADOS
  const favoritosPersonalizadosFiltrados = favoritosPersonalizados.filter(
    (favorito) =>
      favorito.titulo
        .toLowerCase()
        .includes(filtroPersonalizados.toLowerCase()) ||
      favorito.id.toString().includes(filtroPersonalizados),
  );

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 min-h-screen overflow-y-auto">
      {/* ✨ CONTENEDOR DE TOASTS */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{
          backgroundColor: "#1f2937",
          color: "#f9fafb",
          border: "1px solid #374151",
        }}
      />

      {/* Header con gradiente */}
      <div className="bg-black/30 backdrop-blur-sm p-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className="bg-white/5 p-3 rounded-full border border-white/10">
                <FaHeart className="text-2xl text-red-300" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Favoritos</h1>
                <p className="text-white/60">
                  Himnos y versículos marcados como favoritos
                </p>
              </div>
            </div>

            {/* Estadísticas y Logo */}
            <div className="flex items-center space-x-6">
              {/* Estadísticas detalladas - REORDENADAS */}
              <div className="flex space-x-4 text-center">
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="text-2xl font-bold text-emerald-300">
                    {totalFavoritos}
                  </div>
                  <div className="text-xs text-white/60">Total</div>
                </div>
                {/* ✨ PERSONALIZADOS PRIMERO */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="text-xl font-bold text-amber-300">
                    {favoritosPersonalizados.length}
                  </div>
                  <div className="text-xs text-white/60">Personalizados</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="text-xl font-bold text-cyan-300">
                    {favoritosHimnos.length}
                  </div>
                  <div className="text-xs text-white/60">Moravos</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="text-xl font-bold text-indigo-300">
                    {favoritosVidaCristiana.length}
                  </div>
                  <div className="text-xs text-white/60">V. Cristiana</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="text-xl font-bold text-yellow-300">
                    {favoritosBiblia.length}
                  </div>
                  <div className="text-xs text-white/60">Biblia</div>
                </div>
              </div>

              {/* Logo de la iglesia - siempre visible */}
              <div className="bg-white/5 rounded-xl p-2 border border-white/10">
                <img
                  src={logoIglesia || "/images/icon-256.png"}
                  alt="Logo Iglesia"
                  className="w-12 h-12 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.src = "/images/icon-256.png";
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* ✨ SELECTOR DE VISTA */}
        {totalFavoritos > 0 && (
          <div className="flex justify-end mb-6">
            <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setVistaActual("lista")}
                className={`px-4 py-2 transition-all flex items-center space-x-2 ${
                  vistaActual === "lista"
                    ? "bg-emerald-600/90 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <FaList />
                <span>Lista</span>
              </button>
              <button
                onClick={() => setVistaActual("tarjetas")}
                className={`px-4 py-2 transition-all flex items-center space-x-2 ${
                  vistaActual === "tarjetas"
                    ? "bg-emerald-600/90 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <FaTh />
                <span>Tarjetas</span>
              </button>
            </div>
          </div>
        )}

        {totalFavoritos === 0 ? (
          /* Estado vacío */
          <div className="text-center py-20">
            <div className="bg-white/5 rounded-2xl p-12 border border-white/10">
              <FaHeart className="text-6xl text-white/20 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-white/70 mb-4">
                No tienes himnos favoritos
              </h3>
              <p className="text-white/50 mb-6">
                Marca himnos como favoritos para verlos aquí
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate("/agregar-himno")}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl transition-colors flex items-center space-x-2"
                >
                  <FaUser />
                  <span>Crear Himnos</span>
                </button>
                <button
                  onClick={() => navigate("/himnos")}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl transition-colors flex items-center space-x-2"
                >
                  <FaBook />
                  <span>Himnos Moravos</span>
                </button>
                <button
                  onClick={() => navigate("/himnos-vida-cristiana")}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl transition-colors flex items-center space-x-2"
                >
                  <FaMusic />
                  <span>Vida Cristiana</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ✨ SECCIÓN HIMNOS PERSONALIZADOS - PRIMERO */}
            {favoritosPersonalizados.length > 0 && (
              <SeccionFavoritosPersonalizados
                favoritos={favoritosPersonalizados}
                loading={loadingPersonalizados}
                filtro={filtroPersonalizados}
                setFiltro={setFiltroPersonalizados}
                onNavigate={handleNavigate}
                onEliminar={confirmarEliminarFavorito}
              />
            )}

            {/* ✨ SECCIÓN BIBLIA */}
            {favoritosBiblia.length > 0 && (
              <SeccionFavoritosBiblia
                favoritos={favoritosBiblia}
                cantidad={favoritosBiblia.length}
                vistaActual={vistaActual}
                onProyectar={proyectarFavoritoBiblia}
                onQuitar={quitarFavoritoBiblia}
              />
            )}

            {/* Sección Himnos Moravos - SEGUNDO */}
            {favoritosHimnos.length > 0 && (
              <SeccionFavoritos
                titulo="Himnos Moravos"
                icono={<FaBook className="text-cyan-400 text-xl" />}
                favoritos={favoritosHimnos}
                cantidad={favoritosHimnos.length}
                colorScheme="cyan"
                vistaActual={vistaActual}
                onNavigate={handleNavigate}
                onEliminar={confirmarEliminarFavorito}
              />
            )}

            {/* Sección Vida Cristiana - TERCERO */}
            {favoritosVidaCristiana.length > 0 && (
              <SeccionFavoritos
                titulo="Vida Cristiana"
                icono={<FaMusic className="text-indigo-400 text-xl" />}
                favoritos={favoritosVidaCristiana}
                cantidad={favoritosVidaCristiana.length}
                colorScheme="indigo"
                vistaActual={vistaActual}
                onNavigate={handleNavigate}
                onEliminar={confirmarEliminarFavorito}
              />
            )}
          </div>
        )}

        {/* Información adicional - REORDENADA */}
        {totalFavoritos > 0 && (
          <div className="mt-8 bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FaHeart className="text-red-300" />
                <span className="text-white/70">
                  Tienes {totalFavoritos} favorito
                  {totalFavoritos !== 1 ? "s" : ""} guardado
                  {totalFavoritos !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex space-x-3">
                {/* ✨ PERSONALIZADOS PRIMERO EN LOS ENLACES TAMBIÉN */}
                <button
                  onClick={() => navigate("/agregar-himno")}
                  className="text-emerald-300 hover:text-emerald-200 transition-colors text-sm flex items-center space-x-1"
                >
                  <span>Crear Himnos</span>
                  <FaUser className="text-xs" />
                </button>
                <button
                  onClick={() => navigate("/himnos")}
                  className="text-white/60 hover:text-white transition-colors text-sm flex items-center space-x-1"
                >
                  <span>Himnos Moravos</span>
                  <FaBook className="text-xs" />
                </button>
                <button
                  onClick={() => navigate("/vida-cristiana")}
                  className="text-white/60 hover:text-white transition-colors text-sm flex items-center space-x-1"
                >
                  <span>Vida Cristiana</span>
                  <FaMusic className="text-xs" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✨ MODAL DE CONFIRMACIÓN PARA ELIMINAR */}
      {modalEliminar.visible && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-slate-950/95 text-white rounded-2xl shadow-2xl w-full max-w-md border border-white/10">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="bg-red-500/20 p-2 rounded-full">
                  <FaExclamationTriangle className="text-red-400 text-xl" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  Confirmar Eliminación
                </h2>
              </div>
              <button
                onClick={() => setModalEliminar({visible: false, himno: null})}
                className="text-white/60 hover:text-white transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6">
              <p className="text-white/70 mb-4">
                ¿Estás seguro de que quieres eliminar este himno de tus
                favoritos?
              </p>

              <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="bg-red-500/15 border border-red-500/20 text-red-200 text-sm font-bold px-3 py-1 rounded-full">
                    #{modalEliminar.himno?.identificador}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {modalEliminar.himno?.titulo}
                    </h3>
                    <p className="text-sm text-white/60">
                      {modalEliminar.himno?.tipo === "moravo"
                        ? "Himno Moravo"
                        : modalEliminar.himno?.tipo === "vidaCristiana"
                          ? "Vida Cristiana"
                          : "Himno Personalizado"}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-white/60 mb-6">
                Esta acción no se puede deshacer. Podrás volver a agregarlo como
                favorito más tarde.
              </p>

              {/* Botones de acción */}
              <div className="flex space-x-3">
                <button
                  onClick={() =>
                    setModalEliminar({visible: false, himno: null})
                  }
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEliminarFavorito}
                  className="flex-1 bg-red-600/90 hover:bg-red-600 border border-red-500/20 text-white px-4 py-2 rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  <FaTrash />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

// ✨ NUEVO COMPONENTE: Sección de favoritos personalizados moderna
const SeccionFavoritosPersonalizados = ({
  favoritos,
  loading,
  filtro,
  setFiltro,
  onNavigate,
  onEliminar,
}) => {
  const favoritosFiltrados = favoritos.filter(
    (favorito) =>
      favorito.titulo.toLowerCase().includes(filtro.toLowerCase()) ||
      favorito.id.toString().includes(filtro),
  );

  if (loading) {
    return (
      <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
            <p className="text-white/70">Cargando himnos personalizados...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
      {/* Header de la sección */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/5 border border-white/10 rounded-full">
            <FaUser className="text-xl text-emerald-300" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              Himnos Personalizados
            </h2>
            <p className="text-white/60 text-sm">
              {favoritos.length} himno{favoritos.length !== 1 ? "s" : ""}{" "}
              personalizado{favoritos.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Contador */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <span className="text-2xl font-bold text-emerald-300">
            {favoritos.length}
          </span>
        </div>
      </div>

      {/* Barra de búsqueda */}
      {favoritos.length > 0 && (
        <div className="relative mb-6 max-w-md">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Buscar himnos personalizados..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-transparent transition-colors"
          />
        </div>
      )}

      {/* Contenido */}
      {favoritos.length === 0 ? (
        <div className="text-center py-16">
          <FaUser className="text-6xl text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white/70 mb-2">
            No tienes himnos personalizados favoritos
          </h3>
          <p className="text-white/60 mb-6">
            Crea y marca tus himnos personalizados como favoritos
          </p>
          <button
            onClick={() => window.open("/agregar-himno", "_self")}
            className="px-6 py-3 bg-emerald-600/90 hover:bg-emerald-600 border border-emerald-500/20 rounded-xl font-semibold transition-colors"
          >
            Crear Himno Personalizado
          </button>
        </div>
      ) : favoritosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <FaSearch className="text-4xl text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white/70 mb-2">
            No se encontraron resultados
          </h3>
          <p className="text-white/60">
            Intenta con diferentes términos de búsqueda
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoritosFiltrados.map((favorito, index) => (
            <div
              key={favorito.id}
              className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] hover:border-white/20 transition-colors duration-200 cursor-pointer"
              onClick={() => onNavigate(favorito.id, "personalizado")}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Contenido de la tarjeta */}
              <div className="relative z-10">
                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-black/20 border border-white/10 rounded-lg">
                      <FaMusic className="text-emerald-300" />
                    </div>
                    <span className="text-xs font-medium text-white/70 bg-black/20 border border-white/10 px-2 py-1 rounded-full">
                      #{favorito.id}
                    </span>
                  </div>

                  {/* Botón de eliminar favorito */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEliminar(favorito.id, favorito.titulo, "personalizado");
                    }}
                    className="p-2 text-red-200 hover:text-red-100 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-colors duration-200 opacity-0 group-hover:opacity-100"
                    title="Quitar de favoritos"
                  >
                    <FaTrash size={16} />
                  </button>
                </div>

                {/* Título del himno */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-200 transition-colors duration-200 line-clamp-2">
                    {favorito.titulo}
                  </h3>
                  {favorito.autor && (
                    <p className="text-white/60 text-sm mt-1">
                      por {favorito.autor}
                    </p>
                  )}
                </div>

                {/* Footer de la tarjeta */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <FaHeart className="text-sm" />
                    <span className="text-xs font-medium">Favorito</span>
                  </div>

                  {/* Indicador de hover */}
                  <div className="text-xs text-white/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    Clic para ver detalles
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ✨ NUEVO: Sección de favoritos de Biblia
const SeccionFavoritosBiblia = ({
  favoritos,
  cantidad,
  vistaActual,
  onProyectar,
  onQuitar,
}) => {
  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/5 border border-white/10 rounded-full">
            <FaStar className="text-xl text-yellow-300" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Biblia</h2>
            <p className="text-white/60 text-sm">
              {cantidad} versículo{cantidad !== 1 ? "s" : ""} favorito
              {cantidad !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <span className="text-2xl font-bold text-yellow-300">{cantidad}</span>
        </div>
      </div>

      {vistaActual === "tarjetas" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoritos.map((f) => (
            <div
              key={f.id}
              className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] hover:border-white/20 transition-colors duration-200"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {f.libroNombre || "Biblia"}
                  </div>
                  <div className="text-xs text-white/60">
                    {f.capitulo}:{f.versiculo}
                  </div>
                </div>

                <button
                  onClick={() => onQuitar(f)}
                  className="p-2 text-red-200 hover:text-red-100 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-colors duration-200 opacity-0 group-hover:opacity-100"
                  title="Quitar de favoritos"
                >
                  <FaTrash size={16} />
                </button>
              </div>

              <p className="text-white/80 text-sm leading-relaxed line-clamp-2 mb-5">
                {f.texto || ""}
              </p>

              <button
                onClick={() => onProyectar(f)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600/90 hover:bg-emerald-600 border border-emerald-500/20 rounded-xl transition-colors"
              >
                <FaPlay />
                <span>Proyectar</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          {favoritos.map((f, index) => (
            <div
              key={f.id}
              className={`flex items-center justify-between p-4 ${
                index !== favoritos.length - 1 ? "border-b border-white/10" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500/15 border border-yellow-500/20 text-yellow-200 text-xs font-bold px-3 py-1 rounded-full flex-shrink-0">
                    {f.capitulo}:{f.versiculo}
                  </div>
                  <div className="text-white font-semibold truncate">
                    {f.libroNombre || "Biblia"}
                  </div>
                </div>
                <div className="text-white/60 text-sm mt-2 line-clamp-2">
                  {f.texto || ""}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <button
                  onClick={() => onProyectar(f)}
                  className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 rounded-lg text-emerald-200 transition-colors"
                  title="Proyectar"
                >
                  <FaPlay />
                </button>
                <button
                  onClick={() => onQuitar(f)}
                  className="p-2 bg-red-600/15 hover:bg-red-600/25 border border-red-500/20 rounded-lg text-red-200 transition-colors"
                  title="Quitar de favoritos"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ✨ MANTENER COMPONENTE SECCIÓN DE FAVORITOS ORIGINAL
const SeccionFavoritos = ({
  titulo,
  icono,
  favoritos,
  cantidad,
  colorScheme,
  vistaActual,
  onNavigate,
  onEliminar,
}) => {
  return (
    <div>
      <div className="flex items-center space-x-3 mb-6">
        {icono}
        <h2 className="text-2xl font-bold text-white">
          {titulo} ({cantidad})
        </h2>
      </div>

      {vistaActual === "tarjetas" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favoritos.map((favorito) => (
            <FavoritoCard
              key={`${favorito.tipo}-${favorito.numero || favorito.id}`}
              favorito={favorito}
              onNavigate={onNavigate}
              onEliminar={onEliminar}
              colorScheme={colorScheme}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          {favoritos.map((favorito, index) => (
            <FavoritoListItem
              key={`${favorito.tipo}-${favorito.numero || favorito.id}`}
              favorito={favorito}
              onNavigate={onNavigate}
              onEliminar={onEliminar}
              colorScheme={colorScheme}
              isLast={index === favoritos.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ✨ MANTENER COMPONENTES ORIGINALES
const FavoritoCard = ({favorito, onNavigate, onEliminar, colorScheme}) => {
  const getColorClasses = () => {
    switch (colorScheme) {
      case "cyan":
        return {
          accentBorderHover: "hover:border-cyan-500/30",
          badgeText: "text-cyan-200",
          hover: "group-hover:text-cyan-200",
        };
      case "indigo":
        return {
          accentBorderHover: "hover:border-indigo-500/30",
          badgeText: "text-indigo-200",
          hover: "group-hover:text-indigo-200",
        };
      case "orange":
        return {
          accentBorderHover: "hover:border-orange-500/30",
          badgeText: "text-orange-200",
          hover: "group-hover:text-orange-200",
        };
      default:
        return {
          accentBorderHover: "hover:border-red-500/30",
          badgeText: "text-red-200",
          hover: "group-hover:text-red-200",
        };
    }
  };

  const colors = getColorClasses();
  const identificador = favorito.numero || favorito.id;
  const etiqueta =
    favorito.tipo === "moravo"
      ? "Moravo"
      : favorito.tipo === "vidaCristiana"
        ? "V. Cristiana"
        : "Personalizado";

  return (
    <div
      className={`bg-white/5 rounded-2xl border border-white/10 ${colors.accentBorderHover} transition-colors duration-200 overflow-hidden group`}
    >
      <div className="p-6">
        {/* Header de la tarjeta */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={`bg-black/20 border border-white/10 ${colors.badgeText} text-sm font-bold px-3 py-1 rounded-full`}
          >
            #{identificador}
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-xs px-2 py-1 rounded-full bg-black/20 border border-white/10 text-white/70">
              {etiqueta}
            </div>
            <FaHeart className="text-red-300 text-sm fill-current" />
          </div>
        </div>

        {/* Título */}
        <div
          className="cursor-pointer mb-6"
          onClick={() => onNavigate(identificador, favorito.tipo)}
        >
          <h3
            className={`font-semibold text-white text-lg mb-2 line-clamp-2 ${colors.hover} transition-colors`}
          >
            {favorito.titulo}
          </h3>
          <p className="text-white/60 text-sm">
            {favorito.autor && `por ${favorito.autor} • `}
            {etiqueta}
          </p>
        </div>

        {/* Acciones */}
        <div className="flex space-x-2">
          <button
            onClick={() => onNavigate(identificador, favorito.tipo)}
            className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600/90 hover:bg-emerald-600 border border-emerald-500/20 text-white px-4 py-2 rounded-xl transition-colors"
          >
            <FaPlay className="text-sm" />
            <span>Ver</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEliminar(identificador, favorito.titulo, favorito.tipo);
            }}
            className="p-2 bg-red-500/15 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors text-red-200"
            title="Eliminar de favoritos"
          >
            <FaTrash className="text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
};

const FavoritoListItem = ({
  favorito,
  onNavigate,
  onEliminar,
  colorScheme,
  isLast,
}) => {
  const getColorClasses = () => {
    switch (colorScheme) {
      case "cyan":
        return {
          badgeText: "text-cyan-200",
          hover: "group-hover:text-cyan-200",
        };
      case "indigo":
        return {
          badgeText: "text-indigo-200",
          hover: "group-hover:text-indigo-200",
        };
      case "orange":
        return {
          badgeText: "text-orange-200",
          hover: "group-hover:text-orange-200",
        };
      default:
        return {
          badgeText: "text-red-200",
          hover: "group-hover:text-red-200",
        };
    }
  };

  const colors = getColorClasses();
  const identificador = favorito.numero || favorito.id;
  const etiqueta =
    favorito.tipo === "moravo"
      ? "Moravo"
      : favorito.tipo === "vidaCristiana"
        ? "V. Cristiana"
        : "Personalizado";

  return (
    <div
      className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors duration-200 ${
        !isLast ? "border-b border-white/10" : ""
      }`}
    >
      <button
        onClick={() => onNavigate(identificador, favorito.tipo)}
        className="flex items-center space-x-4 flex-1 group text-left"
      >
        <div
          className={`bg-black/20 border border-white/10 ${colors.badgeText} text-sm font-bold px-3 py-2 rounded-lg min-w-[60px] text-center`}
        >
          {identificador}
        </div>

        <div className="flex-1">
          <h3
            className={`font-medium text-white ${colors.hover} transition-colors`}
          >
            {favorito.titulo}
          </h3>
          <p className="text-white/60 text-sm">
            {favorito.autor && `por ${favorito.autor} • `}
            {etiqueta}
          </p>
        </div>

        <FaPlay className={`text-gray-400 ${colors.hover} transition-colors`} />
      </button>

      <div className="flex items-center space-x-2 ml-4">
        <FaHeart className="text-red-300 text-sm fill-current" />
        <button
          onClick={() =>
            onEliminar(identificador, favorito.titulo, favorito.tipo)
          }
          className="p-2 rounded-full transition-colors text-white/60 hover:text-red-200 hover:bg-red-500/10"
        >
          <FaTrash className="text-sm" />
        </button>
      </div>
    </div>
  );
};
