import {useState, useEffect, useRef} from "react";
import {
  IoSave, IoRefresh, IoImage, IoClose, IoCheckmark,
  IoWarning, IoInformationCircle, IoEye, IoTrash,
} from "react-icons/io5";
import {FaVideo, FaUpload, FaTimes, FaChurch, FaPalette, FaFont} from "react-icons/fa";

const BASE_URL = "http://localhost:3001";

// ── Constantes ────────────────────────────────────────────────────────────────
const FONT_OPTIONS = [
  {valor: "text-3xl", etiqueta: "XS",  px: "30px", sample: "Aa"},
  {valor: "text-4xl", etiqueta: "S",   px: "36px", sample: "Aa"},
  {valor: "text-5xl", etiqueta: "M",   px: "48px", sample: "Aa"},
  {valor: "text-6xl", etiqueta: "L",   px: "60px", sample: "Aa"},
  {valor: "text-7xl", etiqueta: "XL",  px: "72px", sample: "Aa"},
  {valor: "text-8xl", etiqueta: "2XL", px: "96px", sample: "Aa"},
  {valor: "text-9xl", etiqueta: "3XL", px: "128px",sample: "Aa"},
];

const LOGO_SIZES = [
  {valor: "w-56 h-56",        etiqueta: "Pequeño"},
  {valor: "w-64 h-64",        etiqueta: "Mediano"},
  {valor: "w-80 h-80",        etiqueta: "Grande"},
  {valor: "w-96 h-96",        etiqueta: "Extra"},
  {valor: "w-[28rem] h-[28rem]", etiqueta: "Gigante"},
];

const COLOR_PRESETS = [
  "#ffffff","#f8fafc","#cbd5e1",
  "#fbbf24","#f97316","#ef4444",
  "#22c55e","#14b8a6","#3b82f6",
  "#8b5cf6","#ec4899","#6366f1",
];

const CONFIG_DEFAULTS = {
  nombreIglesia:"", eslogan:"", pastor:"",
  direccion:"", telefono:"", email:"", website:"",
  logo:"/images/icon-256.png", logoSize:"w-80 h-80",
  colorPrimario:"#ffffff", colorSecundario:"#d1d5db",
  fondoActivo:"", tipoFondo:"imagen",
  fontSize:{titulo:"text-5xl", parrafo:"text-6xl", eslogan:"text-2xl"},
  videosFondo:[], intervaloCambioVideo:120,
  mostrarLogo:true, mostrarNombreIglesia:true, mostrarEslogan:true,
};


// ── Subcomponentes ─────────────────────────────────────────────────────────────

const ACCENTS = {
  indigo: {
    header: "bg-indigo-500/8 border-b border-indigo-500/15",
    icon:   "text-indigo-400",
    dot:    "bg-indigo-500",
  },
  orange: {
    header: "bg-orange-500/8 border-b border-orange-500/15",
    icon:   "text-orange-400",
    dot:    "bg-orange-500",
  },
  purple: {
    header: "bg-purple-500/8 border-b border-purple-500/15",
    icon:   "text-purple-400",
    dot:    "bg-purple-500",
  },
  cyan: {
    header: "bg-cyan-500/8 border-b border-cyan-500/15",
    icon:   "text-cyan-400",
    dot:    "bg-cyan-500",
  },
  pink: {
    header: "bg-pink-500/8 border-b border-pink-500/15",
    icon:   "text-pink-400",
    dot:    "bg-pink-500",
  },
  violet: {
    header: "bg-violet-500/8 border-b border-violet-500/15",
    icon:   "text-violet-400",
    dot:    "bg-violet-500",
  },
  emerald: {
    header: "bg-emerald-500/8 border-b border-emerald-500/15",
    icon:   "text-emerald-400",
    dot:    "bg-emerald-500",
  },
};

function Card({icon, title, accent = "indigo", children, className = ""}) {
  const a = ACCENTS[accent] || ACCENTS.indigo;
  return (
    <div className={`bg-slate-900/60 border border-white/7 rounded-2xl overflow-hidden flex flex-col ${className}`}>
      <div className={`${a.header} px-5 py-3.5 flex items-center gap-3 shrink-0`}>
        <span className={`${a.icon} text-base shrink-0`}>{icon}</span>
        <span className="text-sm font-semibold text-white/90 tracking-tight">{title}</span>
      </div>
      <div className="p-5 flex-1">{children}</div>
    </div>
  );
}

function Toggle({checked, onChange, color = "indigo"}) {
  const colors = {
    indigo:"peer-checked:bg-indigo-500",
    violet:"peer-checked:bg-violet-500",
    emerald:"peer-checked:bg-emerald-500",
  };
  return (
    <label className="relative inline-flex cursor-pointer shrink-0">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <div className={`w-10 h-[22px] bg-slate-700 rounded-full transition-colors peer ${colors[color]||colors.indigo}
        after:content-[''] after:absolute after:top-[3px] after:left-[3px]
        after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
        peer-checked:after:translate-x-[18px]`}
      />
    </label>
  );
}

function FontPicker({value, onChange, max = 7, color = "indigo"}) {
  const selected = {
    indigo:"bg-indigo-500/20 border-indigo-400/60 text-indigo-200",
    cyan:  "bg-cyan-500/20 border-cyan-400/60 text-cyan-200",
    violet:"bg-violet-500/20 border-violet-400/60 text-violet-200",
  };
  const opts = FONT_OPTIONS.slice(0, max);
  return (
    <div className="flex gap-1.5">
      {opts.map(op => (
        <button
          key={op.valor}
          onClick={() => onChange(op.valor)}
          title={op.px}
          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
            value === op.valor
              ? (selected[color] || selected.indigo)
              : "bg-slate-800/60 border-white/7 text-slate-500 hover:border-white/20 hover:text-slate-300"
          }`}
        >
          {op.etiqueta}
        </button>
      ))}
    </div>
  );
}

function ColorField({label, value, onChange}) {
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  const commit = v => { if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v); };
  return (
    <div className="space-y-3">
      {label && <p className="text-xs font-medium text-slate-400">{label}</p>}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <input type="color" value={value} onChange={e => onChange(e.target.value)}
            className="w-11 h-11 rounded-xl border border-white/10 cursor-pointer bg-transparent p-1 block"
          />
        </div>
        <input type="text" value={hex} maxLength={7} placeholder="#ffffff"
          onChange={e => { setHex(e.target.value); commit(e.target.value); }}
          onBlur={() => setHex(value)}
          className="flex-1 px-3 py-2 bg-slate-800/80 border border-white/8 hover:border-white/15 focus:border-indigo-500/50 rounded-xl text-sm text-white font-mono focus:outline-none transition-colors"
        />
        {/* Muestra de color */}
        <div className="w-11 h-11 rounded-xl border border-white/10 shrink-0" style={{backgroundColor: value}} />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {COLOR_PRESETS.map(c => (
          <button key={c} onClick={() => onChange(c)} title={c}
            className={`w-6 h-6 rounded-lg border-2 transition-all hover:scale-110 ${
              value === c ? "border-white/80 scale-110 shadow-md" : "border-transparent hover:border-white/30"
            }`}
            style={{backgroundColor: c}}
          />
        ))}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

const TABS = [
  {id:"identidad",  label:"Identidad",  icon:<FaChurch  className="text-[11px]" />},
  {id:"apariencia", label:"Apariencia", icon:<FaPalette className="text-[11px]" />},
  {id:"proyector",  label:"Proyector",  icon:<FaFont    className="text-[11px]" />},
];

const inputCls = "w-full px-3.5 py-2.5 bg-slate-800/80 border border-white/8 hover:border-white/15 focus:border-indigo-500/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-colors";

const Configuracion = () => {
  const [tab,          setTab]          = useState("identidad");
  const [configuracion,setConfiguracion]= useState(CONFIG_DEFAULTS);
  const [savedConfig,  setSavedConfig]  = useState(CONFIG_DEFAULTS);
  const [fondos,       setFondos]       = useState([]);
  const [fondoActual,  setFondoActual]  = useState(null); // fondo con activo===true
  const [mostrarSelectorFondo, setMostrarSelectorFondo] = useState(false);
  const [previsualizandoFondo, setPrevisualizandoFondo] = useState(null);
  const [mostrarModalRestaurar,setMostrarModalRestaurar]= useState(false);
  const [archivoLogo,  setArchivoLogo] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [guardando,    setGuardando]   = useState(false);
  const [cargando,     setCargando]    = useState(true);
  const [mensaje,      setMensaje]     = useState(null);
  const [dragLogo,     setDragLogo]    = useState(false);
  const [splitActivo,  setSplitActivo] = useState(() => localStorage.getItem("himno-auto-split") === "true");
  const [splitLineas,  setSplitLineas] = useState(() => {
    const n = parseInt(localStorage.getItem("himno-split-lines") || "3", 10);
    return [2,3,4].includes(n) ? n : 3;
  });
  const logoInputRef = useRef(null);

  // Detecta cambios en campos de texto/logo que el usuario debe guardar manualmente.
  // Los controles tipo botón (font size, colores, toggles, logoSize) se auto-guardan
  // al instante, por lo que no cuentan para habilitar el botón principal.
  const hasTextChanges =
    configuracion.nombreIglesia !== savedConfig.nombreIglesia ||
    configuracion.eslogan       !== savedConfig.eslogan       ||
    configuracion.pastor        !== savedConfig.pastor;
  const hasChanges = hasTextChanges || !!archivoLogo;

  // ── Carga ──────────────────────────────────────────────────────────────────

  const cargarFondos = async () => {
    try {
      const data = await window.electron.obtenerFondos();
      setFondos(data || []);
      const activo = (data || []).find(f => !!f.activo);
      setFondoActual(activo || null);
    } catch {
      mostrarMensaje("Error al cargar los fondos", "error");
    }
  };

  const cargarConfiguracion = async () => {
    setCargando(true);
    try {
      const config = await window.electron?.obtenerConfiguracion?.();
      if (config && Object.keys(config).length > 0) {
        const merged = {
          ...CONFIG_DEFAULTS, ...config,
          nombreIglesia: config.nombreIglesia || "",
          eslogan:       config.eslogan       || "",
          website:       config.sitioWeb      || "",
          logo: config.logoUrl && config.logoUrl !== "/logo.jpg" && config.logoUrl !== ""
            ? config.logoUrl : "/images/icon-256.png",
        };
        setConfiguracion(merged);
        setSavedConfig(merged);
      }
    } catch (err) {
      mostrarMensaje(`Error al cargar: ${err.message}`, "error");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarConfiguracion();
    cargarFondos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const set = (campo, valor) => setConfiguracion(prev => ({...prev, [campo]: valor}));

  const mostrarMensaje = (texto, tipo) => {
    setMensaje({texto, tipo});
    setTimeout(() => setMensaje(null), 4000);
  };

  const procesarArchivoLogo = archivo => {
    if (!archivo?.type?.startsWith("image/")) { mostrarMensaje("Archivo no válido", "error"); return; }
    setArchivoLogo(archivo);
    const r = new FileReader();
    r.onload = ev => setLogoPreviewUrl(ev.target.result);
    r.readAsDataURL(archivo);
  };

  // ── Guardar ───────────────────────────────────────────────────────────────

  const guardarConfiguracionCompleta = async (cfg = configuracion) => {
    if (!window.electron?.guardarConfiguracion) throw new Error("No disponible");
    const flat = {
      nombreIglesia:        cfg.nombreIglesia   || "",
      eslogan:              cfg.eslogan         || "",
      pastor:               cfg.pastor          || "",
      direccion:            cfg.direccion       || "",
      telefono:             cfg.telefono        || "",
      email:                cfg.email           || "",
      sitioWeb:             cfg.website || cfg.sitioWeb || "",
      logoUrl:              cfg.logo            || "",
      logoSize:             cfg.logoSize        || "w-80 h-80",
      colorPrimario:        cfg.colorPrimario   || "#ffffff",
      colorSecundario:      cfg.colorSecundario || "#d1d5db",
      fontSizeTitulo:       cfg.fontSize?.titulo  || "text-5xl",
      fontSizeParrafo:      cfg.fontSize?.parrafo || "text-6xl",
      fontSizeEslogan:      cfg.fontSize?.eslogan || "text-2xl",
      mostrarLogo:          String(cfg.mostrarLogo          ?? true),
      mostrarNombreIglesia: String(cfg.mostrarNombreIglesia ?? true),
      mostrarEslogan:       String(cfg.mostrarEslogan       ?? true),
    };
    const ok = await window.electron.guardarConfiguracion(flat);
    if (!ok) throw new Error("No se pudo guardar");
    return ok;
  };

  // Aplica el cambio al proyector de inmediato sin deshabilitar el botón "Guardar cambios".
  // No llama a setSavedConfig para que hasChanges siga true y el usuario
  // siempre tenga la opción de confirmar con el botón principal.
  const guardarSilencioso = async (nuevaCfg) => {
    try {
      await guardarConfiguracionCompleta(nuevaCfg);
      // No setSavedConfig — el botón "Guardar cambios" permanece activo
    } catch { /* noop */ }
  };

  const guardarConfiguracion = async () => {
    setGuardando(true);
    try {
      let cfg = {...configuracion};
      if (archivoLogo) {
        try {
          const buf  = await archivoLogo.arrayBuffer();
          const path = await window.electron.guardarLogo(new Uint8Array(buf));
          if (path) { cfg = {...cfg, logo: path}; setConfiguracion(c => ({...c, logo: path})); }
        } catch { mostrarMensaje("Error al guardar el logo", "error"); }
      }
      await guardarConfiguracionCompleta(cfg);
      setSavedConfig(cfg);
      setArchivoLogo(null);
      setLogoPreviewUrl(null);
      mostrarMensaje("Configuración guardada correctamente", "success");
    } catch (err) {
      mostrarMensaje(`Error: ${err.message}`, "error");
    } finally {
      setGuardando(false);
    }
  };

  const seleccionarFondo = async fondo => {
    try {
      await window.electron.establecerFondoActivo(fondo.id);
      setFondoActual(fondo);
      const cfg = {...configuracion, fondoActivo: fondo.url, tipoFondo: fondo.tipo};
      setConfiguracion(cfg);
      await guardarConfiguracionCompleta(cfg);
      await cargarFondos();
      mostrarMensaje(`Fondo "${fondo.nombre}" aplicado`, "success");
      setMostrarSelectorFondo(false);
    } catch { mostrarMensaje("Error al establecer el fondo", "error"); }
  };

  const eliminarFondo = async id => {
    if (!window.confirm("¿Eliminar este fondo?")) return;
    try {
      await window.electron.eliminarFondo(id);
      await cargarFondos();
      mostrarMensaje("Fondo eliminado", "success");
    } catch { mostrarMensaje("Error al eliminar", "error"); }
  };

  const restaurarDefecto = async () => {
    try {
      setMostrarModalRestaurar(false);
      const ok = await window.electron?.restaurarConfiguracionDefecto?.();
      if (!ok) throw new Error("No se pudo restaurar");
      setConfiguracion(CONFIG_DEFAULTS);
      setSavedConfig(CONFIG_DEFAULTS);
      setArchivoLogo(null); setLogoPreviewUrl(null);
      setFondoActual(null); setFondos([]);
      await cargarConfiguracion();
      await cargarFondos();
      mostrarMensaje("Configuración restaurada", "success");
    } catch (err) { mostrarMensaje(`Error: ${err.message}`, "error"); }
  };

  // ── Resolución de URL del logo ─────────────────────────────────────────────
  const logoSrc = logoPreviewUrl
    || (configuracion.logo?.startsWith("/uploads")
        ? `${BASE_URL}${configuracion.logo}`
        : configuracion.logo || "/images/icon-256.png");

  if (cargando) {
    return (
      <div className="bg-[#080c14] h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400" />
          <p className="text-slate-500 text-sm">Cargando configuración…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#080c14] h-full flex flex-col overflow-hidden text-slate-100">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-slate-900/95 backdrop-blur border-b border-white/6 px-4 py-3">
        <div className="flex items-center gap-3">

          {/* Tabs — pill style, responsive */}
          <nav className="flex items-center gap-0.5 bg-slate-800/60 border border-white/8 rounded-xl p-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === t.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/40"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </nav>

          {/* Toast inline */}
          {mensaje && (
            <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl border ${
              mensaje.tipo === "success" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
              : mensaje.tipo === "error" ? "bg-red-500/10 border-red-500/25 text-red-300"
              : "bg-blue-500/10 border-blue-500/25 text-blue-300"
            }`}>
              {mensaje.tipo === "success" && <IoCheckmark />}
              {mensaje.tipo === "error"   && <IoWarning   />}
              {mensaje.tipo === "info"    && <IoInformationCircle />}
              <span className="hidden sm:inline">{mensaje.texto}</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2.5 shrink-0">
            {hasChanges && (
              <span className="hidden md:flex items-center gap-1.5 text-[10px] text-amber-400 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Sin guardar
              </span>
            )}
            <button onClick={() => setMostrarModalRestaurar(true)} disabled={guardando}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/8 rounded-xl text-xs text-amber-300 font-medium transition-colors">
              <IoRefresh className="text-xs" />
              <span className="hidden sm:inline">Restaurar</span>
            </button>
            <button onClick={guardarConfiguracion} disabled={guardando || !hasChanges}
              className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed border border-indigo-500/30 rounded-xl text-xs text-white font-semibold transition-all shadow-lg shadow-indigo-900/30">
              <IoSave className="text-xs" />
              <span className="hidden sm:inline">{guardando ? "Guardando…" : "Guardar cambios"}</span>
              <span className="sm:hidden">{guardando ? "…" : "Guardar"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Contenido ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 xl:p-6">

          {/* ════════════════ TAB: IDENTIDAD ════════════════ */}
          {tab === "identidad" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr] gap-4 items-start">

              {/* Logo */}
              <Card icon={<IoImage />} title="Logo de la Iglesia" accent="orange">
                <div className="flex flex-col gap-4">
                  {/* Drop zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragLogo(true); }}
                    onDragLeave={() => setDragLogo(false)}
                    onDrop={e => { e.preventDefault(); setDragLogo(false); const f = e.dataTransfer.files[0]; if (f) procesarArchivoLogo(f); }}
                    onClick={() => logoInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all py-6 ${
                      dragLogo
                        ? "border-orange-400/60 bg-orange-500/8"
                        : "border-white/10 hover:border-white/20 hover:bg-white/3"
                    }`}
                  >
                    <div className="w-24 h-24 rounded-2xl bg-slate-800/80 border border-white/8 overflow-hidden p-1">
                      <img src={logoSrc} alt="Logo" className="w-full h-full object-contain rounded-xl"
                        onError={e => { e.target.src = "/images/icon-256.png"; }} />
                    </div>
                    <div className="text-center px-3">
                      <p className="text-xs font-semibold text-slate-300">
                        {archivoLogo ? archivoLogo.name : "Arrastra o haz clic para cambiar"}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-1">PNG, JPG · Recomendado 500×500 px</p>
                    </div>
                    {archivoLogo && (
                      <button onClick={e => { e.stopPropagation(); setArchivoLogo(null); setLogoPreviewUrl(null); }}
                        className="absolute top-2 right-2 p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400">
                        <IoClose className="text-xs" />
                      </button>
                    )}
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files[0]) procesarArchivoLogo(e.target.files[0]); }} />

                  {/* Visibilidad */}
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-3">Visibilidad en pantalla</p>
                    {[
                      {campo:"mostrarLogo",          label:"Mostrar logo",   color:"emerald"},
                      {campo:"mostrarNombreIglesia",  label:"Mostrar nombre", color:"emerald"},
                      {campo:"mostrarEslogan",        label:"Mostrar eslogan",color:"emerald"},
                    ].map(({campo, label, color}) => (
                      <div key={campo} className="flex items-center justify-between py-2 border-b border-white/4 last:border-0">
                        <span className="text-sm text-slate-300">{label}</span>
                        <Toggle checked={!!configuracion[campo]} onChange={v => {
                          const nueva = {...configuracion, [campo]: v};
                          setConfiguracion(nueva);
                          guardarSilencioso(nueva);
                        }} color={color} />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Información General */}
              <Card icon={<FaChurch />} title="Información de la Iglesia" accent="indigo">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre de la Iglesia</label>
                    <input type="text" value={configuracion.nombreIglesia}
                      onChange={e => set("nombreIglesia", e.target.value)}
                      className={inputCls} placeholder="Ej: GloryView Church" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Eslogan / Mensaje de Bienvenida</label>
                    <input type="text" value={configuracion.eslogan}
                      onChange={e => set("eslogan", e.target.value)}
                      className={inputCls} placeholder="Ej: Bienvenidos a la Casa de Dios" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Pastor / Líder Principal</label>
                    <input type="text" value={configuracion.pastor}
                      onChange={e => set("pastor", e.target.value)}
                      className={inputCls} placeholder="Ej: Pastor Juan Pérez" />
                  </div>
                </div>
              </Card>

              {/* Vista Previa — ocupa columna más ancha, span en md */}
              <div className="md:col-span-2 xl:col-span-1">
              <Card icon={<IoEye />} title="Vista Previa del Proyector" accent="cyan">
                {/* Contenedor 16:9 con max-height para que no sea enorme */}
                <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-white/6"
                  style={{paddingBottom: "min(56.25%, 220px)"}}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6">
                    {configuracion.mostrarLogo && (
                      <img src={logoSrc} alt="Logo"
                        className="w-12 h-12 xl:w-16 xl:h-16 object-contain"
                        onError={e => { e.target.src = "/images/icon-256.png"; }}
                      />
                    )}
                    {configuracion.mostrarNombreIglesia && configuracion.nombreIglesia && (
                      <p className="text-lg xl:text-2xl font-bold text-center leading-tight"
                        style={{color: configuracion.colorPrimario}}>
                        {configuracion.nombreIglesia}
                      </p>
                    )}
                    {configuracion.mostrarEslogan && configuracion.eslogan && (
                      <p className="text-xs text-center opacity-80"
                        style={{color: configuracion.colorSecundario}}>
                        {configuracion.eslogan}
                      </p>
                    )}
                    {!configuracion.nombreIglesia && !configuracion.eslogan && !configuracion.mostrarLogo && (
                      <p className="text-slate-700 text-sm">Vista previa del proyector</p>
                    )}
                  </div>
                  <span className="absolute bottom-1.5 right-2.5 text-[9px] text-slate-700 font-mono select-none">16:9</span>
                </div>

                {/* Muestra de colores */}
                <div className="mt-4 flex gap-3">
                  <div className="flex-1 flex items-center gap-2 bg-slate-800/50 rounded-xl px-3 py-2.5 border border-white/5">
                    <div className="w-4 h-4 rounded-full shrink-0 border border-white/10" style={{backgroundColor: configuracion.colorPrimario}} />
                    <span className="text-xs text-slate-400">Primario</span>
                    <span className="ml-auto text-xs font-mono text-slate-500">{configuracion.colorPrimario}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2 bg-slate-800/50 rounded-xl px-3 py-2.5 border border-white/5">
                    <div className="w-4 h-4 rounded-full shrink-0 border border-white/10" style={{backgroundColor: configuracion.colorSecundario}} />
                    <span className="text-xs text-slate-400">Secundario</span>
                    <span className="ml-auto text-xs font-mono text-slate-500">{configuracion.colorSecundario}</span>
                  </div>
                </div>
              </Card>
              </div>
            </div>
          )}

          {/* ════════════════ TAB: APARIENCIA ════════════════ */}
          {tab === "apariencia" && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-4 items-start">

              {/* Colores — auto-guardan con debounce para no saturar en cada tick del picker */}
              <Card icon={<FaPalette />} title="Colores del Tema" accent="pink">
                <div className="space-y-6">
                  <ColorField
                    label="Color Primario — Títulos e Himno"
                    value={configuracion.colorPrimario}
                    onChange={v => {
                      const nueva = {...configuracion, colorPrimario: v};
                      setConfiguracion(nueva);
                      guardarSilencioso(nueva);
                    }}
                  />
                  <div className="border-t border-white/5 pt-6">
                    <ColorField
                      label="Color Secundario — Eslogan y Texto"
                      value={configuracion.colorSecundario}
                      onChange={v => {
                        const nueva = {...configuracion, colorSecundario: v};
                        setConfiguracion(nueva);
                        guardarSilencioso(nueva);
                      }}
                    />
                  </div>
                </div>
              </Card>

              {/* Fondo del Proyector */}
              <Card icon={<IoImage />} title="Fondo del Proyector" accent="purple">
                {/* Layout: preview cuadrado a la izquierda + grid de fondos a la derecha */}
                <div className="flex gap-4 items-start">

                  {/* Preview cuadrado — tamaño fijo */}
                  <div className="shrink-0 flex flex-col gap-2" style={{width:"200px"}}>
                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-white/6"
                      style={{width:"200px", height:"200px"}}>
                      {fondoActual ? (
                        fondoActual.tipo === "video" ? (
                          <video src={fondoActual.url} className="w-full h-full object-cover"
                            autoPlay muted loop playsInline onError={e => { e.target.style.display="none"; }} />
                        ) : (
                          <img src={fondoActual.url} alt={fondoActual.nombre}
                            className="w-full h-full object-cover" onError={e => { e.target.style.display="none"; }} />
                        )
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                          <FaVideo className="text-3xl text-slate-700" />
                          <p className="text-slate-600 text-xs text-center px-3">Video por defecto</p>
                        </div>
                      )}
                      {/* Badge activo */}
                      {fondoActual && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 py-2">
                          <div className="flex items-center gap-1.5">
                            {fondoActual.tipo === "video"
                              ? <FaVideo className="text-red-400 text-[9px] shrink-0" />
                              : <IoImage className="text-blue-400 text-[9px] shrink-0" />}
                            <span className="text-[10px] text-white/80 truncate flex-1">{fondoActual.nombre}</span>
                          </div>
                          <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wide">● Activo</span>
                        </div>
                      )}
                    </div>
                    {/* Botón cambiar bajo el cuadrado */}
                    <button onClick={() => setMostrarSelectorFondo(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/4 hover:bg-white/8 border border-dashed border-white/12 hover:border-white/22 text-xs text-slate-400 hover:text-slate-200 font-medium transition-all">
                      <FaUpload className="text-[9px]" />
                      {fondoActual ? "Cambiar" : "Seleccionar"}
                    </button>
                  </div>

                  {/* Grid de fondos disponibles — columnas */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2.5">
                      Disponibles {fondos.length > 0 && `(${fondos.length})`}
                    </p>

                    {fondos.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-36 gap-2 rounded-xl border border-dashed border-white/6 text-slate-700">
                        <IoImage className="text-2xl" />
                        <p className="text-xs">Sin fondos subidos</p>
                      </div>
                    ) : (
                      <div className="grid gap-2 overflow-y-auto pr-0.5" style={{
                        gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))",
                        maxHeight: "220px",
                      }}>
                        {fondos.map(f => (
                          <button key={f.id} onClick={() => seleccionarFondo(f)} title={f.nombre}
                            className={`relative rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.04] hover:shadow-lg group ${
                              !!f.activo
                                ? "border-emerald-400/70 shadow-emerald-900/20 shadow-md"
                                : "border-white/8 hover:border-white/30"
                            }`}
                            style={{aspectRatio:"1/1"}}
                          >
                            {f.tipo === "video" ? (
                              <video src={f.url} className="w-full h-full object-cover" muted
                                onMouseEnter={e => e.target.play()} onMouseLeave={e => e.target.pause()} />
                            ) : (
                              <img src={f.url} alt={f.nombre} className="w-full h-full object-cover" />
                            )}
                            {/* Overlay en hover */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <IoCheckmark className="text-white text-base" />
                            </div>
                            {/* Check si activo */}
                            {!!f.activo && (
                              <div className="absolute inset-0 bg-emerald-500/20 flex items-end justify-end p-1">
                                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <IoCheckmark className="text-white text-[9px]" />
                                </div>
                              </div>
                            )}
                            {/* Nombre al hover */}
                            <div className="absolute bottom-0 inset-x-0 bg-black/70 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-[9px] text-white/90 truncate">{f.nombre}</p>
                            </div>
                          </button>
                        ))}
                        {/* Botón subir nuevo */}
                        <button onClick={() => setMostrarSelectorFondo(true)}
                          className="rounded-xl border-2 border-dashed border-white/8 hover:border-white/25 flex flex-col items-center justify-center gap-1 text-slate-600 hover:text-slate-400 transition-all hover:bg-white/3"
                          style={{aspectRatio:"1/1"}}
                        >
                          <FaUpload className="text-xs" />
                          <span className="text-[9px]">Subir</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ════════════════ TAB: PROYECTOR ════════════════ */}
          {tab === "proyector" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

              {/* Tamaños de fuente */}
              <Card icon={<FaFont />} title="Tamaño de Texto en Pantalla" accent="cyan">
                <div className="space-y-5">
                  {[
                    {tipo:"titulo",  label:"Título del Himno / Versículo", color:"cyan", max:7},
                    {tipo:"parrafo", label:"Párrafo / Letra del Himno",     color:"cyan", max:7},
                    {tipo:"eslogan", label:"Eslogan en Pantalla de Inicio", color:"cyan", max:4},
                  ].map(({tipo, label, color, max}) => {
                    const found = FONT_OPTIONS.find(o => o.valor === configuracion.fontSize[tipo]);
                    return (
                      <div key={tipo} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-300">{label}</p>
                          <span className="text-xs text-slate-500 font-mono bg-slate-800/80 px-2 py-0.5 rounded-lg">
                            {found?.px || "—"}
                          </span>
                        </div>
                        <FontPicker
                          value={configuracion.fontSize[tipo]}
                          onChange={v => {
                            const nueva = {...configuracion, fontSize: {...configuracion.fontSize, [tipo]: v}};
                            setConfiguracion(nueva);
                            guardarSilencioso(nueva);
                          }}
                          max={max} color={color}
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Auto-split + Logo size */}
              <div className="space-y-4">
                {/* División de párrafos */}
                <Card icon={<span className="text-violet-400 font-bold">÷</span>} title="División de Párrafos" accent="violet">
                  <div className="space-y-4">
                    <label className="flex items-start justify-between gap-4 cursor-pointer">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">Auto-dividir párrafos largos</p>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Divide los párrafos del himno en diapositivas pequeñas para que el texto sea más grande y legible.
                        </p>
                      </div>
                      <Toggle checked={splitActivo} onChange={v => {
                        setSplitActivo(v);
                        localStorage.setItem("himno-auto-split", String(v));
                      }} color="violet" />
                    </label>

                    {splitActivo && (
                      <div className="border-t border-white/5 pt-4 space-y-2">
                        <p className="text-xs font-medium text-slate-400">Frases por diapositiva</p>
                        <div className="flex gap-2">
                          {[
                            {n:2, desc:"Muy grande"},
                            {n:3, desc:"Recomendado"},
                            {n:4, desc:"Más contenido"},
                          ].map(({n, desc}) => (
                            <button key={n}
                              onClick={() => { setSplitLineas(n); localStorage.setItem("himno-split-lines", String(n)); }}
                              className={`flex-1 flex flex-col items-center py-3 rounded-xl border transition-all ${
                                splitLineas === n
                                  ? "bg-violet-500/15 border-violet-400/50 text-violet-200"
                                  : "bg-slate-800/60 border-white/7 text-slate-500 hover:border-white/20 hover:text-slate-300"
                              }`}
                            >
                              <span className="text-2xl font-bold mb-0.5">{n}</span>
                              <span className="text-[10px]">{desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Tamaño del logo en proyector */}
                <Card icon={<IoImage />} title="Tamaño del Logo en Pantalla" accent="orange">
                  <div className="flex flex-wrap gap-2">
                    {LOGO_SIZES.map(({valor, etiqueta}) => (
                      <button key={valor} onClick={() => {
                        const nueva = {...configuracion, logoSize: valor};
                        setConfiguracion(nueva);
                        guardarSilencioso(nueva);
                      }}
                        className={`flex-1 min-w-[4rem] py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                          configuracion.logoSize === valor
                            ? "bg-orange-500/15 border-orange-400/50 text-orange-200"
                            : "bg-slate-800/60 border-white/7 text-slate-500 hover:border-white/20 hover:text-slate-300"
                        }`}
                      >
                        {etiqueta}
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Modal: Selector de fondos ──────────────────────────────────────── */}
      {mostrarSelectorFondo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/8 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6 shrink-0">
              <div className="flex items-center gap-2.5">
                <IoImage className="text-purple-400" />
                <span className="font-semibold text-white">Fondos del Proyector</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={async () => {
                  try {
                    const r = await window.electron.subirFondo();
                    if (r) { await cargarFondos(); mostrarMensaje("Fondo subido", "success"); }
                  } catch { mostrarMensaje("Error al subir", "error"); }
                }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-500/30 rounded-xl text-sm text-white font-medium transition-colors">
                  <FaUpload className="text-xs" /> Subir Fondo
                </button>
                <button onClick={() => setMostrarSelectorFondo(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors">
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              {fondos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <IoImage className="text-5xl text-slate-700" />
                  <div className="text-center">
                    <p className="text-slate-400 font-medium mb-1">Sin fondos</p>
                    <p className="text-slate-600 text-sm">Sube imágenes o videos para usar como fondo</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                  {fondos.map(fondo => (
                    <div key={fondo.id} onClick={() => seleccionarFondo(fondo)}
                      className={`group relative bg-slate-800/60 rounded-2xl overflow-hidden border cursor-pointer transition-all hover:scale-[1.03] hover:shadow-xl ${
                        !!fondo.activo
                          ? "border-emerald-400/60 shadow-emerald-900/30 shadow-lg"
                          : "border-white/6 hover:border-white/20"
                      }`}
                    >
                      <div className="aspect-video bg-slate-900 relative overflow-hidden">
                        {fondo.tipo === "video" ? (
                          <video src={fondo.url} className="w-full h-full object-cover" muted
                            onMouseEnter={e => e.target.play()} onMouseLeave={e => e.target.pause()} />
                        ) : (
                          <img src={fondo.url} alt={fondo.nombre} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1 p-2">
                          <button onClick={e => { e.stopPropagation(); setPrevisualizandoFondo(fondo); }}
                            className="p-1.5 bg-blue-500/80 hover:bg-blue-500 rounded-lg text-white transition-colors">
                            <IoEye className="text-xs" />
                          </button>
                          {!fondo.activo && (
                            <button onClick={e => { e.stopPropagation(); eliminarFondo(fondo.id); }}
                              className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg text-white transition-colors">
                              <IoTrash className="text-xs" />
                            </button>
                          )}
                        </div>
                        {!!fondo.activo && (
                          <div className="absolute top-2 left-2 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold flex items-center gap-1">
                            <IoCheckmark className="text-[8px]" /> ACTIVO
                          </div>
                        )}
                      </div>
                      <div className="px-2.5 py-2 flex items-center gap-1.5">
                        {fondo.tipo === "video"
                          ? <FaVideo className="text-red-400 text-[9px] shrink-0" />
                          : <IoImage className="text-blue-400 text-[9px] shrink-0" />}
                        <p className="text-xs text-slate-300 truncate">{fondo.nombre}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Preview de fondo ────────────────────────────────────────── */}
      {previsualizandoFondo && (
        <div className="fixed inset-0 bg-black/92 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full">
            <button onClick={() => setPrevisualizandoFondo(null)}
              className="absolute -top-3 -right-3 z-10 bg-slate-800 hover:bg-slate-700 border border-white/10 text-white p-2 rounded-full transition-colors shadow-lg">
              <FaTimes className="text-sm" />
            </button>
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/6">
              {previsualizandoFondo.tipo === "video" ? (
                <video src={previsualizandoFondo.url} className="w-full max-h-[70vh] object-contain" controls autoPlay />
              ) : (
                <img src={previsualizandoFondo.url} alt={previsualizandoFondo.nombre} className="w-full max-h-[70vh] object-contain" />
              )}
              <div className="px-4 py-3 flex items-center justify-between border-t border-white/5">
                <div className="flex items-center gap-2">
                  {previsualizandoFondo.tipo === "video"
                    ? <FaVideo className="text-red-400 text-xs" />
                    : <IoImage className="text-blue-400 text-xs" />}
                  <p className="text-sm text-white font-medium">{previsualizandoFondo.nombre}</p>
                </div>
                <button onClick={() => { seleccionarFondo(previsualizandoFondo); setPrevisualizandoFondo(null); }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 rounded-xl text-sm text-white font-semibold transition-colors">
                  Usar este fondo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Restaurar ──────────────────────────────────────────────── */}
      {mostrarModalRestaurar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/8 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <IoWarning className="text-amber-400 text-lg" />
                <span className="font-semibold text-white">Restaurar configuración</span>
              </div>
              <button onClick={() => setMostrarModalRestaurar(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <IoClose />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                Se restablecerán todos los valores al estado por defecto. Esta acción no se puede deshacer.
              </p>
              <ul className="space-y-2 text-xs text-slate-500 mb-5">
                {["Nombre de iglesia y eslogan se vaciarán","Logo volverá al icono de la aplicación","Colores y fuentes serán los predeterminados","Fondos personalizados no serán eliminados"].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <IoInformationCircle className="text-slate-600 shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2.5">
                <button onClick={() => setMostrarModalRestaurar(false)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/8 border border-white/8 text-slate-300 text-sm rounded-xl font-medium transition-colors">
                  Cancelar
                </button>
                <button onClick={restaurarDefecto}
                  className="flex-1 py-2.5 bg-amber-600/90 hover:bg-amber-600 border border-amber-500/30 text-white text-sm rounded-xl font-semibold transition-colors">
                  Restaurar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracion;
