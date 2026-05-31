import React, {useState, useEffect, useRef, useMemo} from "react";
import {Link, useNavigate} from "react-router-dom";
import {
  FaHeart,
  FaRegHeart,
  FaPlay,
  FaList,
  FaTh,
  FaMusic,
} from "react-icons/fa";
import {
  FaMagnifyingGlass,
  FaFilter,
  FaXmark,
  FaCheck,
  FaBolt,
} from "react-icons/fa6";
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
        (e.key === "/" &&
          !["INPUT", "TEXTAREA", "SELECT"].includes(
            document.activeElement?.tagName,
          )) ||
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
    if (!paletaAbierta) return;
    setBusquedaPaleta("");
    setSeleccionado(0);
    const timer = setTimeout(() => paletaInputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [paletaAbierta]);

  // Scroll al item seleccionado
  useEffect(() => {
    itemRefs.current[seleccionado]?.scrollIntoView({block: "nearest"});
  }, [seleccionado]);

  const cargarHimnosDesdeServidor = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/himnos?tipo=moravo`, {
        method: "GET",
        headers: {Accept: "application/json"},
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok || !Array.isArray(json?.himnos))
        throw new Error(json?.error || `Error HTTP ${res.status}`);
      const norm = json.himnos.flatMap((h) => {
        if (!h?.titulo) return [];
        return [
          {
            id: h?.id,
            numero: h?.numero,
            titulo: h?.titulo,
            parrafos: Array.isArray(h?.parrafos) ? h.parrafos : [],
            favorito: Boolean(h?.favorito),
            fuente: h?.fuente,
          },
        ];
      });
      setHimnos(norm);
      const favSet = new Set();
      for (const h of norm) {
        if (h.favorito) favSet.add(h.numero);
      }
      setFavoritos(favSet);
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
    if (esAgregar) next.add(numero);
    else next.delete(numero);
    setFavoritos(next);
    setHimnos((p) =>
      (Array.isArray(p) ? p : []).map((h) =>
        h?.numero === numero ? {...h, favorito: esAgregar} : h,
      ),
    );
    try {
      const res = await fetch(
        `${API_BASE}/api/himnos/${encodeURIComponent(String(id))}/favorito`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({favorito: esAgregar}),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error();
      addToast(
        esAgregar ? `"${himno?.titulo}" en favoritos` : `Removido de favoritos`,
        esAgregar ? "success" : "info",
      );
    } catch {
      setFavoritos(prev);
      setHimnos((p) =>
        (Array.isArray(p) ? p : []).map((h) =>
          h?.numero === numero ? {...h, favorito: prev.has(numero)} : h,
        ),
      );
      addToast("No se pudo actualizar favorito", "error");
    }
  };

  const filtrados = himnos
    .filter(
      (h) =>
        h.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        h.numero.toString().includes(busqueda),
    )
    .sort((a, b) => {
      if (ordenamiento === "titulo") return a.titulo.localeCompare(b.titulo);
      if (ordenamiento === "favoritos") {
        const af = favoritos.has(a.numero),
          bf = favoritos.has(b.numero);
        if (af && !bf) return -1;
        if (!af && bf) return 1;
      }
      return a.numero - b.numero;
    });

  const resultadosPaleta = useMemo(
    () =>
      himnos
        .filter(
          (h) =>
            h.titulo.toLowerCase().includes(busquedaPaleta.toLowerCase()) ||
            h.numero.toString().includes(busquedaPaleta),
        )
        .slice(0, 40),
    [himnos, busquedaPaleta],
  );

  const handlePaletaKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSeleccionado((s) => Math.min(s + 1, resultadosPaleta.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSeleccionado((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && resultadosPaleta[seleccionado]) {
      navigate(`/himno/${resultadosPaleta[seleccionado].numero}`);
      setPaletaAbierta(false);
    } else if (e.key === "Escape") {
      setPaletaAbierta(false);
    }
  };

  // Primera línea de la primera estrofa para preview
  const primeraLinea = (himno) => {
    try {
      const p = himno?.parrafos?.[0];
      if (!p) return "";
      const str =
        typeof p === "string" ? p : Array.isArray(p) ? p[0] || "" : "";
      return str.split("\n")[0]?.trim() || "";
    } catch {
      return "";
    }
  };

  // Insertar divisores de rango cada 50 himnos cuando se ordena por número
  const listaConDivisores = useMemo(() => {
    if (ordenamiento !== "numero" || busqueda) {
      return filtrados.map((h) => ({tipo: "himno", data: h}));
    }
    const result = [];
    let rango = -1;
    for (const h of filtrados) {
      const base = Math.floor((h.numero - 1) / 50) * 50 + 1;
      if (base !== rango) {
        rango = base;
        result.push({tipo: "rango", label: `${base} – ${base + 49}`});
      }
      result.push({tipo: "himno", data: h});
    }
    return result;
  }, [filtrados, ordenamiento, busqueda]);

  return (
    <div className="bg-[#080c14] text-slate-100 h-full flex flex-col overflow-hidden">
      {/* ── Toasts ── */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/98 border shadow-2xl text-sm min-w-[240px] pointer-events-auto
              ${
                t.type === "success"
                  ? "border-emerald-500/30 border-l-2 border-l-emerald-500"
                  : t.type === "error"
                    ? "border-red-500/30 border-l-2 border-l-red-500"
                    : "border-sky-500/30 border-l-2 border-l-sky-500"
              }`}
          >
            {t.type === "success" ? (
              <FaCheck className="text-emerald-400 shrink-0 text-xs" />
            ) : (
              <FaRegHeart className="text-sky-400 shrink-0 text-xs" />
            )}
            <span className="flex-1 text-white/85 text-xs">{t.message}</span>
            <button
              type="button"
              onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
              className="text-white/30 hover:text-white/70"
            >
              <FaXmark className="text-[10px]" />
            </button>
          </div>
        ))}
      </div>

      {/* ── Paleta de búsqueda rápida ── */}
      {paletaAbierta && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
          style={{background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)"}}
          onClick={() => setPaletaAbierta(false)}
          role="dialog"
          aria-label="Búsqueda rápida de himnos"
          onKeyDown={(e) => e.key === "Escape" && setPaletaAbierta(false)}
        >
          <div
            className="w-full max-w-xl bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
              <FaMagnifyingGlass className="text-emerald-400 shrink-0 text-sm" />
              <input
                ref={paletaInputRef}
                type="text"
                placeholder="Buscar himno por título o número..."
                value={busquedaPaleta}
                onChange={(e) => {
                  setBusquedaPaleta(e.target.value);
                  setSeleccionado(0);
                }}
                onKeyDown={handlePaletaKey}
                className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
              />
              {busquedaPaleta && (
                <button
                  type="button"
                  onClick={() => {
                    setBusquedaPaleta("");
                    setSeleccionado(0);
                    paletaInputRef.current?.focus();
                  }}
                >
                  <FaXmark className="text-slate-500 hover:text-slate-300 text-xs" />
                </button>
              )}
              <kbd className="shrink-0 px-1.5 py-0.5 text-[10px] text-slate-500 bg-slate-800 border border-slate-700 rounded">
                Esc
              </kbd>
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              {resultadosPaleta.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-10">
                  Sin resultados
                </p>
              ) : (
                resultadosPaleta.map((himno, i) => (
                  <button
                    type="button"
                    key={himno.numero}
                    ref={(el) => (itemRefs.current[i] = el)}
                    onClick={() => {
                      navigate(`/himno/${himno.numero}`);
                      setPaletaAbierta(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                      ${i === seleccionado ? "bg-emerald-500/15 text-white" : "hover:bg-white/5 text-slate-300"}`}
                  >
                    <span
                      className={`shrink-0 w-8 h-7 flex items-center justify-center rounded-lg text-[11px] font-bold tabular-nums
                      ${i === seleccionado ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-slate-500"}`}
                    >
                      {himno.numero}
                    </span>
                    <span className="flex-1 text-sm truncate">
                      {himno.titulo}
                    </span>
                    {favoritos.has(himno.numero) && (
                      <FaHeart className="shrink-0 text-rose-400 text-[10px]" />
                    )}
                    {i === seleccionado && (
                      <span className="shrink-0 text-[10px] text-slate-500">
                        ↵
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="flex items-center gap-3 px-4 py-2 border-t border-white/8 text-[10px] text-slate-600">
              <span>
                <kbd className="px-1 bg-slate-800 border border-slate-700 rounded">
                  ↑↓
                </kbd>{" "}
                navegar
              </span>
              <span>
                <kbd className="px-1 bg-slate-800 border border-slate-700 rounded">
                  ↵
                </kbd>{" "}
                abrir
              </span>
              <span className="ml-auto">
                {resultadosPaleta.length} resultados
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Barra de herramientas ── */}
      <div className="shrink-0 z-30 bg-[#0d1117]/95 backdrop-blur border-b border-white/[0.06] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <div className="size-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <FaMusic className="text-emerald-400 text-[11px]" />
            </div>
            <span className="text-sm font-semibold text-white hidden sm:inline">
              Himnario Moravo
            </span>
          </div>

          <div className="w-px h-5 bg-white/8 shrink-0" />

          <div className="flex-1 relative min-w-0">
            <FaMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[11px] pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Filtrar himnos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-7 pr-20 py-1.5 bg-white/5 border border-white/8 hover:border-white/14 focus:border-emerald-500/60 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {busqueda && (
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda("");
                    inputRef.current?.focus();
                  }}
                >
                  <FaXmark className="text-slate-500 hover:text-slate-300 text-xs" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setPaletaAbierta(true)}
                className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 hover:bg-white/10 border border-white/8 rounded text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                title="Búsqueda rápida (Ctrl+K)"
              >
                <FaBolt className="text-[9px] text-amber-400" />
                <span className="hidden sm:inline">⌘K</span>
              </button>
            </div>
          </div>

          <select
            value={ordenamiento}
            onChange={(e) => setOrdenamiento(e.target.value)}
            className="bg-white/5 border border-white/8 hover:border-white/14 focus:border-emerald-500/60 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none transition-colors shrink-0"
            aria-label="Ordenar himnos"
          >
            <option value="numero" className="bg-slate-900">
              Número
            </option>
            <option value="titulo" className="bg-slate-900">
              Título A-Z
            </option>
            <option value="favoritos" className="bg-slate-900">
              Favoritos
            </option>
          </select>

          <div className="flex items-center gap-0.5 bg-white/5 border border-white/8 rounded-lg p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setVistaGrid(false)}
              className={`size-7 rounded-md flex items-center justify-center transition-all ${!vistaGrid ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-300"}`}
              title="Lista"
            >
              <FaList className="text-xs" />
            </button>
            <button
              type="button"
              onClick={() => setVistaGrid(true)}
              className={`size-7 rounded-md flex items-center justify-center transition-all ${vistaGrid ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-300"}`}
              title="Grid"
            >
              <FaTh className="text-xs" />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1.5 shrink-0 text-[11px] text-slate-600">
            <span className="tabular-nums">
              {filtrados.length}
              <span className="text-slate-700">/{himnos.length}</span>
            </span>
            {favoritos.size > 0 && (
              <span className="flex items-center gap-0.5 text-rose-500/60">
                <FaHeart className="text-[8px]" />
                {favoritos.size}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="size-16 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mb-4">
              <FaMagnifyingGlass className="text-2xl text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium mb-1">Sin resultados</p>
            <p className="text-slate-600 text-sm mb-4">
              No se encontraron himnos para "{busqueda}"
            </p>
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="px-4 py-2 text-xs bg-white/6 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              Mostrar todos
            </button>
          </div>
        ) : vistaGrid ? (
          /* ── GRID ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
            {filtrados.map((himno) => {
              const esFav = favoritos.has(himno.numero);
              const preview = primeraLinea(himno);
              return (
                <div
                  key={himno.numero}
                  className={`group relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-200
                    hover:-translate-y-0.5 hover:shadow-xl
                    ${
                      esFav
                        ? "bg-gradient-to-br from-rose-950/40 to-slate-900/80 border-rose-500/20 hover:border-rose-500/35 hover:shadow-rose-500/8"
                        : "bg-gradient-to-br from-slate-800/50 to-slate-900/70 border-white/[0.06] hover:border-emerald-500/25 hover:shadow-emerald-500/8"
                    }`}
                >
                  {/* Decoración musical */}
                  <div
                    className="absolute top-0 right-0 size-24 rounded-bl-3xl pointer-events-none"
                    style={{
                      background: esFav
                        ? "radial-gradient(circle at 100% 0%, rgba(244,63,94,0.08) 0%, transparent 70%)"
                        : "radial-gradient(circle at 100% 0%, rgba(16,185,129,0.06) 0%, transparent 70%)",
                    }}
                  />
                  <span
                    className="absolute top-2.5 right-3 text-3xl select-none pointer-events-none"
                    style={{
                      color: esFav
                        ? "rgba(244,63,94,0.12)"
                        : "rgba(16,185,129,0.10)",
                    }}
                  >
                    ♪
                  </span>

                  <div className="flex-1 p-4 flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold tabular-nums
                        ${
                          esFav
                            ? "bg-rose-500/15 border border-rose-500/25 text-rose-300"
                            : "bg-emerald-500/12 border border-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        #{himno.numero}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorito(himno);
                        }}
                        className={`size-7 rounded-lg flex items-center justify-center transition-all
                          ${
                            esFav
                              ? "text-rose-400 bg-rose-500/10"
                              : "text-slate-700 hover:text-rose-400 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10"
                          }`}
                      >
                        {esFav ? (
                          <FaHeart className="text-xs" />
                        ) : (
                          <FaRegHeart className="text-xs" />
                        )}
                      </button>
                    </div>

                    <Link
                      to={`/himno/${himno.numero}`}
                      className="flex-1 flex flex-col"
                    >
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
                          <FaMusic className="text-[8px]" />
                          {himno.parrafos.length} est.
                        </span>
                        <div
                          className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors text-white
                          ${
                            esFav
                              ? "bg-rose-600/70 group-hover:bg-rose-600"
                              : "bg-emerald-600/75 group-hover:bg-emerald-600"
                          }`}
                        >
                          <FaPlay className="text-[8px]" /> Ver
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── LISTA ── */
          <div className="flex flex-col gap-px p-3">
            {listaConDivisores.map((item, idx) => {
              if (item.tipo === "rango") {
                return (
                  <div
                    key={`rango-${item.label}`}
                    className={`flex items-center gap-3 px-1 ${idx === 0 ? "pt-0 pb-2" : "pt-4 pb-2"}`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      {item.label}
                    </span>
                    <div className="flex-1 h-px bg-white/[0.05]" />
                  </div>
                );
              }

              const himno = item.data;
              const esFav = favoritos.has(himno.numero);
              const preview = primeraLinea(himno);

              return (
                <div
                  key={himno.numero}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer
                    ${
                      esFav
                        ? "bg-rose-500/[0.04] border-rose-500/[0.12] hover:bg-rose-500/[0.08] hover:border-rose-500/20"
                        : "bg-white/[0.018] border-white/[0.04] hover:bg-white/[0.05] hover:border-emerald-500/20"
                    }`}
                >
                  {/* Barra accent en hover */}
                  <div
                    className={`absolute left-0 inset-y-2 w-[2.5px] rounded-r-full scale-y-0 group-hover:scale-y-100 transition-transform origin-center
                    ${esFav ? "bg-rose-500" : "bg-emerald-500"}`}
                  />

                  <Link
                    to={`/himno/${himno.numero}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    {/* Badge numérico */}
                    <div
                      className={`shrink-0 size-11 rounded-xl flex flex-col items-center justify-center transition-all
                      ${
                        esFav
                          ? "bg-rose-500/10 border border-rose-500/20 group-hover:bg-rose-500/15"
                          : "bg-emerald-500/8 border border-emerald-500/[0.15] group-hover:bg-emerald-500/12"
                      }`}
                    >
                      <span
                        className={`text-[9px] uppercase tracking-wider leading-none mb-0.5
                        ${esFav ? "text-rose-500/50" : "text-emerald-500/40"}`}
                      >
                        nro
                      </span>
                      <span
                        className={`text-[13px] font-bold tabular-nums leading-none
                        ${esFav ? "text-rose-300" : "text-emerald-300"}`}
                      >
                        {himno.numero}
                      </span>
                    </div>

                    {/* Título + preview */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[13px] font-semibold leading-snug truncate transition-colors
                        ${esFav ? "text-rose-100/90" : "text-white/85 group-hover:text-white"}`}
                      >
                        {himno.titulo}
                      </p>
                      {preview && (
                        <p className="text-[11px] text-slate-600 group-hover:text-slate-500 truncate mt-0.5 transition-colors italic">
                          {preview}
                        </p>
                      )}
                    </div>

                    {/* Estrofas */}
                    {himno.parrafos.length > 0 && (
                      <div className="shrink-0 hidden sm:flex items-center gap-1 text-[10px] text-slate-700 group-hover:text-slate-500 transition-colors">
                        <FaMusic className="text-[8px]" />
                        <span>{himno.parrafos.length}</span>
                      </div>
                    )}
                  </Link>

                  {/* Botón favorito */}
                  <button
                    type="button"
                    onClick={() => toggleFavorito(himno)}
                    className={`shrink-0 size-8 rounded-lg flex items-center justify-center transition-all duration-150
                      ${
                        esFav
                          ? "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                          : "text-slate-700 hover:text-rose-400 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10"
                      }`}
                  >
                    {esFav ? (
                      <FaHeart className="text-sm" />
                    ) : (
                      <FaRegHeart className="text-xs" />
                    )}
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

export default Himnos;
