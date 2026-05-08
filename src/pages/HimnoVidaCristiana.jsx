import {useState, useEffect, useRef, useMemo} from "react";
import {useNavigate} from "react-router-dom";
import {
  FaHeart, FaRegHeart, FaPlay, FaList, FaTh,
} from "react-icons/fa";
import {FaMagnifyingGlass, FaFilter, FaXmark, FaCheck, FaBolt, FaCross} from "react-icons/fa6";
import vidacristianaData from "../data/vidacristiana.json";

const HimnoVidaCristiana = () => {
  const API_BASE = "http://localhost:3001";
  const navigate = useNavigate();

  const [busqueda, setBusqueda] = useState("");
  const [himnos, setHimnos] = useState(vidacristianaData);
  const [vistaGrid, setVistaGrid] = useState(false);
  const [ordenamiento, setOrdenamiento] = useState("numero");
  const [favoritos, setFavoritos] = useState(new Set());
  const [toasts, setToasts] = useState([]);

  // Paleta de búsqueda rápida
  const [paletaAbierta, setPaletaAbierta] = useState(false);
  const [busquedaPaleta, setBusquedaPaleta] = useState("");
  const [seleccionado, setSeleccionado] = useState(0);

  const inputRef = useRef(null);
  const paletaInputRef = useRef(null);
  const itemRefs = useRef([]);

  const handleClick = (numero) => {
    navigate(`/himno/${numero}`, {state: {tipo: "vidaCristiana"}});
  };

  useEffect(() => {
    cargarHimnosDesdeServidor();
  }, []);

  // Shortcut: "/" o Ctrl+K abre la paleta
  useEffect(() => {
    const handler = (e) => {
      if (
        (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) ||
        ((e.ctrlKey || e.metaKey) && e.key === "k")
      ) {
        e.preventDefault();
        setPaletaAbierta(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus al abrir la paleta
  useEffect(() => {
    if (paletaAbierta) {
      setBusquedaPaleta("");
      setSeleccionado(0);
      setTimeout(() => paletaInputRef.current?.focus(), 50);
    }
  }, [paletaAbierta]);

  // Scroll al item seleccionado
  useEffect(() => {
    itemRefs.current[seleccionado]?.scrollIntoView({block: "nearest"});
  }, [seleccionado]);

  const cargarHimnosDesdeServidor = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/himnos?tipo=vida`, {
        method: "GET", headers: {Accept: "application/json"},
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok || !Array.isArray(json?.himnos))
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      const norm = json.himnos
        .map((h) => ({id: h?.id, numero: h?.numero, titulo: h?.titulo, parrafos: Array.isArray(h?.parrafos) ? h.parrafos : [], favorito: Boolean(h?.favorito), fuente: h?.fuente}))
        .filter((h) => h?.titulo);
      setHimnos(norm);
      setFavoritos(new Set(norm.filter((h) => h.favorito).map((h) => h.numero)));
    } catch {
      setHimnos(vidacristianaData);
      setFavoritos(new Set());
    }
  };

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, {id, message, type}]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  };

  const toggleFavorito = async (himno) => {
    const numero = himno?.numero;
    const id = himno?.id || `base:vida:${numero}`;
    if (!numero) return;
    const prev = new Set(favoritos);
    const esAgregar = !prev.has(numero);
    const next = new Set(prev);
    if (esAgregar) next.add(numero); else next.delete(numero);
    setFavoritos(next);
    setHimnos((p) => (Array.isArray(p) ? p : []).map((h) => h?.numero === numero ? {...h, favorito: esAgregar} : h));
    try {
      const res = await fetch(`${API_BASE}/api/himnos/${encodeURIComponent(String(id))}/favorito`, {
        method: "POST",
        headers: {Accept: "application/json", "Content-Type": "application/json"},
        body: JSON.stringify({favorito: esAgregar}),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error();
      addToast(esAgregar ? `"${himno?.titulo}" en favoritos` : `Removido de favoritos`, esAgregar ? "success" : "info");
    } catch {
      setFavoritos(prev);
      setHimnos((p) => (Array.isArray(p) ? p : []).map((h) => h?.numero === numero ? {...h, favorito: prev.has(numero)} : h));
      addToast("No se pudo actualizar favorito", "error");
    }
  };

  const filtrados = himnos
    .filter((h) => h.titulo.toLowerCase().includes(busqueda.toLowerCase()) || h.numero.toString().includes(busqueda))
    .sort((a, b) => {
      if (ordenamiento === "titulo") return a.titulo.localeCompare(b.titulo);
      if (ordenamiento === "favoritos") {
        const af = favoritos.has(a.numero), bf = favoritos.has(b.numero);
        if (af && !bf) return -1; if (!af && bf) return 1;
      }
      return a.numero - b.numero;
    });

  const resultadosPaleta = useMemo(() =>
    himnos
      .filter((h) => h.titulo.toLowerCase().includes(busquedaPaleta.toLowerCase()) || h.numero.toString().includes(busquedaPaleta))
      .slice(0, 40),
    [himnos, busquedaPaleta]
  );

  const handlePaletaKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSeleccionado((s) => Math.min(s + 1, resultadosPaleta.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSeleccionado((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter" && resultadosPaleta[seleccionado]) {
      handleClick(resultadosPaleta[seleccionado].numero);
      setPaletaAbierta(false);
    } else if (e.key === "Escape") { setPaletaAbierta(false); }
  };

  return (
    <div className="bg-[#080c14] text-slate-100 h-full flex flex-col overflow-hidden">

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900/95 border border-white/10 shadow-xl text-sm min-w-[220px] ${t.type === "success" ? "border-l-2 border-l-amber-500" : t.type === "error" ? "border-l-2 border-l-red-500" : "border-l-2 border-l-blue-500"}`}>
            {t.type === "success" ? <FaCheck className="text-amber-400 shrink-0" /> : <FaRegHeart className="text-blue-400 shrink-0" />}
            <span className="flex-1 text-white/90">{t.message}</span>
            <button onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}><FaXmark className="text-white/40 hover:text-white/80 text-xs" /></button>
          </div>
        ))}
      </div>

      {/* ── Paleta de búsqueda rápida ── */}
      {paletaAbierta && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
          style={{background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)"}}
          onClick={() => setPaletaAbierta(false)}
        >
          <div
            className="w-full max-w-xl bg-[#0d1117] border border-white/[0.10] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input paleta */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/60">
              <FaMagnifyingGlass className="text-slate-400 shrink-0" />
              <input
                ref={paletaInputRef}
                type="text"
                placeholder="Buscar himno por título o número..."
                value={busquedaPaleta}
                onChange={(e) => { setBusquedaPaleta(e.target.value); setSeleccionado(0); }}
                onKeyDown={handlePaletaKey}
                className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
              />
              {busquedaPaleta && (
                <button onClick={() => { setBusquedaPaleta(""); setSeleccionado(0); paletaInputRef.current?.focus(); }}>
                  <FaXmark className="text-slate-500 hover:text-slate-300 text-xs" />
                </button>
              )}
              <kbd className="shrink-0 px-1.5 py-0.5 text-[10px] text-slate-500 bg-slate-800 border border-slate-700 rounded">Esc</kbd>
            </div>

            {/* Resultados paleta */}
            <div className="max-h-80 overflow-y-auto py-1">
              {resultadosPaleta.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">Sin resultados</p>
              ) : (
                resultadosPaleta.map((himno, i) => (
                  <button
                    key={himno.numero}
                    ref={(el) => (itemRefs.current[i] = el)}
                    onClick={() => { handleClick(himno.numero); setPaletaAbierta(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === seleccionado ? "bg-amber-600/20 text-white" : "hover:bg-white/5 text-slate-300"}`}
                  >
                    <span className="shrink-0 w-8 text-right text-xs font-bold text-amber-400/70 tabular-nums">{himno.numero}</span>
                    <span className="flex-1 text-sm truncate">{himno.titulo}</span>
                    {favoritos.has(himno.numero) && <FaHeart className="shrink-0 text-rose-400 text-[10px]" />}
                    {i === seleccionado && <span className="shrink-0 text-[10px] text-slate-500">↵</span>}
                  </button>
                ))
              )}
            </div>

            {/* Footer paleta */}
            <div className="flex items-center gap-3 px-4 py-2 border-t border-slate-700/60 text-[10px] text-slate-600">
              <span><kbd className="px-1 bg-slate-800 border border-slate-700 rounded">↑↓</kbd> navegar</span>
              <span><kbd className="px-1 bg-slate-800 border border-slate-700 rounded">↵</kbd> abrir</span>
              <span className="ml-auto">{resultadosPaleta.length} resultados</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Barra de herramientas compacta ── */}
      <div className="shrink-0 sticky top-0 z-30 bg-[#0d1117]/95 backdrop-blur border-b border-white/[0.06] px-3 py-2">
        <div className="flex items-center gap-2">

          {/* Título compacto */}
          <div className="flex items-center gap-1.5 shrink-0">
            <FaCross className="text-amber-400 text-sm" />
            <span className="text-sm font-semibold text-white hidden sm:inline">Vida Cristiana</span>
          </div>

          <div className="w-px h-5 bg-white/8 shrink-0" />

          {/* Búsqueda filtro inline */}
          <div className="flex-1 relative min-w-0">
            <FaMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Filtrar lista..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-7 pr-20 py-1.5 bg-white/5 border border-white/8 hover:border-white/14 focus:border-amber-500/60 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {busqueda ? (
                <button onClick={() => { setBusqueda(""); inputRef.current?.focus(); }}>
                  <FaXmark className="text-slate-500 hover:text-slate-300 text-xs" />
                </button>
              ) : null}
              <button
                onClick={() => setPaletaAbierta(true)}
                className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 hover:bg-white/10 border border-white/8 rounded text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                title="Búsqueda rápida (Ctrl+K)"
              >
                <FaBolt className="text-[9px] text-amber-400" />
                <span className="hidden sm:inline">⌘K</span>
              </button>
            </div>
          </div>

          {/* Ordenamiento */}
          <div className="flex items-center gap-1 shrink-0">
            <FaFilter className="text-slate-500 text-xs" />
            <select
              value={ordenamiento}
              onChange={(e) => setOrdenamiento(e.target.value)}
              className="bg-white/5 border border-white/8 hover:border-white/14 focus:border-amber-500/60 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none transition-colors"
            >
              <option value="numero" className="bg-slate-800">Número</option>
              <option value="titulo" className="bg-slate-800">Título</option>
              <option value="favoritos" className="bg-slate-800">Favoritos</option>
            </select>
          </div>

          {/* Vista toggle */}
          <div className="flex items-center gap-0.5 bg-white/5 border border-white/8 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setVistaGrid(false)}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${!vistaGrid ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
              title="Lista"
            ><FaList className="text-xs" /></button>
            <button
              onClick={() => setVistaGrid(true)}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${vistaGrid ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
              title="Grid"
            ><FaTh className="text-xs" /></button>
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0 text-[11px] text-slate-500">
            <span className="tabular-nums">{filtrados.length}/{himnos.length}</span>
            {favoritos.size > 0 && (
              <span className="flex items-center gap-0.5 text-rose-400/70">
                <FaHeart className="text-[9px]" />{favoritos.size}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mb-4">
              <FaMagnifyingGlass className="text-2xl text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium mb-1">Sin resultados</p>
            <p className="text-slate-600 text-sm mb-4">No se encontraron himnos para "{busqueda}"</p>
            <button onClick={() => setBusqueda("")}
              className="px-4 py-2 text-xs bg-white/6 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 hover:text-white transition-colors">
              Mostrar todos
            </button>
          </div>

        ) : vistaGrid ? (
          /* ── GRID ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
            {filtrados.map((himno) => {
              const esFav = favoritos.has(himno.numero);
              const p0 = himno?.parrafos?.[0];
              const preview = typeof p0 === "string" ? p0.split("\n")[0]?.trim() : "";
              return (
                <div key={himno.numero}
                  className={`group relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-200
                    hover:-translate-y-0.5 hover:shadow-xl
                    ${esFav
                      ? "bg-gradient-to-br from-rose-950/40 to-slate-900/80 border-rose-500/20 hover:border-rose-500/35 hover:shadow-rose-500/8"
                      : "bg-gradient-to-br from-slate-800/50 to-slate-900/70 border-white/[0.06] hover:border-amber-500/25 hover:shadow-amber-500/8"}`}>

                  <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-3xl pointer-events-none"
                    style={{background: esFav ? "radial-gradient(circle at 100% 0%, rgba(244,63,94,0.08) 0%, transparent 70%)" : "radial-gradient(circle at 100% 0%, rgba(245,158,11,0.07) 0%, transparent 70%)"}} />
                  <span className="absolute top-2.5 right-3 text-3xl select-none pointer-events-none"
                    style={{color: esFav ? "rgba(244,63,94,0.12)" : "rgba(245,158,11,0.10)"}}>♪</span>

                  <div className="flex-1 p-4 flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold tabular-nums
                        ${esFav ? "bg-rose-500/15 border border-rose-500/25 text-rose-300"
                                : "bg-amber-500/12 border border-amber-500/20 text-amber-300"}`}>
                        #{himno.numero}
                      </span>
                      <button
                        onClick={(e) => { e.preventDefault(); toggleFavorito(himno); }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all
                          ${esFav ? "text-rose-400 bg-rose-500/10"
                                  : "text-slate-700 hover:text-rose-400 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10"}`}
                      >
                        {esFav ? <FaHeart className="text-xs" /> : <FaRegHeart className="text-xs" />}
                      </button>
                    </div>

                    <div onClick={() => handleClick(himno.numero)} className="flex-1 flex flex-col cursor-pointer">
                      <h3 className="text-[12.5px] font-semibold text-slate-100 group-hover:text-white leading-snug line-clamp-2 min-h-[2.5rem] mb-1.5 transition-colors">
                        {himno.titulo}
                      </h3>
                      {preview && (
                        <p className="text-[10px] text-slate-600 group-hover:text-slate-500 truncate mb-3 transition-colors italic">
                          {preview}…
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-[10px] text-slate-700 flex items-center gap-1">
                          <FaPlay className="text-[8px]" />
                          {himno.parrafos?.length || 0} est.
                        </span>
                        <div className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors text-white
                          ${esFav ? "bg-rose-600/70 group-hover:bg-rose-600"
                                  : "bg-amber-600/75 group-hover:bg-amber-600"}`}>
                          <FaPlay className="text-[8px]" /> Ver
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        ) : (
          /* ── LISTA ── */
          <div className="flex flex-col gap-px px-3 py-3">
            {filtrados.map((himno, idx) => {
              const esFav = favoritos.has(himno.numero);
              const p0 = himno?.parrafos?.[0];
              const preview = typeof p0 === "string" ? p0.split("\n")[0]?.trim() : "";
              return (
                <div key={himno.numero}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150
                    ${esFav
                      ? "bg-rose-500/[0.04] border-rose-500/[0.12] hover:bg-rose-500/[0.08] hover:border-rose-500/20"
                      : "bg-white/[0.018] border-white/[0.04] hover:bg-white/[0.05] hover:border-amber-500/20"}`}>

                  <div className={`absolute left-0 inset-y-2 w-[2.5px] rounded-r-full scale-y-0 group-hover:scale-y-100 transition-transform origin-center
                    ${esFav ? "bg-rose-500" : "bg-amber-500"}`} />

                  <button onClick={() => handleClick(himno.numero)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className={`shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all
                      ${esFav
                        ? "bg-rose-500/10 border border-rose-500/20 group-hover:bg-rose-500/15"
                        : "bg-amber-500/8 border border-amber-500/[0.15] group-hover:bg-amber-500/12"}`}>
                      <span className={`text-[9px] uppercase tracking-wider leading-none mb-0.5
                        ${esFav ? "text-rose-500/50" : "text-amber-500/40"}`}>nro</span>
                      <span className={`text-[13px] font-bold tabular-nums leading-none
                        ${esFav ? "text-rose-300" : "text-amber-300"}`}>
                        {himno.numero}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold leading-snug truncate transition-colors
                        ${esFav ? "text-rose-100/90" : "text-white/85 group-hover:text-white"}`}>
                        {himno.titulo}
                      </p>
                      {preview && (
                        <p className="text-[11px] text-slate-600 group-hover:text-slate-500 truncate mt-0.5 transition-colors italic">
                          {preview}
                        </p>
                      )}
                    </div>

                    {(himno.parrafos?.length > 0) && (
                      <div className="shrink-0 hidden sm:flex items-center gap-1 text-[10px] text-slate-700 group-hover:text-slate-500 transition-colors">
                        <FaPlay className="text-[8px]" />
                        <span>{himno.parrafos.length}</span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => toggleFavorito(himno)}
                    className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150
                      ${esFav
                        ? "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                        : "text-slate-700 hover:text-rose-400 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10"}`}
                  >
                    {esFav ? <FaHeart className="text-sm" /> : <FaRegHeart className="text-xs" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HimnoVidaCristiana;
