import React, {useState, useEffect, useRef, useMemo} from "react";
import {Link, useNavigate} from "react-router-dom";
import {
  FaHeart, FaRegHeart, FaPlay, FaList, FaTh, FaMusic,
} from "react-icons/fa";
import {FaMagnifyingGlass, FaFilter, FaXmark, FaCheck, FaBolt} from "react-icons/fa6";
import himnosData from "../data/himnos.json";

const Himnos = () => {
  const API_BASE = "http://localhost:3001";
  const navigate = useNavigate();

  const [busqueda, setBusqueda] = useState("");
  const [himnos, setHimnos] = useState(himnosData);
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
      const res = await fetch(`${API_BASE}/api/himnos?tipo=moravo`, {
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
      setHimnos(himnosData);
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
    const id = himno?.id || `base:moravo:${numero}`;
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
      navigate(`/himno/${resultadosPaleta[seleccionado].numero}`);
      setPaletaAbierta(false);
    } else if (e.key === "Escape") { setPaletaAbierta(false); }
  };

  return (
    <div className="bg-slate-950 text-slate-100 h-full flex flex-col overflow-hidden">

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900/95 border border-white/10 shadow-xl text-sm min-w-[220px] ${t.type === "success" ? "border-l-2 border-l-emerald-500" : t.type === "error" ? "border-l-2 border-l-red-500" : "border-l-2 border-l-blue-500"}`}>
            {t.type === "success" ? <FaCheck className="text-emerald-400 shrink-0" /> : <FaRegHeart className="text-blue-400 shrink-0" />}
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
            className="w-full max-w-xl bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden"
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
                    onClick={() => { navigate(`/himno/${himno.numero}`); setPaletaAbierta(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === seleccionado ? "bg-emerald-600/20 text-white" : "hover:bg-slate-800 text-slate-300"}`}
                  >
                    <span className="shrink-0 w-8 text-right text-xs font-bold text-emerald-400/70 tabular-nums">{himno.numero}</span>
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
      <div className="shrink-0 sticky top-0 z-30 bg-slate-900/98 backdrop-blur border-b border-slate-700/50 px-3 py-2">
        <div className="flex items-center gap-2">

          {/* Título compacto */}
          <div className="flex items-center gap-1.5 shrink-0">
            <FaMusic className="text-emerald-400 text-sm" />
            <span className="text-sm font-semibold text-white hidden sm:inline">Himn. Moravo</span>
          </div>

          <div className="w-px h-5 bg-slate-700 shrink-0" />

          {/* Búsqueda filtro inline */}
          <div className="flex-1 relative min-w-0">
            <FaMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Filtrar lista..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-7 pr-20 py-1.5 bg-slate-800 border border-slate-600/60 hover:border-slate-500 focus:border-emerald-500/70 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {busqueda ? (
                <button onClick={() => { setBusqueda(""); inputRef.current?.focus(); }}>
                  <FaXmark className="text-slate-500 hover:text-slate-300 text-xs" />
                </button>
              ) : null}
              <button
                onClick={() => setPaletaAbierta(true)}
                className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-700/60 hover:bg-slate-600/60 border border-slate-600/40 rounded text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
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
              className="bg-slate-800 border border-slate-600/60 hover:border-slate-500 focus:border-emerald-500/70 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none transition-colors"
            >
              <option value="numero" className="bg-slate-800">Número</option>
              <option value="titulo" className="bg-slate-800">Título</option>
              <option value="favoritos" className="bg-slate-800">Favoritos</option>
            </select>
          </div>

          {/* Vista toggle */}
          <div className="flex items-center gap-0.5 bg-slate-800 border border-slate-600/60 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setVistaGrid(false)}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${!vistaGrid ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
              title="Lista"
            ><FaList className="text-xs" /></button>
            <button
              onClick={() => setVistaGrid(true)}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${vistaGrid ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
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

      {/* ── Lista / Grid ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <FaMagnifyingGlass className="text-3xl text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm mb-3">Sin resultados para "{busqueda}"</p>
            <button onClick={() => setBusqueda("")} className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-600/60 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              Ver todos
            </button>
          </div>
        ) : vistaGrid ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 p-3">
            {filtrados.map((himno) => (
              <div key={himno.numero} className="group relative bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/40 rounded-xl p-3 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-emerald-400/80 tabular-nums">#{himno.numero}</span>
                  <button
                    onClick={(e) => { e.preventDefault(); toggleFavorito(himno); }}
                    className={`transition-colors ${favoritos.has(himno.numero) ? "text-rose-400" : "text-slate-600 hover:text-rose-400"}`}
                  >
                    {favoritos.has(himno.numero) ? <FaHeart className="text-xs" /> : <FaRegHeart className="text-xs" />}
                  </button>
                </div>
                <Link to={`/himno/${himno.numero}`}>
                  <p className="text-xs font-medium text-slate-200 leading-snug mb-2.5 line-clamp-2 min-h-[2.5rem]">{himno.titulo}</p>
                  <div className="flex items-center justify-center gap-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white text-[10px] font-semibold px-2 py-1.5 rounded-lg transition-colors">
                    <FaPlay className="text-[9px]" /> Ver
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1 p-2">
            {filtrados.map((himno) => (
              <div key={himno.numero} className="flex items-center gap-3 px-3 py-2 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/50 hover:border-slate-600/70 rounded-lg transition-colors group">
                <Link to={`/himno/${himno.numero}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="shrink-0 w-9 text-center text-xs font-bold text-emerald-400/70 tabular-nums">{himno.numero}</span>
                  <span className="flex-1 text-sm text-slate-300 group-hover:text-white transition-colors truncate">{himno.titulo}</span>
                </Link>
                <button
                  onClick={() => toggleFavorito(himno)}
                  className={`shrink-0 p-1.5 rounded-lg transition-colors ${favoritos.has(himno.numero) ? "text-rose-400" : "text-slate-600 hover:text-rose-400"}`}
                >
                  {favoritos.has(himno.numero) ? <FaHeart className="text-xs" /> : <FaRegHeart className="text-xs" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Himnos;
