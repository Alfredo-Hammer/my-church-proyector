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
  FaBible,
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
  const [vistaActual, setVistaActual] = useState("lista");
  const [modalEliminar, setModalEliminar] = useState({visible: false, himno: null});
  const [filtroPersonalizados, setFiltroPersonalizados] = useState("");
  const [loadingPersonalizados, setLoadingPersonalizados] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    cargarFavoritos();
  }, []);

  const cargarFavoritos = async () => {
    let himnosFavoritos = [];
    let vidaCristianaFavoritos = [];

    try {
      const resMoravo = await fetch(`${API_BASE}/api/himnos/favoritos?tipo=moravo`, {
        method: "GET",
        headers: {Accept: "application/json"},
      });
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

      const resVida = await fetch(`${API_BASE}/api/himnos/favoritos?tipo=vida`, {
        method: "GET",
        headers: {Accept: "application/json"},
      });
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
      console.warn("Error cargando favoritos base:", error);
    }

    let bibliaFavoritos = [];
    try {
      const resBiblia = await fetch(`${API_BASE}/api/biblia/favoritos`, {
        method: "GET",
        headers: {Accept: "application/json"},
      });
      const jsonBiblia = await resBiblia.json().catch(() => null);
      if (resBiblia.ok && jsonBiblia?.ok && Array.isArray(jsonBiblia?.favoritos)) {
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
      console.warn("Error cargando favoritos de Biblia:", error);
    }

    try {
      setLoadingPersonalizados(true);
      const favoritosDB = (await window.electron?.obtenerFavoritos?.()) || [];
      setFavoritosPersonalizados(favoritosDB.map((f) => ({...f, tipo: "personalizado"})));
    } catch (error) {
      console.error("Error cargando favoritos personalizados:", error);
    } finally {
      setLoadingPersonalizados(false);
    }

    setFavoritosHimnos(himnosFavoritos);
    setFavoritosVidaCristiana(vidaCristianaFavoritos);
    setFavoritosBiblia(bibliaFavoritos);
  };

  const confirmarEliminarFavorito = (numero, titulo, tipo) => {
    setModalEliminar({visible: true, himno: {identificador: numero, titulo, tipo}});
  };

  const handleEliminarFavorito = async () => {
    const {himno} = modalEliminar;
    try {
      if (himno.tipo === "moravo") {
        const idApi = `base:moravo:${String(himno.identificador)}`;
        const res = await fetch(`${API_BASE}/api/himnos/${encodeURIComponent(idApi)}/favorito`, {
          method: "POST",
          headers: {Accept: "application/json", "Content-Type": "application/json"},
          body: JSON.stringify({favorito: false}),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
        setFavoritosHimnos((prev) => prev.filter((h) => h.numero !== himno.identificador));
      } else if (himno.tipo === "vidaCristiana") {
        const idApi = `base:vida:${String(himno.identificador)}`;
        const res = await fetch(`${API_BASE}/api/himnos/${encodeURIComponent(idApi)}/favorito`, {
          method: "POST",
          headers: {Accept: "application/json", "Content-Type": "application/json"},
          body: JSON.stringify({favorito: false}),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
        setFavoritosVidaCristiana((prev) => prev.filter((h) => h.numero !== himno.identificador));
      } else if (himno.tipo === "personalizado") {
        await window.electron.eliminarFavorito(himno.identificador);
        setFavoritosPersonalizados((prev) => prev.filter((f) => f.id !== himno.identificador));
        toast.success(`"${himno.titulo}" quitado de favoritos`);
      }
      setModalEliminar({visible: false, himno: null});
      if (himno.tipo !== "personalizado") {
        toast.success(`"${himno.titulo}" eliminado de favoritos`);
      }
    } catch (error) {
      console.error("Error al eliminar el favorito:", error);
      setModalEliminar({visible: false, himno: null});
      toast.error("Error al eliminar de favoritos");
    }
  };

  const handleNavigate = (numero, tipo) => {
    if (tipo === "moravo") navigate(`/himno/${numero}`);
    else if (tipo === "vidaCristiana") navigate(`/himno/${numero}`, {state: {tipo: "vidaCristiana"}});
    else if (tipo === "personalizado") navigate(`/himno-detalle/${numero}`);
  };

  const proyectarFavoritoBiblia = (favorito) => {
    try {
      if (!window.electron?.abrirProyector || !window.electron?.enviarVersiculo)
        throw new Error("Electron bridge no disponible");
      window.electron.abrirProyector();
      window.electron.enviarVersiculo({
        parrafo: favorito?.texto || "",
        titulo: favorito?.libroNombre || "Biblia",
        numero: `${favorito?.capitulo || ""}:${favorito?.versiculo || ""}`,
        origen: "biblia",
      });
    } catch (error) {
      toast.error("No se pudo proyectar el versículo");
    }
  };

  const quitarFavoritoBiblia = async (favorito) => {
    try {
      const id = String(favorito?.id || "").trim();
      if (!id) throw new Error("id inválido");
      const res = await fetch(`${API_BASE}/api/biblia/${encodeURIComponent(id)}/favorito`, {
        method: "POST",
        headers: {Accept: "application/json", "Content-Type": "application/json"},
        body: JSON.stringify({favorito: false}),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Error HTTP ${res.status}`);
      setFavoritosBiblia((prev) => prev.filter((f) => f.id !== id));
      toast.success("Versículo quitado de favoritos");
    } catch (error) {
      toast.error("Error al quitar de favoritos");
    }
  };

  const totalFavoritos =
    favoritosPersonalizados.length +
    favoritosHimnos.length +
    favoritosVidaCristiana.length +
    favoritosBiblia.length;

  return (
    <div className="bg-slate-950 h-full flex flex-col overflow-hidden text-slate-100">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />

      {/* Toolbar compacto */}
      <div className="shrink-0 bg-slate-900/98 backdrop-blur border-b border-slate-700/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <FaHeart className="text-rose-400 text-sm shrink-0" />
          <span className="text-sm font-semibold text-white shrink-0">Favoritos</span>

          {/* Contadores por categoría */}
          <div className="flex items-center gap-1 ml-1 overflow-x-auto">
            {favoritosPersonalizados.length > 0 && (
              <span className="shrink-0 text-[10px] text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 tabular-nums">
                {favoritosPersonalizados.length} propios
              </span>
            )}
            {favoritosHimnos.length > 0 && (
              <span className="shrink-0 text-[10px] text-cyan-400/80 bg-cyan-500/10 border border-cyan-500/20 rounded px-1.5 py-0.5 tabular-nums">
                {favoritosHimnos.length} moravos
              </span>
            )}
            {favoritosVidaCristiana.length > 0 && (
              <span className="shrink-0 text-[10px] text-indigo-400/80 bg-indigo-500/10 border border-indigo-500/20 rounded px-1.5 py-0.5 tabular-nums">
                {favoritosVidaCristiana.length} V.C.
              </span>
            )}
            {favoritosBiblia.length > 0 && (
              <span className="shrink-0 text-[10px] text-yellow-400/80 bg-yellow-500/10 border border-yellow-500/20 rounded px-1.5 py-0.5 tabular-nums">
                {favoritosBiblia.length} biblia
              </span>
            )}
          </div>

          {/* Derecha: total + toggle */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <span className="hidden md:block text-[11px] text-slate-500 tabular-nums">{totalFavoritos} total</span>
            <div className="flex items-center gap-0.5 bg-slate-800 border border-slate-600/60 rounded-lg p-0.5">
              <button
                onClick={() => setVistaActual("lista")}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${vistaActual === "lista" ? "bg-rose-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                title="Lista"
              ><FaList className="text-xs" /></button>
              <button
                onClick={() => setVistaActual("tarjetas")}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${vistaActual === "tarjetas" ? "bg-rose-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                title="Tarjetas"
              ><FaTh className="text-xs" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {totalFavoritos === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <FaHeart className="text-3xl text-slate-700 mb-3" />
            <p className="text-slate-400 text-sm mb-1 font-medium">Sin favoritos</p>
            <p className="text-slate-600 text-xs mb-4">Marca himnos o versículos como favoritos para verlos aquí</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => navigate("/agregar-himno")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-xs text-slate-300 transition-colors"
              ><FaUser className="text-[10px]" /> Mis Himnos</button>
              <button
                onClick={() => navigate("/himnos")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-xs text-slate-300 transition-colors"
              ><FaBook className="text-[10px]" /> Moravos</button>
              <button
                onClick={() => navigate("/himnos-vida-cristiana")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-xs text-slate-300 transition-colors"
              ><FaMusic className="text-[10px]" /> Vida Cristiana</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {favoritosPersonalizados.length > 0 && (
              <SeccionFavoritosPersonalizados
                favoritos={favoritosPersonalizados}
                loading={loadingPersonalizados}
                filtro={filtroPersonalizados}
                setFiltro={setFiltroPersonalizados}
                vistaActual={vistaActual}
                onNavigate={handleNavigate}
                onEliminar={confirmarEliminarFavorito}
              />
            )}
            {favoritosBiblia.length > 0 && (
              <SeccionFavoritosBiblia
                favoritos={favoritosBiblia}
                vistaActual={vistaActual}
                onProyectar={proyectarFavoritoBiblia}
                onQuitar={quitarFavoritoBiblia}
              />
            )}
            {favoritosHimnos.length > 0 && (
              <SeccionFavoritos
                titulo="Moravos"
                icono={<FaBook className="text-cyan-400 text-xs" />}
                favoritos={favoritosHimnos}
                colorScheme="cyan"
                vistaActual={vistaActual}
                onNavigate={handleNavigate}
                onEliminar={confirmarEliminarFavorito}
              />
            )}
            {favoritosVidaCristiana.length > 0 && (
              <SeccionFavoritos
                titulo="Vida Cristiana"
                icono={<FaMusic className="text-indigo-400 text-xs" />}
                favoritos={favoritosVidaCristiana}
                colorScheme="indigo"
                vistaActual={vistaActual}
                onNavigate={handleNavigate}
                onEliminar={confirmarEliminarFavorito}
              />
            )}
          </div>
        )}
      </div>

      {/* Modal confirmación eliminar */}
      {modalEliminar.visible && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className="text-red-400 text-sm" />
                <span className="text-sm font-semibold text-white">Quitar favorito</span>
              </div>
              <button
                onClick={() => setModalEliminar({visible: false, himno: null})}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded"
              ><FaTimes className="text-xs" /></button>
            </div>
            <div className="p-4">
              <p className="text-slate-400 text-sm mb-3">
                ¿Quitar <span className="text-white font-medium">"{modalEliminar.himno?.titulo}"</span> de favoritos?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setModalEliminar({visible: false, himno: null})}
                  className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600/50 text-slate-300 text-sm rounded-lg transition-colors"
                >Cancelar</button>
                <button
                  onClick={handleEliminarFavorito}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600/80 hover:bg-red-600 border border-red-500/30 text-white text-sm rounded-lg transition-colors"
                ><FaTrash className="text-xs" /> Quitar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sección himnos personalizados
const SeccionFavoritosPersonalizados = ({favoritos, loading, filtro, setFiltro, vistaActual, onNavigate, onEliminar}) => {
  const filtrados = favoritos.filter(
    (f) =>
      f.titulo.toLowerCase().includes(filtro.toLowerCase()) ||
      f.id.toString().includes(filtro),
  );

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Header de sección */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <FaUser className="text-emerald-400 text-xs" />
          <span className="text-xs font-semibold text-slate-300">Mis Himnos</span>
          <span className="text-[10px] text-slate-500 tabular-nums">{favoritos.length}</span>
        </div>
        {favoritos.length > 3 && (
          <div className="relative">
            <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]" />
            <input
              type="text"
              placeholder="Buscar..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="pl-6 pr-3 py-1 bg-slate-800 border border-slate-600/60 hover:border-slate-500 focus:border-emerald-500/70 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none transition-colors w-40"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400"></div>
        </div>
      ) : filtrados.length === 0 ? (
        <p className="text-center text-slate-600 text-xs py-6">Sin resultados</p>
      ) : vistaActual === "tarjetas" ? (
        <div className="p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {filtrados.map((f) => (
            <FavoritoCard key={f.id} favorito={f} colorScheme="emerald" onNavigate={onNavigate} onEliminar={onEliminar} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          {filtrados.map((f) => (
            <FavoritoListItem key={f.id} favorito={f} colorScheme="emerald" onNavigate={onNavigate} onEliminar={onEliminar} />
          ))}
        </div>
      )}
    </div>
  );
};

// Sección versículos de Biblia
const SeccionFavoritosBiblia = ({favoritos, vistaActual, onProyectar, onQuitar}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/40">
        <FaBible className="text-yellow-400 text-xs" />
        <span className="text-xs font-semibold text-slate-300">Biblia</span>
        <span className="text-[10px] text-slate-500 tabular-nums">{favoritos.length}</span>
      </div>

      {vistaActual === "tarjetas" ? (
        <div className="p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {favoritos.map((f) => (
            <div key={f.id} className="group bg-slate-800/60 border border-slate-700/50 hover:border-yellow-500/30 rounded-lg p-3 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-xs font-semibold text-white">{f.libroNombre || "Biblia"}</p>
                  <p className="text-[10px] text-slate-500">{f.capitulo}:{f.versiculo}</p>
                </div>
                <button onClick={() => onQuitar(f)} className="p-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Quitar">
                  <FaTrash className="text-[10px]" />
                </button>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-3">{f.texto}</p>
              <button
                onClick={() => onProyectar(f)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg text-xs text-yellow-300 transition-colors"
              ><FaPlay className="text-[10px]" /> Proyectar</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          {favoritos.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-3 py-2 border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40 transition-colors">
              <span className="shrink-0 text-[10px] text-yellow-400/70 font-bold tabular-nums w-14 text-center bg-yellow-500/10 border border-yellow-500/15 rounded px-1 py-0.5">
                {f.capitulo}:{f.versiculo}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-300 truncate">{f.libroNombre}</p>
                <p className="text-[11px] text-slate-500 truncate">{f.texto}</p>
              </div>
              <div className="shrink-0 flex items-center gap-1">
                <button onClick={() => onProyectar(f)} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors" title="Proyectar">
                  <FaPlay className="text-[10px]" />
                </button>
                <button onClick={() => onQuitar(f)} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Quitar">
                  <FaTrash className="text-[10px]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Sección genérica (Moravos / Vida Cristiana)
const SeccionFavoritos = ({titulo, icono, favoritos, colorScheme, vistaActual, onNavigate, onEliminar}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/40">
        {icono}
        <span className="text-xs font-semibold text-slate-300">{titulo}</span>
        <span className="text-[10px] text-slate-500 tabular-nums">{favoritos.length}</span>
      </div>
      {vistaActual === "tarjetas" ? (
        <div className="p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {favoritos.map((f) => (
            <FavoritoCard
              key={`${f.tipo}-${f.numero || f.id}`}
              favorito={f}
              colorScheme={colorScheme}
              onNavigate={onNavigate}
              onEliminar={onEliminar}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          {favoritos.map((f) => (
            <FavoritoListItem
              key={`${f.tipo}-${f.numero || f.id}`}
              favorito={f}
              colorScheme={colorScheme}
              onNavigate={onNavigate}
              onEliminar={onEliminar}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Tarjeta
const FavoritoCard = ({favorito, colorScheme, onNavigate, onEliminar}) => {
  const identificador = favorito.numero || favorito.id;
  const accentColor = {
    emerald: "text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40",
    cyan:    "text-cyan-400 border-cyan-500/20 hover:border-cyan-500/40",
    indigo:  "text-indigo-400 border-indigo-500/20 hover:border-indigo-500/40",
  }[colorScheme] || "text-slate-400 border-slate-600/40 hover:border-slate-500/40";

  return (
    <div
      className={`group bg-slate-800/60 border border-slate-700/50 ${accentColor.split(" ").slice(1).join(" ")} rounded-lg p-3 transition-colors cursor-pointer`}
      onClick={() => onNavigate(identificador, favorito.tipo)}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={`text-[10px] font-bold tabular-nums ${accentColor.split(" ")[0]}`}>#{identificador}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onEliminar(identificador, favorito.titulo, favorito.tipo); }}
          className="p-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Quitar de favoritos"
        ><FaTrash className="text-[10px]" /></button>
      </div>
      <p className="text-sm font-semibold text-slate-200 line-clamp-2 mb-1">{favorito.titulo}</p>
      {favorito.autor && <p className="text-[10px] text-slate-500 mb-2">{favorito.autor}</p>}
      <div className="flex items-center gap-1 mt-2">
        <FaHeart className="text-rose-400 text-[10px]" />
        <span className="text-[10px] text-slate-600">Favorito</span>
      </div>
    </div>
  );
};

// Item de lista
const FavoritoListItem = ({favorito, colorScheme, onNavigate, onEliminar}) => {
  const identificador = favorito.numero || favorito.id;
  const accentClass = {
    emerald: "text-emerald-400/70",
    cyan:    "text-cyan-400/70",
    indigo:  "text-indigo-400/70",
  }[colorScheme] || "text-slate-400/70";

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40 transition-colors">
      <span className={`shrink-0 text-[10px] font-bold tabular-nums w-8 text-center ${accentClass}`}>
        {identificador || "—"}
      </span>
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onNavigate(identificador, favorito.tipo)}
      >
        <p className="text-sm text-slate-300 hover:text-white truncate transition-colors">{favorito.titulo}</p>
        {favorito.autor && <p className="text-[11px] text-slate-500 truncate">{favorito.autor}</p>}
      </div>
      <div className="shrink-0 flex items-center gap-1">
        <FaHeart className="text-rose-400/50 text-[10px]" />
        <button
          onClick={() => onEliminar(identificador, favorito.titulo, favorito.tipo)}
          className="w-6 h-6 flex items-center justify-center rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Quitar de favoritos"
        ><FaTrash className="text-[10px]" /></button>
      </div>
    </div>
  );
};
