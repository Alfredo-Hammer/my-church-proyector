import {useState, useEffect, useRef} from "react";
import {useNavigate} from "react-router-dom";
import {
  IoSave, IoRefresh, IoImage, IoClose, IoCheckmark,
  IoWarning, IoInformationCircle, IoEye, IoCloudDone,
} from "react-icons/io5";
import {FaVideo, FaChurch, FaPalette, FaFont, FaDatabase} from "react-icons/fa";
import {CLASS_PX} from "../utils/pantallaScale";
import {componenteFondoAnimado} from "../components/fondosAnimados";

const BASE_URL = "http://localhost:3001";

const FONT_OPTIONS = [
  {valor: "text-5xl",  etiqueta: "M",   px: "48px"},
  {valor: "text-6xl",  etiqueta: "L",   px: "60px"},
  {valor: "text-7xl",  etiqueta: "XL",  px: "72px"},
  {valor: "text-8xl",  etiqueta: "2XL", px: "96px"},
  {valor: "text-9xl",  etiqueta: "3XL", px: "128px"},
  {valor: "text-10xl", etiqueta: "4XL", px: "160px"},
  {valor: "text-11xl", etiqueta: "5XL", px: "200px"},
];

const LOGO_SIZES = [
  {valor: "size-56",          etiqueta: "S"},
  {valor: "size-64",          etiqueta: "M"},
  {valor: "size-80",          etiqueta: "L"},
  {valor: "size-96",          etiqueta: "XL"},
  {valor: "w-[28rem] h-[28rem]", etiqueta: "2XL"},
];

const COLOR_PRESETS = [
  "#ffffff","#f8fafc","#cbd5e1","#fbbf24","#f97316",
  "#ef4444","#22c55e","#14b8a6","#3b82f6","#8b5cf6","#ec4899","#6366f1",
];

const CONFIG_DEFAULTS = {
  nombreIglesia: "", eslogan: "",
  logo: "/images/icon-256.png", logoSize: "size-80",
  colorPrimario: "#ffffff", colorSecundario: "#d1d5db",
  fondoActivo: "", tipoFondo: "imagen",
  fontSize: {titulo: "text-8xl", parrafo: "text-10xl", eslogan: "text-5xl"},
  videosFondo: [], intervaloCambioVideo: 120,
  mostrarLogo: true, mostrarNombreIglesia: true, mostrarEslogan: true,
  // Modo lejos: dividir versículos largos en partes si la letra quedaría
  // por debajo de este % del alto de pantalla (ver Proyector.jsx)
  modoLejosActivo: true, modoLejosMinimo: 10,
};

const MODO_LEJOS_OPCIONES = [
  {valor: 8,  etiqueta: "Chica",    desc: "Divide poco"},
  {valor: 10, etiqueta: "Normal",   desc: "Recomendado"},
  {valor: 12, etiqueta: "Grande",   desc: "Salón grande"},
  {valor: 15, etiqueta: "Muy grande", desc: "Divide más"},
];

const aBool = (v, def) => (v === undefined || v === null || v === "" ? def : v !== false && v !== "false");

const TABS = [
  {id: "identidad",  label: "Identidad",  desc: "Nombre, logo e iglesia", icon: <FaChurch />},
  {id: "apariencia", label: "Apariencia", desc: "Colores y fondo",         icon: <FaPalette />},
  {id: "proyector",  label: "Proyector",  desc: "Texto y pantalla",        icon: <FaFont />},
  {id: "datos",      label: "Datos",      desc: "Respaldo y restauración", icon: <FaDatabase />},
];

// ── Paleta de acentos ─────────────────────────────────────────────────────────
const ACCENT = {
  indigo:  {grad: "from-indigo-500 to-blue-500",   icon: "bg-indigo-500/12 text-indigo-400"},
  orange:  {grad: "from-orange-500 to-amber-500",  icon: "bg-orange-500/12 text-orange-400"},
  purple:  {grad: "from-purple-500 to-violet-500", icon: "bg-purple-500/12 text-purple-400"},
  cyan:    {grad: "from-cyan-400 to-sky-500",      icon: "bg-cyan-500/12 text-cyan-400"},
  pink:    {grad: "from-pink-500 to-rose-500",     icon: "bg-pink-500/12 text-pink-400"},
  emerald: {grad: "from-emerald-500 to-teal-500",  icon: "bg-emerald-500/12 text-emerald-400"},
};

// ── Componentes UI ────────────────────────────────────────────────────────────

function Section({icon, title, subtitle, accent = "indigo", children, className = ""}) {
  const a = ACCENT[accent] || ACCENT.indigo;
  return (
    <div className={`bg-slate-900/50 border border-white/[0.07] rounded-2xl overflow-hidden ${className}`}>
      <div className={`h-px bg-gradient-to-r ${a.grad}`} />
      <div className="p-5 md:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className={`p-2.5 rounded-xl text-base shrink-0 ${a.icon}`}>{icon}</div>
          <div>
            <h3 className="text-sm font-semibold text-white leading-tight">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toggle({checked, onChange}) {
  return (
    <label className="relative inline-flex cursor-pointer shrink-0">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-10 h-[22px] bg-slate-700 rounded-full transition-colors peer peer-checked:bg-indigo-500
        after:content-[''] after:absolute after:top-[3px] after:left-[3px]
        after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
        peer-checked:after:translate-x-[18px]" />
    </label>
  );
}

function FontPicker({value, onChange, max = 7}) {
  const opts = FONT_OPTIONS.slice(0, max);
  return (
    <div className="flex gap-1.5">
      {opts.map((op) => (
        <button
          type="button"
          key={op.valor}
          onClick={() => onChange(op.valor)}
          title={op.px}
          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
            value === op.valor
              ? "bg-indigo-500/18 border-indigo-400/50 text-indigo-200"
              : "bg-slate-800/50 border-white/6 text-slate-500 hover:border-white/18 hover:text-slate-300"
          }`}
        >
          {op.etiqueta}
        </button>
      ))}
    </div>
  );
}

// Clave propia de Pixabay (opcional). Si está vacía, Gestión de Fondos usa la que
// trae la app al compilar. Se guarda aparte del resto de la configuración.
function ClavePixabay() {
  const [clave, setClave] = useState("");
  const [guardada, setGuardada] = useState("");
  const [estado, setEstado] = useState(null); // {tipo: "ok"|"error"|"info", texto}
  const [probando, setProbando] = useState(false);

  useEffect(() => {
    Promise.resolve(window.electron?.obtenerConfiguracionPorClave?.("pixabayApiKey"))
      .then((v) => {
        setClave(v || "");
        setGuardada(v || "");
      })
      .catch(() => {});
  }, []);

  const guardar = async (valor) => {
    const limpia = valor.trim();
    setProbando(true);
    setEstado(null);
    try {
      if (limpia) {
        const r = await fetch(
          `https://pixabay.com/api/?key=${encodeURIComponent(limpia)}&q=church&per_page=3`,
        );
        if (!r.ok) {
          setEstado({tipo: "error", texto: "Pixabay rechazó la clave. Revisa que esté bien copiada."});
          return;
        }
      }
      await window.electron?.actualizarConfiguracionPorClave?.("pixabayApiKey", limpia);
      setClave(limpia);
      setGuardada(limpia);
      setEstado(
        limpia
          ? {tipo: "ok", texto: "Clave verificada y guardada."}
          : {tipo: "info", texto: "Se usará la clave que trae la app."},
      );
    } catch {
      setEstado({tipo: "error", texto: "No se pudo verificar. Revisa tu conexión a internet."});
    } finally {
      setProbando(false);
    }
  };

  const colorEstado = {ok: "text-emerald-400", error: "text-red-400", info: "text-slate-400"};

  return (
    <Section icon={<IoImage />} title="Clave de Pixabay (opcional)" subtitle="Para buscar imágenes y videos gratuitos en Gestión de Fondos" accent="cyan" className="xl:col-span-2">
      <p className="text-xs text-slate-400 mb-3">
        La app ya trae una clave. Si las búsquedas fallan o quieres usar la tuya, crea una cuenta gratis en Pixabay,
        copia tu clave de la página de la API y pégala aquí.{" "}
        <button
          type="button"
          onClick={() => window.electron?.abrirEnlaceExterno?.("https://pixabay.com/api/docs/")}
          className="text-indigo-400 hover:text-indigo-300 underline"
        >
          Obtener mi clave
        </button>
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          placeholder="Pega aquí tu clave de Pixabay"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 min-w-[16rem] h-9 px-3 rounded-lg bg-slate-800/60 border border-white/[0.08] text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400/60"
        />
        <button
          type="button"
          disabled={probando || clave.trim() === guardada}
          onClick={() => guardar(clave)}
          className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-xs font-semibold text-white transition-colors"
        >
          {probando ? "Verificando…" : "Guardar"}
        </button>
        {guardada && (
          <button
            type="button"
            disabled={probando}
            onClick={() => guardar("")}
            className="h-9 px-3 rounded-lg border border-white/[0.08] text-xs font-semibold text-slate-400 hover:text-red-300 hover:border-red-400/40 transition-colors"
          >
            Quitar
          </button>
        )}
      </div>
      {estado && <p className={`text-xs mt-2 ${colorEstado[estado.tipo]}`}>{estado.texto}</p>}
    </Section>
  );
}

function FieldLabel({children}) {
  return <p className="text-xs font-medium text-slate-400 mb-1.5">{children}</p>;
}

function ColorField({label, value, onChange}) {
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  const commit = (v) => { if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v); };
  return (
    <div className="space-y-3">
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="flex items-center gap-3">
        <input
          type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="size-10 rounded-xl border border-white/10 cursor-pointer bg-transparent p-0.5 block shrink-0"
        />
        <input
          type="text" value={hex} maxLength={7} placeholder="#ffffff"
          onChange={(e) => { setHex(e.target.value); commit(e.target.value); }}
          onBlur={() => setHex(value)}
          className={inputCls + " font-mono"}
        />
        <div className="size-10 rounded-xl border border-white/10 shrink-0" style={{backgroundColor: value}} />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {COLOR_PRESETS.map((c) => (
          <button
            type="button" key={c} onClick={() => onChange(c)} title={c}
            className={`size-6 rounded-lg border-2 transition-all hover:scale-110 ${
              value === c ? "border-white/70 scale-110 shadow" : "border-transparent hover:border-white/25"
            }`}
            style={{backgroundColor: c}}
          />
        ))}
      </div>
    </div>
  );
}

const inputCls = "w-full px-3.5 py-2.5 bg-slate-800/60 border border-white/8 hover:border-white/15 focus:border-indigo-500/50 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none transition-colors";

// ── Componente principal ──────────────────────────────────────────────────────
const Configuracion = () => {
  const [tab, setTab]                           = useState("identidad");
  const [configuracion, setConfiguracion]       = useState(CONFIG_DEFAULTS);
  const [savedConfig, setSavedConfig]           = useState(CONFIG_DEFAULTS);
  const [fondoActual, setFondoActual]           = useState(null);
  const [mostrarModalRestaurar, setMostrarModalRestaurar] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl]     = useState(null);
  const [subiendoLogo, setSubiendoLogo]         = useState(false);
  // Todo se guarda solo: idle | guardando | guardado | error
  const [estadoGuardado, setEstadoGuardado]     = useState("idle");
  const [cargando, setCargando]                 = useState(true);
  const navigate = useNavigate();
  // Siempre la última config: el guardado diferido de los campos de texto
  // no debe pisar un switch que se tocó mientras tanto.
  const configRef = useRef(configuracion);
  configRef.current = configuracion;
  const timerGuardadoRef = useRef(null);
  const [toast, setToast]                       = useState(null);
  const [dragLogo, setDragLogo]                 = useState(false);
  const logoInputRef = useRef(null);

  // Respaldo y restauración de datos
  const [incluirMultimediaRespaldo, setIncluirMultimediaRespaldo] = useState(false);
  const [exportandoRespaldo, setExportandoRespaldo]     = useState(false);
  const [restaurandoRespaldo, setRestaurandoRespaldo]   = useState(false);
  const [mostrarModalRestaurarRespaldo, setMostrarModalRestaurarRespaldo] = useState(false);

  // ── Carga ─────────────────────────────────────────────────────────────────
  const cargarFondos = async () => {
    try {
      const data = await window.electron.obtenerFondos();
      setFondoActual((data || []).find((f) => !!f.activo) || null);
    } catch { mostrarToast("Error al cargar los fondos", "error"); }
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
          logo: config.logoUrl && config.logoUrl !== "/logo.jpg" && config.logoUrl !== ""
            ? config.logoUrl : "/images/icon-256.png",
          fontSize: {
            titulo:   config.fontSizeTitulo  || config.fontSize?.titulo   || CONFIG_DEFAULTS.fontSize.titulo,
            parrafo:  config.fontSizeParrafo || config.fontSize?.parrafo  || CONFIG_DEFAULTS.fontSize.parrafo,
            eslogan: (() => {
              const v = config.fontSizeEslogan || config.fontSize?.eslogan || CONFIG_DEFAULTS.fontSize.eslogan;
              return v === "text-3xl" || v === "text-4xl" ? "text-5xl" : v;
            })(),
          },
          modoLejosActivo: aBool(config.modoLejosActivo, true),
          modoLejosMinimo: Number(config.modoLejosMinimo) || CONFIG_DEFAULTS.modoLejosMinimo,
        };
        setConfiguracion(merged);
        setSavedConfig(merged);
      }
    } catch (err) { mostrarToast(`Error al cargar: ${err.message}`, "error"); }
    finally { setCargando(false); }
  };

  useEffect(() => {
    cargarConfiguracion();
    cargarFondos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const set = (campo, valor) => setConfiguracion((prev) => ({...prev, [campo]: valor}));

  const mostrarToast = (texto, tipo) => {
    setToast({texto, tipo});
    setTimeout(() => setToast(null), 4000);
  };

  const procesarArchivoLogo = (archivo) => {
    if (!archivo?.type?.startsWith("image/")) { mostrarToast("Archivo no válido", "error"); return; }
    const r = new FileReader();
    r.onload = (ev) => setLogoPreviewUrl(ev.target.result);
    r.readAsDataURL(archivo);
    subirLogo(archivo);
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const guardarConfiguracionCompleta = async (cfg = configuracion) => {
    if (!window.electron?.guardarConfiguracion) throw new Error("No disponible");
    const flat = {
      nombreIglesia: cfg.nombreIglesia || "", eslogan: cfg.eslogan || "",
      logoUrl: cfg.logo || "", logoSize: cfg.logoSize || "size-80",
      colorPrimario: cfg.colorPrimario || "#ffffff",
      colorSecundario: cfg.colorSecundario || "#d1d5db",
      fontSizeTitulo:  cfg.fontSize?.titulo  || "text-8xl",
      fontSizeParrafo: cfg.fontSize?.parrafo || "text-10xl",
      fontSizeEslogan: cfg.fontSize?.eslogan || "text-5xl",
      mostrarLogo:            String(cfg.mostrarLogo            ?? true),
      mostrarNombreIglesia:   String(cfg.mostrarNombreIglesia   ?? true),
      mostrarEslogan:         String(cfg.mostrarEslogan         ?? true),
      modoLejosActivo:        String(cfg.modoLejosActivo        ?? true),
      modoLejosMinimo:        String(Number(cfg.modoLejosMinimo) || 10),
    };
    const ok = await window.electron.guardarConfiguracion(flat);
    if (!ok) throw new Error("No se pudo guardar");
    return ok;
  };

  const guardarSilencioso = async (nuevaCfg) => {
    setEstadoGuardado("guardando");
    try {
      await guardarConfiguracionCompleta(nuevaCfg);
      setSavedConfig(nuevaCfg);
      setEstadoGuardado("guardado");
    } catch {
      setEstadoGuardado("error");
    }
  };

  // Nombre y eslogan: se guardan solos 700 ms después de dejar de escribir
  useEffect(() => {
    if (cargando) return;
    if (configuracion.nombreIglesia === savedConfig.nombreIglesia &&
        configuracion.eslogan === savedConfig.eslogan) return;
    clearTimeout(timerGuardadoRef.current);
    timerGuardadoRef.current = setTimeout(() => guardarSilencioso(configRef.current), 700);
    return () => clearTimeout(timerGuardadoRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configuracion.nombreIglesia, configuracion.eslogan, cargando]);

  // El "Guardado ✓" se apaga solo
  useEffect(() => {
    if (estadoGuardado !== "guardado") return;
    const t = setTimeout(() => setEstadoGuardado("idle"), 2500);
    return () => clearTimeout(t);
  }, [estadoGuardado]);

  const subirLogo = async (archivo) => {
    setSubiendoLogo(true);
    try {
      const buf  = await archivo.arrayBuffer();
      const path = await window.electron.guardarLogo(new Uint8Array(buf));
      if (!path) throw new Error("formato");
      const nueva = {...configRef.current, logo: path};
      setConfiguracion(nueva);
      await guardarSilencioso(nueva);
    } catch {
      // formato no reconocido, archivo demasiado grande, etc.
      mostrarToast("No se pudo usar esa imagen como logo (probá con otra PNG o JPG)", "error");
    } finally {
      setLogoPreviewUrl(null);
      setSubiendoLogo(false);
    }
  };

  const restaurarDefecto = async () => {
    try {
      setMostrarModalRestaurar(false);
      const ok = await window.electron?.restaurarConfiguracionDefecto?.();
      if (!ok) throw new Error("No se pudo restaurar");
      setConfiguracion(CONFIG_DEFAULTS); setSavedConfig(CONFIG_DEFAULTS);
      setLogoPreviewUrl(null);
      setFondoActual(null);
      await cargarConfiguracion(); await cargarFondos();
      mostrarToast("Configuración restaurada", "success");
    } catch (err) { mostrarToast(`Error: ${err.message}`, "error"); }
  };

  const handleExportarRespaldo = async () => {
    setExportandoRespaldo(true);
    try {
      const resultado = await window.electron?.exportarRespaldo?.({incluirMultimedia: incluirMultimediaRespaldo});
      if (resultado?.cancelado) return;
      if (!resultado?.ok) throw new Error(resultado?.error || "No se pudo exportar el respaldo");
      mostrarToast("Respaldo guardado correctamente", "success");
    } catch (err) {
      mostrarToast(`Error: ${err.message}`, "error");
    } finally {
      setExportandoRespaldo(false);
    }
  };

  const handleRestaurarRespaldo = async () => {
    setMostrarModalRestaurarRespaldo(false);
    setRestaurandoRespaldo(true);
    try {
      const resultado = await window.electron?.restaurarRespaldo?.();
      if (resultado?.cancelado) { setRestaurandoRespaldo(false); return; }
      if (!resultado?.ok) throw new Error(resultado?.error || "No se pudo restaurar el respaldo");
      // Si tuvo éxito, main.js recarga esta misma ventana (y la del
      // proyector) para que tomen los datos restaurados — no hace falta
      // mostrar un toast, la propia recarga es la confirmación visual.
    } catch (err) {
      mostrarToast(`Error: ${err.message}`, "error");
      setRestaurandoRespaldo(false);
    }
  };

  const logoSrc = logoPreviewUrl ||
    (configuracion.logo?.startsWith("/uploads")
      ? `${BASE_URL}${configuracion.logo}`
      : configuracion.logo || "/images/icon-256.png");

  // ── Loading ───────────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="bg-[#080c14] h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full size-8 border-b-2 border-indigo-400" />
          <p className="text-slate-500 text-sm">Cargando configuración…</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#080c14] h-full flex overflow-hidden text-slate-100">

      {/* ── Sidebar — visible md+ ──────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-52 lg:w-60 shrink-0 bg-slate-950/80 border-r border-white/[0.06]">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">GloryView</p>
          <h1 className="text-base font-bold text-white">Configuración</h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {TABS.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all group ${
                tab === t.id
                  ? "bg-indigo-600/12 border border-indigo-500/20"
                  : "border border-transparent hover:bg-white/[0.04]"
              }`}
            >
              <span className={`text-sm shrink-0 transition-colors ${
                tab === t.id ? "text-indigo-400" : "text-slate-600 group-hover:text-slate-400"
              }`}>{t.icon}</span>
              <div className="min-w-0">
                <p className={`text-xs font-semibold leading-tight ${tab === t.id ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`}>
                  {t.label}
                </p>
                <p className="text-[10px] text-slate-600 leading-tight mt-0.5">{t.desc}</p>
              </div>
              {tab === t.id && <div className="ml-auto w-1 h-5 rounded-full bg-indigo-400/70 shrink-0" />}
            </button>
          ))}
        </nav>

        {/* Acciones */}
        <div className="p-3 border-t border-white/[0.06] space-y-2">
          <div className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-medium transition-colors ${
            estadoGuardado === "error" ? "text-red-400 bg-red-500/10"
            : estadoGuardado === "guardando" ? "text-slate-400"
            : estadoGuardado === "guardado" ? "text-emerald-400" : "text-slate-600"
          }`}>
            {estadoGuardado === "error" ? <><IoWarning /> No se pudo guardar</>
              : estadoGuardado === "guardando" ? <><IoRefresh className="animate-spin" /> Guardando…</>
              : estadoGuardado === "guardado" ? <><IoCheckmark /> Guardado</>
              : <><IoCloudDone /> Los cambios se guardan solos</>}
          </div>
          <button
            type="button"
            onClick={() => setMostrarModalRestaurar(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-slate-600 hover:text-amber-400 text-xs rounded-xl hover:bg-white/[0.04] transition-colors"
          >
            <IoRefresh className="text-xs" /> Restaurar por defecto
          </button>
        </div>
      </aside>

      {/* ── Layout derecho: mobile header + main ─────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* ── Mobile: header con tabs + acciones ──────────────────────────── */}
        <div className="md:hidden shrink-0 bg-slate-900/95 backdrop-blur border-b border-white/[0.06] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <nav className="flex gap-0.5 bg-slate-800/60 border border-white/8 rounded-xl p-1 flex-1">
              {TABS.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    tab === t.id
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="text-[10px]">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </nav>
            <span className={`shrink-0 text-xs ${estadoGuardado === "error" ? "text-red-400" : estadoGuardado === "guardado" ? "text-emerald-400" : "text-slate-600"}`}>
              {estadoGuardado === "error" ? <IoWarning /> : estadoGuardado === "guardando" ? <IoRefresh className="animate-spin" /> : <IoCheckmark />}
            </span>
          </div>
        </div>

        {/* ── Contenido principal ──────────────────────────────────────────── */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">

            {/* Page title — solo en desktop donde el sidebar da contexto */}
            <div className="hidden md:flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {TABS.find((t) => t.id === tab)?.label}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {TABS.find((t) => t.id === tab)?.desc}
                </p>
              </div>
            </div>

            {/* ════════ TAB IDENTIDAD ════════ */}
            {tab === "identidad" && (
              <div className="space-y-4">
                {/* Fila 1: Logo + Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Logo */}
                  <Section icon={<IoImage />} title="Logo de la Iglesia" subtitle="Imagen que aparece en pantalla de inicio" accent="orange">
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragLogo(true); }}
                      onDragLeave={() => setDragLogo(false)}
                      onDrop={(e) => { e.preventDefault(); setDragLogo(false); const f = e.dataTransfer.files[0]; if (f) procesarArchivoLogo(f); }}
                      onClick={() => logoInputRef.current?.click()}
                      onKeyDown={(e) => e.key === "Enter" && logoInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      aria-label="Subir logo"
                      className={`relative flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all py-6 mb-4 ${
                        dragLogo ? "border-orange-400/60 bg-orange-500/6" : "border-white/8 hover:border-white/16 hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="size-20 rounded-2xl bg-slate-800/80 border border-white/8 overflow-hidden p-1.5">
                        <img src={logoSrc} alt="Logo"
                          className="w-full h-full object-contain rounded-xl"
                          onError={(e) => { e.target.src = "/images/icon-256.png"; }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-slate-300">
                          {subiendoLogo ? "Guardando logo…" : "Arrastra o clic para cambiar"}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-0.5">PNG, JPG · 500×500 px recomendado</p>
                      </div>
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { if (e.target.files[0]) procesarArchivoLogo(e.target.files[0]); }} />

                    <div className="space-y-0">
                      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-3">
                        Visibilidad en pantalla
                      </p>
                      {[
                        {campo: "mostrarLogo",           label: "Mostrar logo"},
                        {campo: "mostrarNombreIglesia",  label: "Mostrar nombre"},
                        {campo: "mostrarEslogan",        label: "Mostrar eslogan"},
                      ].map(({campo, label}) => (
                        <div key={campo} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                          <span className="text-sm text-slate-300">{label}</span>
                          <Toggle
                            checked={!!configuracion[campo]}
                            onChange={(v) => {
                              const nueva = {...configuracion, [campo]: v};
                              setConfiguracion(nueva);
                              guardarSilencioso(nueva);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </Section>

                  {/* Info */}
                  <Section icon={<FaChurch />} title="Información de la Iglesia" subtitle="Datos que aparecen en pantalla de inicio" accent="indigo">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="cfg-nombre" className="block text-xs font-medium text-slate-400 mb-1.5">
                          Nombre de la Iglesia
                        </label>
                        <input id="cfg-nombre" type="text" value={configuracion.nombreIglesia}
                          onChange={(e) => set("nombreIglesia", e.target.value)}
                          className={inputCls} placeholder="Ej: GloryView Church" />
                      </div>
                      <div>
                        <label htmlFor="cfg-eslogan" className="block text-xs font-medium text-slate-400 mb-1.5">
                          Eslogan / Bienvenida
                        </label>
                        <input id="cfg-eslogan" type="text" value={configuracion.eslogan}
                          onChange={(e) => set("eslogan", e.target.value)}
                          className={inputCls} placeholder="Ej: Bienvenidos a la Casa de Dios" />
                      </div>
                    </div>
                  </Section>
                </div>

                {/* Vista previa */}
                <Section icon={<IoEye />} title="Vista Previa del Proyector" subtitle="Pantalla de inicio del proyector" accent="cyan">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
                    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-white/[0.06]"
                      style={{paddingBottom: "min(56.25%, 200px)"}}>
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-6">
                        {configuracion.mostrarLogo && (
                          <img src={logoSrc} alt="Logo" className="size-14 object-contain"
                            onError={(e) => { e.target.src = "/images/icon-256.png"; }} />
                        )}
                        {configuracion.mostrarNombreIglesia && configuracion.nombreIglesia && (
                          <p className="text-xl font-bold text-center leading-tight" style={{color: configuracion.colorPrimario}}>
                            {configuracion.nombreIglesia}
                          </p>
                        )}
                        {configuracion.mostrarEslogan && configuracion.eslogan && (
                          <p className="text-xs text-center opacity-75" style={{color: configuracion.colorSecundario}}>
                            {configuracion.eslogan}
                          </p>
                        )}
                        {!configuracion.nombreIglesia && !configuracion.eslogan && !configuracion.mostrarLogo && (
                          <p className="text-slate-700 text-sm">Vista previa vacía</p>
                        )}
                      </div>
                      <span className="absolute bottom-2 right-3 text-[9px] text-slate-700 font-mono select-none">16:9</span>
                    </div>
                    <div className="flex md:flex-col gap-2 shrink-0">
                      <div className="flex items-center gap-2.5 bg-slate-800/50 rounded-xl px-3.5 py-2.5 border border-white/[0.05]">
                        <div className="size-3.5 rounded-full shrink-0 border border-white/10" style={{backgroundColor: configuracion.colorPrimario}} />
                        <div>
                          <p className="text-[10px] text-slate-500 leading-none">Primario</p>
                          <p className="text-xs font-mono text-slate-300 mt-0.5">{configuracion.colorPrimario}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 bg-slate-800/50 rounded-xl px-3.5 py-2.5 border border-white/[0.05]">
                        <div className="size-3.5 rounded-full shrink-0 border border-white/10" style={{backgroundColor: configuracion.colorSecundario}} />
                        <div>
                          <p className="text-[10px] text-slate-500 leading-none">Secundario</p>
                          <p className="text-xs font-mono text-slate-300 mt-0.5">{configuracion.colorSecundario}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Section>
              </div>
            )}

            {/* ════════ TAB APARIENCIA ════════ */}
            {tab === "apariencia" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                {/* Colores */}
                <Section icon={<FaPalette />} title="Colores del Tema" subtitle="Se aplican en tiempo real al proyector" accent="pink">
                  <div className="space-y-6">
                    <ColorField
                      label="Color Primario — Títulos e himno"
                      value={configuracion.colorPrimario}
                      onChange={(v) => {
                        const nueva = {...configuracion, colorPrimario: v};
                        setConfiguracion(nueva);
                        guardarSilencioso(nueva);
                      }}
                    />
                    <div className="border-t border-white/[0.05] pt-6">
                      <ColorField
                        label="Color Secundario — Eslogan y texto de párrafos"
                        value={configuracion.colorSecundario}
                        onChange={(v) => {
                          const nueva = {...configuracion, colorSecundario: v};
                          setConfiguracion(nueva);
                          guardarSilencioso(nueva);
                        }}
                      />
                    </div>
                  </div>
                </Section>

                {/* Fondo: se administra en Gestión de Fondos (antes estaba duplicado acá) */}
                <Section icon={<IoImage />} title="Fondo del Proyector" subtitle="Imagen o video que se muestra detrás del texto" accent="purple">
                  <div className="flex gap-4 items-center">
                    <div className="relative shrink-0 w-48 aspect-video rounded-xl overflow-hidden bg-slate-950 border border-white/[0.06]">
                      {fondoActual ? (
                        fondoActual.tipo === "animado"
                          ? (() => {
                              const FondoAnimado = componenteFondoAnimado(fondoActual.url);
                              return FondoAnimado ? <FondoAnimado /> : null;
                            })()
                          : fondoActual.tipo === "video"
                          ? <video src={fondoActual.url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                          : <img src={fondoActual.url} alt={fondoActual.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FaVideo className="text-2xl text-slate-700" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Fondo activo</p>
                      <p className="text-sm text-slate-200 truncate mt-0.5">{fondoActual?.nombre || "Video por defecto"}</p>
                      <button
                        type="button"
                        onClick={() => navigate("/gestion-fondos")}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                      >
                        <IoImage /> Cambiar fondo
                      </button>
                    </div>
                  </div>
                </Section>

                <ClavePixabay />
              </div>
            )}

            {/* ════════ TAB PROYECTOR ════════ */}
            {tab === "proyector" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                {/* Tamaños de fuente */}
                <Section icon={<FaFont />} title="Tamaño de Texto" subtitle="El texto se reduce si no cabe; este es el tamaño máximo" accent="cyan">
                  <div className="space-y-5">
                    {[
                      {tipo: "titulo",  label: "Título del Himno",          max: 9},
                      {tipo: "parrafo", label: "Letra del Himno / Versículo", max: 7},
                      {tipo: "eslogan", label: "Eslogan en Pantalla de Inicio", max: 4},
                    ].map(({tipo, label, max}) => {
                      const found = FONT_OPTIONS.find((o) => o.valor === configuracion.fontSize[tipo]);
                      return (
                        <div key={tipo}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-slate-300">{label}</p>
                            <span className="text-xs font-mono text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded-lg">
                              {found?.px || "—"}
                            </span>
                          </div>
                          <FontPicker
                            value={configuracion.fontSize[tipo]}
                            onChange={(v) => {
                              const nueva = {...configuracion, fontSize: {...configuracion.fontSize, [tipo]: v}};
                              setConfiguracion(nueva);
                              guardarSilencioso(nueva);
                            }}
                            max={max}
                          />
                        </div>
                      );
                    })}

                    {/* Preview a escala */}
                    <div className="border-t border-white/[0.05] pt-5">
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                          Vista previa (escala 1:5)
                        </p>
                        <span className="text-[10px] text-slate-600 font-mono">1920×1080</span>
                      </div>
                      <div className="relative w-full rounded-xl overflow-hidden bg-slate-950 border border-white/[0.06]"
                        style={{paddingBottom: "56.25%"}}>
                        <div className="absolute inset-0 flex items-center justify-center px-[4%] py-[4%]">
                          {(() => {
                            const maxPx = CLASS_PX[configuracion.fontSize.parrafo] || 128;
                            const maxPxPreview = maxPx / 5;
                            const sampleLines = 4;
                            const avail = (window.innerHeight * 0.87) / 5;
                            const needed = sampleLines * maxPxPreview * 1.3;
                            const actualPx = needed <= avail ? maxPxPreview : avail / (sampleLines * 1.3);
                            const wasReduced = actualPx < maxPxPreview - 0.5;
                            return (
                              <>
                                <p className="font-semibold text-center w-full"
                                  style={{color: configuracion.colorSecundario || "#fff", fontSize: `${actualPx}px`, lineHeight: 1.3, whiteSpace: "pre-line"}}>
                                  {"Santo, Santo, Santo\nSeñor Omnipotente\nSiempre el labio mío\nLoores te dará"}
                                </p>
                                {wasReduced && (
                                  <p className="text-[8px] text-amber-400/70 font-mono absolute bottom-1.5 left-2">
                                    auto-reducido a {Math.round(actualPx * 5)}px
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <span className="absolute bottom-1.5 right-2 text-[9px] text-slate-700 font-mono select-none">1:5</span>
                      </div>
                    </div>
                  </div>
                </Section>

                {/* Modo lejos */}
                <Section icon={<FaFont />} title="Modo Lejos" subtitle="Divide versículos largos en partes para que la letra no quede chica" accent="emerald">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-300">Dividir versículos largos</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Se divide solo; se avanza con las flechas o “Siguiente” (primero las partes, luego el próximo versículo).
                        </p>
                      </div>
                      <Toggle
                        checked={!!configuracion.modoLejosActivo}
                        onChange={(v) => {
                          const nueva = {...configuracion, modoLejosActivo: v};
                          setConfiguracion(nueva);
                          guardarSilencioso(nueva);
                        }}
                      />
                    </div>
                    <div className={configuracion.modoLejosActivo ? "" : "opacity-40 pointer-events-none"}>
                      <p className="text-sm font-medium text-slate-300 mb-2">Letra mínima</p>
                      <div className="grid grid-cols-4 gap-2">
                        {MODO_LEJOS_OPCIONES.map(({valor, etiqueta, desc}) => (
                          <button
                            type="button"
                            key={valor}
                            onClick={() => {
                              const nueva = {...configuracion, modoLejosMinimo: valor};
                              setConfiguracion(nueva);
                              guardarSilencioso(nueva);
                            }}
                            className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                              Number(configuracion.modoLejosMinimo) === valor
                                ? "bg-emerald-500/15 border-emerald-400/50 text-emerald-200"
                                : "bg-slate-800/50 border-white/6 text-slate-500 hover:border-white/18 hover:text-slate-300"
                            }`}
                          >
                            {etiqueta}
                            <span className="block text-[10px] font-normal opacity-70 mt-0.5">{desc}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-2">
                        {Number(configuracion.modoLejosMinimo) || 10}% del alto de pantalla ≈ {Math.round(((Number(configuracion.modoLejosMinimo) || 10) / 100) * 1080)}px en 1080p. Solo aplica a versículos de la Biblia.
                      </p>
                    </div>
                  </div>
                </Section>

                {/* Tamaño del logo */}
                <Section icon={<IoImage />} title="Tamaño del Logo en Pantalla" subtitle="Tamaño del logo en la pantalla de inicio" accent="orange">
                  <div className="grid grid-cols-5 gap-2">
                    {LOGO_SIZES.map(({valor, etiqueta}) => (
                      <button
                        type="button"
                        key={valor}
                        onClick={() => {
                          const nueva = {...configuracion, logoSize: valor};
                          setConfiguracion(nueva);
                          guardarSilencioso(nueva);
                        }}
                        className={`py-3 rounded-xl text-xs font-semibold border transition-all ${
                          configuracion.logoSize === valor
                            ? "bg-orange-500/15 border-orange-400/50 text-orange-200"
                            : "bg-slate-800/50 border-white/6 text-slate-500 hover:border-white/18 hover:text-slate-300"
                        }`}
                      >
                        {etiqueta}
                      </button>
                    ))}
                  </div>
                </Section>
              </div>
            )}

            {/* ════════ TAB DATOS ════════ */}
            {tab === "datos" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                {/* Exportar respaldo */}
                <Section icon={<IoSave />} title="Exportar Respaldo" subtitle="Guardá una copia de tus datos en un archivo" accent="emerald">
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Incluye tus himnos agregados, orden de servicio, anuncios, configuración y
                      fondos. Guardalo en un USB o en la nube para no perder nada si esta
                      computadora falla.
                    </p>

                    <label className="flex items-center justify-between py-2.5 px-3 bg-slate-800/40 border border-white/[0.06] rounded-xl cursor-pointer">
                      <span className="text-sm text-slate-300">
                        Incluir archivos multimedia (audio/video)
                        <span className="block text-[11px] text-slate-600 mt-0.5">
                          Puede ocupar mucho espacio y tardar más. Si ya tenés los archivos originales
                          en otro lado, podés dejar esto sin marcar.
                        </span>
                      </span>
                      <Toggle checked={incluirMultimediaRespaldo} onChange={setIncluirMultimediaRespaldo} />
                    </label>

                    <button
                      type="button"
                      onClick={handleExportarRespaldo}
                      disabled={exportandoRespaldo}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600/90 hover:bg-emerald-600 disabled:opacity-50 border border-emerald-500/30 rounded-xl text-sm font-semibold text-white transition-colors"
                    >
                      <IoSave className={exportandoRespaldo ? "animate-pulse" : ""} />
                      {exportandoRespaldo ? "Guardando respaldo…" : "Exportar respaldo"}
                    </button>
                  </div>
                </Section>

                {/* Restaurar respaldo */}
                <Section icon={<IoRefresh />} title="Restaurar Respaldo" subtitle="Recuperá tus datos desde un archivo guardado" accent="orange">
                  <div className="space-y-4">
                    <div className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <IoWarning className="text-amber-400 shrink-0 mt-0.5 text-sm" />
                      <p className="text-xs text-amber-200/90 leading-relaxed">
                        Esto reemplaza todos tus datos actuales con los del respaldo elegido.
                        No se puede deshacer, y la app se recarga automáticamente al terminar.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMostrarModalRestaurarRespaldo(true)}
                      disabled={restaurandoRespaldo}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700/60 rounded-xl text-sm font-semibold text-slate-200 transition-colors"
                    >
                      <IoRefresh className={restaurandoRespaldo ? "animate-spin" : ""} />
                      {restaurandoRespaldo ? "Restaurando…" : "Elegir archivo de respaldo…"}
                    </button>
                  </div>
                </Section>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ── Toast flotante ────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-2xl text-sm font-medium transition-all ${
          toast.tipo === "success"
            ? "bg-emerald-950/95 border-emerald-500/30 text-emerald-300"
            : toast.tipo === "error"
              ? "bg-red-950/95 border-red-500/30 text-red-300"
              : "bg-slate-900/95 border-white/10 text-slate-300"
        }`}>
          {toast.tipo === "success" && <IoCheckmark className="text-emerald-400 shrink-0" />}
          {toast.tipo === "error"   && <IoWarning   className="text-red-400 shrink-0" />}
          {toast.tipo === "info"    && <IoInformationCircle className="text-blue-400 shrink-0" />}
          {toast.texto}
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
              <button type="button" onClick={() => setMostrarModalRestaurar(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <IoClose />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                Se restablecerán todos los valores al estado por defecto. Esta acción no se puede deshacer.
              </p>
              <ul className="space-y-2 text-xs text-slate-500 mb-5">
                {[
                  "Nombre de iglesia y eslogan se vaciarán",
                  "Logo volverá al icono de la aplicación",
                  "Colores y fuentes serán los predeterminados",
                  "Fondos personalizados no serán eliminados",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <IoInformationCircle className="text-slate-600 shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2.5">
                <button type="button" onClick={() => setMostrarModalRestaurar(false)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/8 border border-white/8 text-slate-300 text-sm rounded-xl font-medium transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={restaurarDefecto}
                  className="flex-1 py-2.5 bg-amber-600/90 hover:bg-amber-600 border border-amber-500/30 text-white text-sm rounded-xl font-semibold transition-colors">
                  Restaurar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Restaurar desde archivo de respaldo ─────────────────────── */}
      {mostrarModalRestaurarRespaldo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/8 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <IoWarning className="text-amber-400 text-lg" />
                <span className="font-semibold text-white">Restaurar desde respaldo</span>
              </div>
              <button type="button" onClick={() => setMostrarModalRestaurarRespaldo(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <IoClose />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                Vas a elegir un archivo de respaldo. Al restaurarlo, se reemplazan{" "}
                <strong className="text-white">todos</strong> tus himnos, orden de servicio,
                anuncios, configuración y fondos actuales por los del respaldo.
              </p>
              <ul className="space-y-2 text-xs text-slate-500 mb-5">
                {[
                  "Esta acción no se puede deshacer",
                  "La app se recarga sola al terminar",
                  "Los archivos multimedia solo se restauran si el respaldo los incluía",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <IoInformationCircle className="text-slate-600 shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2.5">
                <button type="button" onClick={() => setMostrarModalRestaurarRespaldo(false)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/8 border border-white/8 text-slate-300 text-sm rounded-xl font-medium transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={handleRestaurarRespaldo}
                  className="flex-1 py-2.5 bg-amber-600/90 hover:bg-amber-600 border border-amber-500/30 text-white text-sm rounded-xl font-semibold transition-colors">
                  Elegir archivo…
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
