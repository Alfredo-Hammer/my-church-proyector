import {useState, useEffect, useRef} from "react";
import {gsap} from "gsap";
import {FaTimes, FaChevronRight} from "react-icons/fa";
import PlantillaGSAP, {META_PLANTILLAS} from "./PlantillaGSAP";

// Paleta de colores característica de cada plantilla GSAP
const PALETAS = {
  revelar:    {bg: "#0f172a", acc: "#34d399", sec: "#e2e8f0"},
  neon:       {bg: "#000000", acc: "#00f5ff", sec: "#ffffff"},
  iglesia:    {bg: "#1a0a00", acc: "#f59e0b", sec: "#fde68a"},
  cinematica: {bg: "#06082b", acc: "#818cf8", sec: "#e0e7ff"},
  particulas: {bg: "#022c1a", acc: "#34d399", sec: "#d1fae5"},
  gloria:     {bg: "#080812", acc: "#f59e0b", sec: "#fef3c7"},
  aurora:     {bg: "#020611", acc: "#06b6d4", sec: "#e0f2fe"},
  minimal:    {bg: "#0f172a", acc: "#6366f1", sec: "#f1f5f9"},
  majestad:   {bg: "#0d0520", acc: "#a855f7", sec: "#fde68a"},
  olas:       {bg: "#0c1a2e", acc: "#38bdf8", sec: "#e0f2fe"},
};

const DEMO_TITULO = "Juan 3:16";
const DEMO_TEXTO  = "Porque de tal manera amó Dios al mundo";

// Lista completa: blanco + todas las plantillas GSAP
const TEMPLATE_LIST = [
  {
    id: "blank",
    nombre: "En Blanco",
    desc: "Sin efectos, presentación limpia",
    icono: "□",
    bg: "#1e293b",
    acc: "#475569",
    sec: "#f1f5f9",
    esGsap: false,
  },
  ...Object.entries(META_PLANTILLAS).map(([id, meta]) => ({
    id,
    nombre: meta.nombre,
    desc: meta.desc,
    icono: meta.icono,
    ...(PALETAS[id] || {bg: "#0f172a", acc: "#64748b", sec: "#e2e8f0"}),
    esGsap: true,
  })),
];

// Miniatura CSS de cada plantilla (sin GSAP — solo representación visual estática)
function ThumbPlantilla({tpl, selected}) {
  const {bg, acc, sec, id} = tpl;
  return (
    <div className="absolute inset-0 overflow-hidden" style={{backgroundColor: bg}}>

      {id === "revelar" && (
        <>
          <div className="absolute top-[15%] left-[8%] right-[8%] h-[2px]" style={{backgroundColor: acc, opacity: 0.8}} />
          <div className="absolute bottom-[15%] left-[8%] right-[8%] h-[2px]" style={{backgroundColor: acc, opacity: 0.8}} />
          <div className="absolute top-[9%] left-[5%] w-[14%] h-[22%] border-t-2 border-l-2" style={{borderColor: acc}} />
          <div className="absolute top-[9%] right-[5%] w-[14%] h-[22%] border-t-2 border-r-2" style={{borderColor: acc}} />
          <div className="absolute bottom-[9%] left-[5%] w-[14%] h-[22%] border-b-2 border-l-2" style={{borderColor: acc}} />
          <div className="absolute bottom-[9%] right-[5%] w-[14%] h-[22%] border-b-2 border-r-2" style={{borderColor: acc}} />
        </>
      )}
      {id === "neon" && (
        <>
          <div className="absolute inset-[8%] border-2 rounded" style={{borderColor: acc, boxShadow: `0 0 6px ${acc}, 0 0 16px ${acc}50`}} />
          <div className="absolute inset-0" style={{background: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.15) 3px,rgba(0,0,0,0.15) 4px)", opacity: 0.5}} />
        </>
      )}
      {id === "iglesia" && (
        <>
          <div className="absolute top-[8%] left-1/2 -translate-x-1/2 text-lg leading-none" style={{color: acc}}>✝</div>
          <div className="absolute top-[26%] left-[12%] right-[12%] h-px" style={{backgroundColor: acc, opacity: 0.6}} />
          <div className="absolute bottom-[12%] left-[12%] right-[12%] h-px" style={{backgroundColor: acc, opacity: 0.6}} />
        </>
      )}
      {id === "cinematica" && (
        <>
          <div className="absolute top-0 left-0 right-0 h-[10%]" style={{backgroundColor: "#000"}} />
          <div className="absolute bottom-0 left-0 right-0 h-[10%]" style={{backgroundColor: "#000"}} />
          <div className="absolute left-[10%] top-[12%] bottom-[12%] w-[3px]" style={{backgroundColor: acc}} />
          <div className="absolute inset-0" style={{background: `linear-gradient(135deg, ${acc}12, transparent 60%)`}} />
        </>
      )}
      {id === "particulas" && (
        <>
          {[...Array(7)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 rounded-full" style={{
              backgroundColor: acc, opacity: 0.5 + (i % 3) * 0.15,
              left: `${10 + i * 12}%`, top: `${15 + (i % 4) * 20}%`,
            }} />
          ))}
          <div className="absolute inset-[28%] rounded-full border" style={{borderColor: acc, opacity: 0.25}} />
        </>
      )}
      {id === "gloria" && (
        <>
          <div className="absolute inset-0" style={{background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${acc}18 0%, transparent 65%)`}} />
          <div className="absolute inset-[22%] rounded-full border" style={{borderColor: acc, opacity: 0.25}} />
          <div className="absolute inset-[35%] rounded-full border" style={{borderColor: acc, opacity: 0.4}} />
        </>
      )}
      {id === "aurora" && (
        <>
          <div className="absolute w-[80%] h-[60%] top-[-15%] left-[-10%] rounded-full" style={{background: `radial-gradient(ellipse, ${acc}30, transparent 70%)`, filter: "blur(18px)"}} />
          <div className="absolute w-[60%] h-[50%] bottom-[-10%] right-[-5%] rounded-full" style={{background: `radial-gradient(ellipse, ${sec}20, transparent 70%)`, filter: "blur(14px)"}} />
        </>
      )}
      {id === "minimal" && (
        <>
          <div className="absolute top-[16%] left-[8%] right-[8%] h-[2.5px]" style={{backgroundColor: acc}} />
          <div className="absolute top-[16%] left-[8%] w-2.5 h-2.5 rounded-full -translate-y-[4px]" style={{backgroundColor: acc}} />
          <div className="absolute bottom-[16%] left-[8%] right-[8%] h-px" style={{backgroundColor: acc, opacity: 0.4}} />
        </>
      )}
      {id === "majestad" && (
        <>
          <div className="absolute inset-0" style={{background: `radial-gradient(ellipse 80% 60% at 50% 100%, ${acc}18 0%, transparent 60%)`}} />
          {["top-[6%] left-[5%]","top-[6%] right-[5%]","bottom-[6%] left-[5%]","bottom-[6%] right-[5%]"].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-[10%] h-[16%] border-[1.5px]`} style={{borderColor: acc, transform: "rotate(45deg)"}} />
          ))}
          <div className="absolute top-[20%] left-[12%] right-[12%] h-px" style={{backgroundColor: acc, opacity: 0.5}} />
          <div className="absolute bottom-[14%] left-[12%] right-[12%] h-px" style={{backgroundColor: acc, opacity: 0.5}} />
        </>
      )}
      {id === "olas" && (
        <>
          {[["10%","h-[3px]",0.8],["15%","h-[2px]",0.5],["19%","h-px",0.3]].map(([top,h,op],i)=>(
            <div key={i} className={`absolute left-0 right-0 ${h} rounded-full`} style={{top, backgroundColor: acc, opacity: op}} />
          ))}
          {[["81%","h-px",0.3],["85%","h-[2px]",0.5],["90%","h-[3px]",0.8]].map(([top,h,op],i)=>(
            <div key={i} className={`absolute left-0 right-0 ${h} rounded-full`} style={{top, backgroundColor: acc, opacity: op}} />
          ))}
        </>
      )}

      {/* Centro: icono + nombre */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-xl mb-0.5 leading-none" style={{color: acc}}>{tpl.icono}</div>
        <div className="text-[7px] font-bold uppercase tracking-widest leading-none" style={{color: sec, opacity: 0.75}}>
          {tpl.nombre}
        </div>
      </div>

      {/* Seleccionada: capa sutil */}
      {selected && (
        <div className="absolute inset-0 pointer-events-none" style={{backgroundColor: acc, opacity: 0.08}} />
      )}
    </div>
  );
}

export default function CreatePresentationModal({isOpen, onClose, onCreate}) {
  const [selectedId, setSelectedId]   = useState("blank");
  const [name, setName]               = useState("");
  const [slidesCount, setSlidesCount] = useState(5);
  const [previewKey, setPreviewKey]   = useState(0);
  const [hoverId, setHoverId]         = useState(null);
  const nameRef = useRef(null);

  const tpl = TEMPLATE_LIST.find(t => t.id === selectedId) || TEMPLATE_LIST[0];

  // Animación de entrada GSAP al abrir
  useEffect(() => {
    if (!isOpen) return;

    const ctx = gsap.context(() => {
      // Modal container
      gsap.from(".cppt-modal", {
        opacity: 0,
        scale: 0.96,
        y: 16,
        duration: 0.32,
        ease: "back.out(1.3)",
      });
      // Cards con stagger
      gsap.from(".cppt-card", {
        opacity: 0,
        y: 18,
        scale: 0.88,
        duration: 0.38,
        stagger: 0.032,
        ease: "back.out(1.8)",
        delay: 0.14,
      });
      // Panel derecho
      gsap.from(".cppt-right", {
        opacity: 0,
        x: 20,
        duration: 0.4,
        ease: "power3.out",
        delay: 0.1,
      });
    });

    setTimeout(() => nameRef.current?.focus(), 420);
    return () => ctx.revert();
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    if (isOpen) window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [isOpen, onClose]);

  const selectTemplate = (id) => {
    if (id === selectedId) return;

    // Micro-animación de la card seleccionada
    const el = document.querySelector(`[data-cppt="${id}"]`);
    if (el) gsap.fromTo(el, {scale: 0.93}, {scale: 1, duration: 0.28, ease: "back.out(2.2)"});

    setSelectedId(id);
    setPreviewKey(k => k + 1);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      // Shake del campo vacío
      if (nameRef.current) {
        gsap.timeline()
          .to(nameRef.current, {x: -7, duration: 0.07, ease: "none"})
          .to(nameRef.current, {x: 7,  duration: 0.07, ease: "none"})
          .to(nameRef.current, {x: -5, duration: 0.07, ease: "none"})
          .to(nameRef.current, {x: 5,  duration: 0.07, ease: "none"})
          .to(nameRef.current, {x: 0,  duration: 0.07, ease: "none"});
      }
      nameRef.current?.focus();
      return;
    }

    const slides = Array.from({length: slidesCount}, (_, i) => ({
      id: Date.now() + i,
      title: i === 0 ? name.trim() : `Diapositiva ${i + 1}`,
      content: "",
      backgroundColor: tpl.bg,
      textColor: tpl.sec,
      fontSize: "32px",
      titleFontSize: "48px",
      backgroundImage: null,
      layout: "title-content",
      textAlign: "center",
      ...(tpl.esGsap && {
        gsapTemplate: tpl.id,
        gsapConfig: {
          colorPrimario: tpl.sec,
          colorFondo:    tpl.bg,
          colorAccento:  tpl.acc,
          velocidad:     "media",
        },
      }),
    }));

    onCreate({
      id: null,
      name: name.trim(),
      slides,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      description: "",
      fileType: "custom",
      fileSize: 0,
      favorito: false,
      tags: tpl.esGsap ? ["gsap", tpl.id] : [],
      configuracion: {template: selectedId},
      slideActual: 0,
    });

    onClose();
    setName("");
    setSlidesCount(5);
    setSelectedId("blank");
  };

  if (!isOpen) return null;

  const gsapCfg = {
    colorPrimario: tpl.sec,
    colorFondo:    tpl.bg,
    colorAccento:  tpl.acc,
    velocidad:     "media",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{backgroundColor: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)"}}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="cppt-modal flex overflow-hidden border border-white/10 rounded-2xl shadow-2xl"
        style={{
          width:  "min(96vw, 1060px)",
          height: "min(90vh, 660px)",
          backgroundColor: "#12151f",
        }}
      >
        {/* ─────────────────── IZQUIERDA: galería ─────────────────── */}
        <div className="flex flex-col border-r border-white/8" style={{width: "56%"}}>
          {/* Header */}
          <div className="shrink-0 px-5 py-3.5 border-b border-white/8 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight">Nueva Presentación</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <FaTimes className="text-[11px]" />
            </button>
          </div>

          {/* Galería de plantillas */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10">
            <p className="text-[9.5px] text-gray-500 uppercase tracking-[0.15em] font-bold mb-3">
              Seleccionar plantilla
            </p>

            <div className="grid gap-3" style={{gridTemplateColumns: "repeat(3, 1fr)"}}>
              {TEMPLATE_LIST.map((t) => {
                const sel = t.id === selectedId;
                const hov = t.id === hoverId;
                return (
                  <button
                    key={t.id}
                    data-cppt={t.id}
                    onClick={() => selectTemplate(t.id)}
                    onMouseEnter={() => setHoverId(t.id)}
                    onMouseLeave={() => setHoverId(null)}
                    className="cppt-card relative rounded-xl overflow-hidden transition-all duration-150"
                    style={{
                      aspectRatio: "16/10",
                      outline: sel ? `2px solid ${t.acc}` : "1px solid rgba(255,255,255,0.1)",
                      boxShadow: sel ? `0 0 18px ${t.acc}45, inset 0 0 0 1px ${t.acc}30` : hov ? "0 4px 12px rgba(0,0,0,0.5)" : "none",
                      transform: hov && !sel ? "translateY(-2px)" : "none",
                    }}
                  >
                    <ThumbPlantilla tpl={t} selected={sel} />

                    {/* Gradiente hover con nombre */}
                    <div
                      className="absolute inset-0 flex flex-col justify-end p-1.5 transition-opacity duration-100"
                      style={{
                        background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 55%)",
                        opacity: sel || hov ? 1 : 0,
                      }}
                    >
                      <p className="text-white text-[8px] font-semibold text-center leading-none">{t.nombre}</p>
                    </div>

                    {/* Checkmark seleccionada */}
                    {sel && (
                      <div
                        className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{backgroundColor: t.acc, boxShadow: `0 0 8px ${t.acc}`}}
                      >
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─────────────────── DERECHA: preview + form ─────────────────── */}
        <div className="cppt-right flex-1 flex flex-col">
          {/* Preview animado */}
          <div className="shrink-0 p-4 pb-3">
            <p className="text-[9.5px] text-gray-500 uppercase tracking-[0.15em] font-bold mb-2">
              Vista previa
            </p>
            <div
              className="w-full overflow-hidden rounded-xl border border-white/10"
              style={{aspectRatio: "16/9"}}
            >
              {tpl.esGsap ? (
                <PlantillaGSAP
                  key={`${previewKey}-${selectedId}`}
                  titulo={DEMO_TITULO}
                  texto={DEMO_TEXTO}
                  plantillaId={selectedId}
                  config={gsapCfg}
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center text-center px-6"
                  style={{backgroundColor: tpl.bg}}
                >
                  <p
                    className="text-lg font-bold leading-tight"
                    style={{color: tpl.sec, textShadow: "0 2px 8px rgba(0,0,0,0.7)"}}
                  >
                    {name.trim() || "Nombre de la Presentación"}
                  </p>
                  <p className="text-xs mt-2 opacity-50" style={{color: tpl.sec}}>
                    {slidesCount} diapositiva{slidesCount !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Formulario */}
          <div className="flex-1 px-4 pb-4 flex flex-col justify-between min-h-0">
            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-[9.5px] text-gray-400 uppercase tracking-[0.15em] font-bold mb-1.5">
                  Nombre *
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="Ej: Servicio Dominical"
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = `${tpl.acc}80`; }}
                  onBlur={(e)  => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; }}
                />
              </div>

              {/* Diapositivas */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[9.5px] text-gray-400 uppercase tracking-[0.15em] font-bold">
                    Diapositivas
                  </label>
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded-lg"
                    style={{backgroundColor: `${tpl.acc}20`, color: tpl.acc}}
                  >
                    {slidesCount}
                  </span>
                </div>
                <input
                  type="range" min="1" max="30" step="1"
                  value={slidesCount}
                  onChange={(e) => setSlidesCount(Number(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{accentColor: tpl.acc}}
                />
                <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                  <span>1</span><span>15</span><span>30</span>
                </div>
              </div>

              {/* Info de la plantilla seleccionada */}
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border"
                style={{
                  backgroundColor: `${tpl.acc}10`,
                  borderColor: `${tpl.acc}25`,
                }}
              >
                <span className="text-2xl leading-none shrink-0">{tpl.icono}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{tpl.nombre}</p>
                  <p className="text-[10px] truncate" style={{color: tpl.acc, opacity: 0.8}}>{tpl.desc}</p>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 transition-all hover:brightness-110 active:scale-95"
                style={{
                  backgroundColor: tpl.acc,
                  boxShadow: `0 4px 18px ${tpl.acc}45`,
                }}
              >
                Crear <FaChevronRight className="text-[10px]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
