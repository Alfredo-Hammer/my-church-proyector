import {useState, useEffect, useRef} from "react";
import {gsap} from "gsap";
import PlantillaGSAP from "../components/PlantillaGSAP";
import {META_PLANTILLAS} from "../components/PlantillasConfig";
import {
  FaCheck,
  FaSave,
  FaBroadcastTower,
  FaStop,
  FaPalette,
  FaMagic,
  FaToggleOn,
  FaToggleOff,
  FaEye,
} from "react-icons/fa";

const DEFAULTS = {
  plantillaGsapActiva: "ninguna",
  plantillaGsapColor1: "#e2e8f0",
  plantillaGsapColor2: "#0f172a",
  plantillaGsapColorAcc: "#34d399",
  plantillaGsapVelocidad: "media",
};

const DEMO_TEXTO =
  "Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito";
const DEMO_TITULO = "Juan 3:16";

function ColorInput({label, value, onChange}) {
  return (
    <div>
      <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="size-9 rounded-lg border border-slate-600/60 cursor-pointer bg-transparent p-0.5"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-600/60 focus:border-indigo-500/70 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none"
        />
      </div>
    </div>
  );
}

export default function Plantillas() {
  const [config, setConfig] = useState(DEFAULTS);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [proyectando, setProyectando] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const previewRef = useRef(null);
  const colorTimer = useRef(null);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    try {
      const cfg = await window.electron?.obtenerConfiguracion?.();
      if (cfg) {
        const loaded = {
          plantillaGsapActiva:
            cfg.plantillaGsapActiva || DEFAULTS.plantillaGsapActiva,
          plantillaGsapColor1:
            cfg.plantillaGsapColor1 || DEFAULTS.plantillaGsapColor1,
          plantillaGsapColor2:
            cfg.plantillaGsapColor2 || DEFAULTS.plantillaGsapColor2,
          plantillaGsapColorAcc:
            cfg.plantillaGsapColorAcc || DEFAULTS.plantillaGsapColorAcc,
          plantillaGsapVelocidad:
            cfg.plantillaGsapVelocidad || DEFAULTS.plantillaGsapVelocidad,
        };
        setConfig(loaded);
        // Sincronizar localStorage para que el proyector ya tenga el estado correcto
        sincronizarLocalStorage(loaded);
      }
    } catch {}
  };

  // Sincroniza localStorage para que el proyector reciba el cambio inmediatamente
  const sincronizarLocalStorage = (cfg) => {
    const activa = cfg.plantillaGsapActiva !== "ninguna";
    if (activa) {
      localStorage.setItem(
        "gsap-plantilla-global:v1",
        JSON.stringify({
          plantillaId: cfg.plantillaGsapActiva,
          config: {
            colorPrimario: cfg.plantillaGsapColor1,
            colorFondo: cfg.plantillaGsapColor2,
            colorAccento: cfg.plantillaGsapColorAcc,
            velocidad: cfg.plantillaGsapVelocidad,
          },
        }),
      );
    } else {
      localStorage.removeItem("gsap-plantilla-global:v1");
    }
  };

  const guardar = async (cfgOverride) => {
    const cfg = cfgOverride || config;
    setGuardando(true);
    try {
      await Promise.all(
        Object.entries(cfg).map(([clave, valor]) =>
          window.electron?.actualizarConfiguracionPorClave?.(clave, valor),
        ),
      );
      // Sincronizar localStorage para actualización inmediata en el proyector
      sincronizarLocalStorage(cfg);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (e) {
      console.error(e);
    }
    setGuardando(false);
  };

  const recargarPreview = () => setPreviewKey((k) => k + 1);

  const toggleActiva = () => {
    const nuevo = plantillaActiva
      ? "ninguna"
      : config.plantillaGsapActiva === "ninguna"
        ? "revelar"
        : config.plantillaGsapActiva;
    const nuevaConfig = {...config, plantillaGsapActiva: nuevo};
    setConfig(nuevaConfig);
    guardar(nuevaConfig); // auto-guardar inmediatamente
  };

  const cambiarPlantilla = (id) => {
    const nuevaConfig = {...config, plantillaGsapActiva: id};
    setConfig(nuevaConfig);
    guardar(nuevaConfig); // auto-guardar al seleccionar
    recargarPreview();
  };

  const cambiarColor = (campo, valor) => {
    const nuevaConfig = {...config, [campo]: valor};
    setConfig(nuevaConfig);
    // Actualizar el proyector inmediatamente via localStorage
    sincronizarLocalStorage(nuevaConfig);
    recargarPreview();
    // Guardar en DB con debounce para no saturar mientras se arrastra el color picker
    clearTimeout(colorTimer.current);
    colorTimer.current = setTimeout(() => guardar(nuevaConfig), 600);
  };

  const cambiarVelocidad = (v) => {
    const nuevaConfig = {...config, plantillaGsapVelocidad: v};
    setConfig(nuevaConfig);
    guardar(nuevaConfig);
    recargarPreview();
  };

  const gsapConfig = {
    colorPrimario: config.plantillaGsapColor1,
    colorFondo: config.plantillaGsapColor2,
    colorAccento: config.plantillaGsapColorAcc,
    velocidad: config.plantillaGsapVelocidad,
  };

  const proyectarTest = () => {
    if (!window.electron) return;
    window.electron.abrirProyector?.();
    const slideData = {
      tipo: "slide",
      slide: {
        id: `test-${Date.now()}`,
        title: DEMO_TITULO,
        content: DEMO_TEXTO,
        gsapTemplate: config.plantillaGsapActiva,
        gsapConfig,
      },
    };
    localStorage.setItem("proyector-slide-data:v1", JSON.stringify(slideData));
    try {
      window.electron?.ipcRenderer?.send?.("proyectar-slide-data", slideData);
    } catch {}
    setProyectando(true);
  };

  const detenerTest = () => {
    localStorage.removeItem("proyector-slide-data:v1");
    window.electron?.enviarVersiculo?.({
      parrafo: "",
      titulo: " ",
      numero: " ",
      origen: "clear",
    });
    setProyectando(false);
  };

  const plantillaActiva = config.plantillaGsapActiva !== "ninguna";

  return (
    <div className="bg-[#080c14] text-slate-100 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <FaMagic className="text-indigo-400" />
          <span className="text-sm font-semibold text-white">
            Plantillas GSAP
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
              plantillaActiva
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-white/5 border-white/10 text-slate-500"
            }`}
          >
            {plantillaActiva
              ? `Activa: ${META_PLANTILLAS[config.plantillaGsapActiva]?.nombre}`
              : "Ninguna activa"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {plantillaActiva &&
            (proyectando ? (
              <button
                type="button"
                onClick={detenerTest}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition-colors"
              >
                <FaStop className="text-[9px]" /> Detener
              </button>
            ) : (
              <button
                type="button"
                onClick={proyectarTest}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 text-white text-xs font-semibold transition-colors"
              >
                <FaEye className="text-[10px]" /> Probar en proyector
              </button>
            ))}
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 border border-emerald-500/30 text-white text-xs font-semibold transition-colors"
          >
            {guardado ? (
              <>
                <FaCheck className="text-[9px]" /> Guardado
              </>
            ) : (
              <>
                <FaSave className="text-[9px]" /> Guardar
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Panel izquierdo: config ── */}
        <div className="w-80 xl:w-96 shrink-0 border-r border-slate-800 overflow-y-auto p-5 space-y-6">
          {/* Activar/desactivar */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Estado
              </h3>
              <button
                type="button"
                onClick={toggleActiva}
                className="flex items-center gap-2 text-sm transition-colors"
              >
                {plantillaActiva ? (
                  <>
                    <FaToggleOn className="text-emerald-400 text-xl" />
                    <span className="text-emerald-400 text-xs font-semibold">
                      Activa
                    </span>
                  </>
                ) : (
                  <>
                    <FaToggleOff className="text-slate-600 text-xl" />
                    <span className="text-slate-500 text-xs">Inactiva</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Cuando está activa, los anuncios proyectados usarán esta plantilla
              animada en vez del diseño simple.
            </p>
          </div>

          {/* Selector de plantilla */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Plantilla
            </h3>
            <div className="space-y-2">
              {Object.entries(META_PLANTILLAS).map(([id, meta]) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => cambiarPlantilla(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                    config.plantillaGsapActiva === id
                      ? "bg-indigo-500/15 border-indigo-500/40 text-white"
                      : "bg-white/3 border-white/8 hover:bg-white/6 text-slate-300 hover:text-white"
                  }`}
                >
                  <span
                    className={`text-xl ${config.plantillaGsapActiva === id ? "text-indigo-300" : "text-slate-500"}`}
                  >
                    {meta.icono}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {meta.nombre}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {meta.desc}
                    </p>
                  </div>
                  {config.plantillaGsapActiva === id && (
                    <FaCheck className="text-indigo-400 text-xs shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Colores */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FaPalette className="text-indigo-400 text-xs" /> Colores
            </h3>
            <div className="space-y-3">
              <ColorInput
                label="Fondo"
                value={config.plantillaGsapColor2}
                onChange={(v) => cambiarColor("plantillaGsapColor2", v)}
              />
              <ColorInput
                label="Texto"
                value={config.plantillaGsapColor1}
                onChange={(v) => cambiarColor("plantillaGsapColor1", v)}
              />
              <ColorInput
                label="Acento"
                value={config.plantillaGsapColorAcc}
                onChange={(v) => cambiarColor("plantillaGsapColorAcc", v)}
              />
            </div>
          </div>

          {/* Velocidad */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Velocidad de animación
            </h3>
            <div className="flex gap-2">
              {["lenta", "media", "rapida"].map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => cambiarVelocidad(v)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-semibold capitalize transition-all ${
                    config.plantillaGsapVelocidad === v
                      ? "bg-indigo-600 border-indigo-500/50 text-white"
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {v === "lenta" ? "Lenta" : v === "media" ? "Media" : "Rápida"}
                </button>
              ))}
            </div>
          </div>

          {/* Nota */}
          <div className="p-3 rounded-xl bg-indigo-500/8 border border-indigo-500/20">
            <p className="text-[11px] text-indigo-300/80 leading-relaxed">
              <strong className="text-indigo-300">Tip:</strong> La plantilla
              activa se aplica globalmente a todo el contenido proyectado:
              himnos, versículos bíblicos, anuncios y temporizador.
            </p>
          </div>
        </div>

        {/* ── Derecha: vista previa ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="shrink-0 px-5 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/20">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Vista previa
            </span>
            <button
              type="button"
              onClick={recargarPreview}
              className="text-[10px] text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 px-2.5 py-1 rounded-lg transition-colors"
            >
              ↺ Reiniciar animación
            </button>
          </div>

          {/* Preview container en proporción 16:9 */}
          <div className="flex-1 min-h-0 flex items-center justify-center p-6 bg-black/40">
            <div
              className="relative overflow-hidden rounded-xl shadow-2xl border border-white/10"
              style={{
                aspectRatio: "16/9",
                width: "min(100%, calc((100vh - 160px) * 16/9))",
                maxHeight: "calc(100vh - 160px)",
              }}
            >
              {plantillaActiva ? (
                <PlantillaGSAP
                  key={`${previewKey}-${config.plantillaGsapActiva}-${JSON.stringify(gsapConfig)}`}
                  titulo={DEMO_TITULO}
                  texto={DEMO_TEXTO}
                  plantillaId={config.plantillaGsapActiva}
                  config={gsapConfig}
                />
              ) : (
                <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-center p-8">
                  <FaMagic className="text-4xl text-slate-700 mb-4" />
                  <p className="text-slate-500 text-sm mb-2">
                    Ninguna plantilla activa
                  </p>
                  <p className="text-slate-600 text-xs max-w-xs">
                    Activa una plantilla y elige el diseño para ver la animación
                    aquí
                  </p>
                </div>
              )}

              {/* Overlay de info en la preview */}
              {plantillaActiva && (
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <span className="text-[10px] bg-black/60 text-white/60 px-2 py-1 rounded-md backdrop-blur-sm">
                    {META_PLANTILLAS[config.plantillaGsapActiva]?.nombre},
                    Velocidad: {config.plantillaGsapVelocidad}
                  </span>
                  <span className="text-[10px] bg-black/60 text-white/40 px-2 py-1 rounded-md backdrop-blur-sm">
                    Vista previa (texto de ejemplo)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
