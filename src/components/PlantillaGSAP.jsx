import {createContext, useContext, useEffect, useLayoutEffect, useRef, useState} from "react";
import {gsap} from "gsap";
import {calcularEscalaFuente, CLASS_PX, calcularAjusteTexto} from "../utils/pantallaScale";

// Config del proyector (incluye fontSize.parrafo elegido en Configuración) —
// se provee una sola vez en PlantillaGSAP y se consume en useAutoFontSize,
// evitando tener que pasarla como prop por las 10 funciones EstructuraX.
const ConfigProyectorContext = createContext(null);

// ── Auto-sizing: mide el área real del texto (flex-1), no el contenedor externo ─
function useAutoFontSize(wrapRef, textRef, texto, titulo) {
  const [fontSizePx, setFontSizePx] = useState(null);
  const configuracion = useContext(ConfigProyectorContext);
  const configClass = configuracion?.fontSize?.parrafo || "text-9xl";

  const ajustarRef = useRef(null);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const el = textRef.current;
    if (!wrap || !el || !texto) return;

    const ajustar = () => {
      const rawAvail = wrap.clientHeight;
      if (rawAvail <= 0) return;

      // Margen de seguridad del 10% para evitar desbordamiento en el proyector
      const available = rawAvail * 0.90;

      // Escala vs. la resolución de referencia (1920×1080) — sin esto el
      // texto se ve chico en pantallas de mayor resolución (ej. TV 4K).
      const escala = calcularEscalaFuente();
      // Techo configurable: el mismo "Letra del Himno / Versículo" de
      // Configuración que usa ModernTextDisplay — antes esto era un 120
      // fijo que ignoraba por completo esa opción para las plantillas GSAP.
      const maxPx = (CLASS_PX[configClass] ?? 128) * escala;
      const minPx = 16 * escala;

      // Misma función que usa ModernTextDisplay — antes cada uno tenía su
      // propia búsqueda binaria, dando tamaños distintos para el mismo
      // texto/pantalla según hubiera o no una plantilla GSAP activa.
      setFontSizePx(
        calcularAjusteTexto({
          measureEl: el,
          texto,
          disponibleAlto: available,
          maxFontSizePx: maxPx,
          minFontSizePx: minPx,
          lineHeight: 1.25,
        })
      );
    };

    ajustarRef.current = ajustar;
    const raf = requestAnimationFrame(ajustar);
    return () => cancelAnimationFrame(raf);
  }, [texto, titulo, configClass]);

  // Recalcula si la ventana cambia de tamaño después del primer render (ej.
  // la animación de pantalla completa de macOS al pasar al monitor externo,
  // o al redimensionar la ventana flotante en modo un-solo-monitor) — antes
  // faltaba este listener y el texto quedaba con el tamaño calculado para
  // el tamaño de ventana anterior hasta el próximo cambio de texto.
  useEffect(() => {
    const handler = () => ajustarRef.current?.();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return fontSizePx;
}

// ── Escala por resolución para elementos que no pasan por useAutoFontSize
// (referencias, insignias) — sin esto se ven diminutas en 4K comparadas con
// el párrafo principal, que sí escala (mismo bug que se corrigió en
// ModernTextDisplay/useAutoFontSize para el tamaño de fuente configurado).
function useEscalaFuente() {
  const [escala, setEscala] = useState(() => calcularEscalaFuente());
  useEffect(() => {
    const handler = () => setEscala(calcularEscalaFuente());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return escala;
}

// ── Velocidades ─────────────────────────────────────────────────────────────
const VEL = {
  lenta: {base: 1.6, loop: 3.5},
  media: {base: 1.0, loop: 2.5},
  rapida: {base: 0.6, loop: 1.5},
};

// ────────────────────────────────────────────────────────────────────────────
// LOOK 1 — ALABANZA
// Tipografía audaz, punch de escala por palabra + destello de luz — energía
// de escenario para cantos y celebración. Paleta cálida fija (naranja/ámbar),
// no se personaliza por color como las plantillas anteriores: es un look
// curado, no un editor de colores.
// ────────────────────────────────────────────────────────────────────────────
const PALETA_ALABANZA = {
  bg1: "#2a0f05",
  bg2: "#4a1a08",
  bg3: "#1a0805",
  glow: "#ffb45033",
  texto: "#fff8ee",
  acento: "#ffcf8a",
  barra1: "#ffb35c",
  barra2: "#ff7a3d",
};

function animarAlabanza(ctx, vel) {
  const b = vel.base;
  const p = PALETA_ALABANZA;
  ctx.add(() => {
    // Estilo estático del look (color/fuente/fondos) — se aplica acá y no en
    // el JSX porque el componente principal limpia TODOS los estilos
    // inline (clearProps:"all") al cambiar de plantilla, y React no vuelve
    // a escribir un valor que no cambió entre renders.
    gsap.set(".plg-bg", {
      background: `radial-gradient(ellipse 65% 55% at 28% 18%, ${p.glow}, transparent 55%), linear-gradient(160deg, ${p.bg1} 0%, ${p.bg2} 45%, ${p.bg3} 100%)`,
    });
    gsap.set(".plg-flash", {
      background: `linear-gradient(100deg, transparent 42%, ${p.texto}55 50%, transparent 58%)`,
    });
    gsap.set(".plg-ref", {
      color: p.acento,
      border: `1px solid ${p.acento}66`,
      backgroundColor: `${p.acento}14`,
      fontFamily: "Arial, Helvetica, sans-serif",
      letterSpacing: "0.12em",
      opacity: 0,
      scale: 0.7,
    });
    gsap.set(".plg-texto", {
      color: p.texto,
      fontFamily: "Arial, Helvetica, sans-serif",
      lineHeight: 1.25,
      letterSpacing: "-0.01em",
      textShadow: `0 2px 24px ${p.glow}, 0 1px 3px rgba(0,0,0,0.6)`,
    });
    gsap.set(".plg-barra", {
      background: `linear-gradient(90deg, ${p.barra1}, ${p.barra2})`,
      scaleX: 0,
    });
    gsap.set(".plg-palabra", {opacity: 0, scale: 1.18, y: 14});
    gsap.set(".plg-flash", {xPercent: -130});

    const tl = gsap.timeline();
    tl.to(".plg-ref", {opacity: 1, scale: 1, duration: b * 0.5, ease: "back.out(1.8)"}, 0.1)
      .to(
        ".plg-palabra",
        {opacity: 1, scale: 1, y: 0, duration: b * 0.55, ease: "power3.out", stagger: 0.045},
        0.35,
      )
      .to(".plg-flash", {xPercent: 130, duration: b * 0.9, ease: "power1.inOut"}, 0.55)
      .to(".plg-barra", {scaleX: 1, duration: b * 0.5, ease: "power2.out"}, "-=0.25");
  });
}

function EstructuraAlabanza({titulo, texto}) {
  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const fontSizePx = useAutoFontSize(wrapRef, textRef, texto, titulo);
  const escala = useEscalaFuente();

  // Separar en palabras (conservando espacios) para el punch por palabra.
  const partes = texto.split(/(\s+)/);

  return (
    <>
      <div className="plg-bg absolute inset-0" />
      <div className="plg-flash absolute inset-0 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center justify-center text-center size-full px-[8%] py-[6%] gap-2">
        {titulo && (
          <span
            className="plg-ref shrink-0 inline-block font-extrabold uppercase rounded-full"
            style={{
              fontSize: `${15 * escala}px`,
              padding: `${5.5 * escala}px ${18 * escala}px`,
              marginBottom: `${24 * escala}px`,
            }}
          >
            {titulo}
          </span>
        )}
        <div
          ref={wrapRef}
          className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden"
        >
          <p
            ref={textRef}
            className="plg-texto font-extrabold w-full"
            style={{fontSize: fontSizePx ? `${fontSizePx}px` : "clamp(2rem, 5vw, 6rem)"}}
          >
            {partes.map((parte, i) =>
              parte.trim() ? (
                <span key={`palabra-${i}-${parte.slice(0, 6)}`} className="plg-palabra inline-block">
                  {parte}
                </span>
              ) : (
                parte
              ),
            )}
          </p>
        </div>
        <div
          className="plg-barra shrink-0 rounded"
          style={{width: 64 * escala, height: 4 * escala, marginTop: `${24 * escala}px`}}
        />
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// LOOK 2 — REFLEXIÓN / COMUNIÓN
// Serif elegante (Playfair Display / Cormorant Garamond), fade lento con
// desenfoque — para momentos quietos: comunión, oración, cierre. Paleta
// fría/cálida fija (azul noche + dorado apagado).
// ────────────────────────────────────────────────────────────────────────────
const PALETA_REFLEXION = {
  bg1: "#0d1220",
  bg2: "#131a2e",
  bg3: "#080b14",
  glow: "#788cff1a",
  texto: "#f1eee6",
  acento: "#c9b88a",
};

function animarReflexion(ctx, vel) {
  const b = vel.base;
  const p = PALETA_REFLEXION;
  ctx.add(() => {
    gsap.set(".plg-bg", {
      background: `radial-gradient(ellipse at 50% 0%, ${p.glow}, transparent 60%), linear-gradient(180deg, ${p.bg1} 0%, ${p.bg2} 55%, ${p.bg3} 100%)`,
    });
    gsap.set(".plg-ref", {
      color: p.acento,
      fontFamily: "'Cormorant Garamond', serif",
      fontStyle: "italic",
      fontWeight: 500,
      letterSpacing: "0.05em",
      opacity: 0,
      y: 12,
    });
    gsap.set(".plg-texto", {
      color: p.texto,
      fontFamily: "'Playfair Display', serif",
      fontWeight: 500,
      lineHeight: 1.55,
      opacity: 0,
      y: 10,
      filter: "blur(6px)",
    });
    gsap.set(".plg-barra", {
      background: `linear-gradient(180deg, transparent, ${p.acento}, transparent)`,
      scaleY: 0,
      transformOrigin: "top center",
    });

    const tl = gsap.timeline();
    tl.to(".plg-ref", {opacity: 1, y: 0, duration: b * 1.3, ease: "power2.out"})
      .to(
        ".plg-texto",
        {opacity: 1, y: 0, filter: "blur(0px)", duration: b * 1.8, ease: "power2.out"},
        "-=0.95",
      )
      .to(".plg-barra", {scaleY: 1, duration: b * 1, ease: "power2.out"}, "-=0.4");
  });
}

function EstructuraReflexion({titulo, texto}) {
  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const fontSizePx = useAutoFontSize(wrapRef, textRef, texto, titulo);
  const escala = useEscalaFuente();

  return (
    <>
      <div className="plg-bg absolute inset-0" />
      <div className="relative z-10 flex flex-col items-center justify-center text-center size-full px-[10%] py-[7%] gap-2">
        {titulo && (
          <span
            className="plg-ref shrink-0"
            style={{fontSize: `${22 * escala}px`, marginBottom: `${22 * escala}px`}}
          >
            {titulo}
          </span>
        )}
        <div
          ref={wrapRef}
          className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden"
        >
          <p
            ref={textRef}
            className="plg-texto w-full"
            style={{fontSize: fontSizePx ? `${fontSizePx}px` : "clamp(1.6rem, 4vw, 4rem)"}}
          >
            {texto}
          </p>
        </div>
        <div
          className="plg-barra shrink-0"
          style={{width: 1, height: 38 * escala, marginTop: `${26 * escala}px`}}
        />
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// LOOK 3 — ENSEÑANZA / PRÉDICA
// Limpio, alineado a la izquierda, transición rápida y directa — prioriza
// legibilidad durante lecturas largas. Sin adornos ni distracción.
// ────────────────────────────────────────────────────────────────────────────
const PALETA_ENSENANZA = {
  bg1: "#14161c",
  bg2: "#1c1f28",
  texto: "#f5f6f8",
  acento: "#7dd3c0",
};

function animarEnsenanza(ctx, vel) {
  const b = vel.base;
  const p = PALETA_ENSENANZA;
  ctx.add(() => {
    gsap.set(".plg-bg", {background: `linear-gradient(160deg, ${p.bg1} 0%, ${p.bg2} 100%)`});
    gsap.set(".plg-ref", {
      color: p.acento,
      fontFamily: "Arial, Helvetica, sans-serif",
      letterSpacing: "0.07em",
      borderLeftStyle: "solid",
      borderLeftColor: p.acento,
      opacity: 0,
      x: -16,
    });
    gsap.set(".plg-texto", {
      color: p.texto,
      fontFamily: "Arial, Helvetica, sans-serif",
      lineHeight: 1.4,
      opacity: 0,
      x: -16,
    });
    const tl = gsap.timeline();
    tl.to(".plg-ref", {opacity: 1, x: 0, duration: b * 0.45, ease: "power3.out"}).to(
      ".plg-texto",
      {opacity: 1, x: 0, duration: b * 0.45, ease: "power3.out"},
      "-=0.28",
    );
  });
}

function EstructuraEnsenanza({titulo, texto}) {
  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const fontSizePx = useAutoFontSize(wrapRef, textRef, texto, titulo);
  const escala = useEscalaFuente();

  return (
    <>
      <div className="plg-bg absolute inset-0" />
      <div className="relative z-10 flex flex-col justify-center size-full px-[9%] py-[6%] gap-3">
        {titulo && (
          <span
            className="plg-ref shrink-0 font-bold uppercase"
            style={{
              fontSize: `${15.5 * escala}px`,
              borderLeftWidth: `${3 * escala}px`,
              paddingLeft: `${11 * escala}px`,
              marginBottom: `${6 * escala}px`,
            }}
          >
            {titulo}
          </span>
        )}
        <div
          ref={wrapRef}
          className="flex-1 min-h-0 w-full flex items-center overflow-hidden"
        >
          <p
            ref={textRef}
            className="plg-texto font-semibold w-full text-left"
            style={{fontSize: fontSizePx ? `${fontSizePx}px` : "clamp(1.6rem, 4vw, 4rem)"}}
          >
            {texto}
          </p>
        </div>
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// LOOK 4 — ESPECIAL
// Marco dorado que se dibuja solo + texto con brillo dorado continuo — para
// Navidad, Semana Santa, conferencias y eventos grandes.
// ────────────────────────────────────────────────────────────────────────────
const PALETA_ESPECIAL = {
  bg1: "#06110d",
  bg2: "#0c1f16",
  bg3: "#050c09",
  glow: "#d4af5a",
  claro: "#fff3d6",
};

function animarEspecial(ctx, vel) {
  const b = vel.base;
  const p = PALETA_ESPECIAL;
  ctx.add(() => {
    gsap.set(".plg-bg", {
      background: `radial-gradient(circle at 20% 15%, ${p.glow}2e, transparent 45%), radial-gradient(circle at 85% 85%, ${p.glow}1f, transparent 45%), linear-gradient(160deg, ${p.bg1} 0%, ${p.bg2} 50%, ${p.bg3} 100%)`,
    });
    gsap.set(".plg-ref", {
      color: p.glow,
      fontFamily: "'Cormorant Garamond', serif",
      fontWeight: 600,
      opacity: 0,
      letterSpacing: "0.9em",
    });
    gsap.set(".plg-texto", {
      fontFamily: "'Playfair Display', serif",
      fontWeight: 600,
      lineHeight: 1.4,
      backgroundImage: `linear-gradient(100deg, ${p.glow} 30%, ${p.claro} 50%, ${p.glow} 70%)`,
      backgroundSize: "220% 100%",
      webkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      opacity: 0,
      scale: 0.96,
      backgroundPosition: "200% 0",
    });
    gsap.set(".plg-marco-trazo", {strokeDashoffset: 900});

    const tl = gsap.timeline();
    tl.to(".plg-marco-trazo", {strokeDashoffset: 0, duration: b * 1.6, ease: "power2.inOut"})
      .to(".plg-ref", {opacity: 1, letterSpacing: "0.5em", duration: b * 1.1, ease: "power2.out"}, "-=1.1")
      .to(".plg-texto", {opacity: 1, scale: 1, duration: b * 1.1, ease: "power2.out"}, "-=0.6")
      .to(
        ".plg-texto",
        {backgroundPosition: "-200% 0", duration: vel.loop * 1.8, ease: "none", repeat: -1},
        "-=0.2",
      );
  });
}

function EstructuraEspecial({titulo, texto}) {
  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const fontSizePx = useAutoFontSize(wrapRef, textRef, texto, titulo);
  const escala = useEscalaFuente();
  const p = PALETA_ESPECIAL;

  return (
    <>
      <div className="plg-bg absolute inset-0" />
      <svg
        className="plg-marco absolute pointer-events-none"
        style={{inset: "5%", width: "90%", height: "90%"}}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <rect
          className="plg-marco-trazo"
          x="1"
          y="1"
          width="98"
          height="98"
          rx="0.5"
          fill="none"
          stroke={p.glow}
          strokeWidth="0.35"
          style={{strokeDasharray: 900}}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center text-center size-full px-[9%] py-[7%] gap-2">
        {titulo && (
          <span
            className="plg-ref shrink-0 uppercase"
            style={{fontSize: `${17 * escala}px`, marginBottom: `${22 * escala}px`}}
          >
            {titulo}
          </span>
        )}
        <div
          ref={wrapRef}
          className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden"
        >
          <p
            ref={textRef}
            className="plg-texto font-semibold w-full"
            style={{fontSize: fontSizePx ? `${fontSizePx}px` : "clamp(1.6rem, 4vw, 4rem)"}}
          >
            {texto}
          </p>
        </div>
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// LOOK 5 — VIBRA
// Neón de escenario para cultos de jóvenes — magenta/cian sobre casi negro,
// tipografía condensada en mayúsculas, flicker de luces antes del destello
// diagonal. Paleta fija, look curado (igual criterio que las 4 anteriores).
// ────────────────────────────────────────────────────────────────────────────
const PALETA_VIBRA = {
  bg1: "#0a0416",
  bg2: "#1c0b2e",
  bg3: "#150a24",
  magenta: "#ff2d95",
  cyan: "#19e6ff",
  texto: "#fdf3ff",
};

function animarVibra(ctx, vel) {
  const b = vel.base;
  const p = PALETA_VIBRA;
  ctx.add(() => {
    gsap.set(".plg-bg", {
      background: `radial-gradient(ellipse 70% 60% at 78% 12%, ${p.cyan}29, transparent 55%), radial-gradient(ellipse 65% 70% at 15% 90%, ${p.magenta}2e, transparent 60%), linear-gradient(155deg, ${p.bg1} 0%, ${p.bg2} 48%, ${p.bg3} 100%)`,
    });
    gsap.set(".plg-flash", {
      background: `linear-gradient(100deg, transparent 40%, ${p.cyan}80 50%, transparent 60%)`,
    });
    gsap.set(".plg-ref", {
      color: p.magenta,
      border: `1px solid ${p.magenta}80`,
      backgroundColor: `${p.magenta}22`,
      fontFamily: "Arial, Helvetica, sans-serif",
      fontWeight: 800,
      letterSpacing: "0.13em",
      textShadow: `0 0 14px ${p.magenta}99`,
    });
    gsap.set(".plg-texto", {
      color: p.texto,
      fontFamily: "'Anton', Arial, sans-serif",
      fontWeight: 400,
      lineHeight: 1.15,
      letterSpacing: "0.01em",
      textTransform: "uppercase",
      textShadow: `0 0 22px ${p.cyan}70, 0 0 46px ${p.magenta}4d`,
    });
    gsap.set(".plg-barra", {
      background: `linear-gradient(90deg, ${p.magenta}, ${p.cyan})`,
      boxShadow: `0 0 16px ${p.cyan}8c`,
    });

    gsap.set(".plg-ref", {opacity: 0});
    gsap.set(".plg-texto", {opacity: 0, y: 18});
    gsap.set(".plg-barra", {scaleX: 0});
    gsap.set(".plg-flash", {xPercent: -140});

    // Flicker de luces de escenario encendiéndose antes del destello.
    const tl = gsap.timeline();
    tl.to(".plg-ref", {opacity: 1, duration: b * 0.06})
      .to(".plg-ref", {opacity: 0.15, duration: b * 0.05})
      .to(".plg-ref", {opacity: 1, duration: b * 0.08})
      .to(".plg-flash", {xPercent: 140, duration: b * 0.85, ease: "power1.inOut"}, "-=0.05")
      .to(".plg-texto", {opacity: 1, y: 0, duration: b * 0.5, ease: "power3.out"}, "-=0.6")
      .to(".plg-barra", {scaleX: 1, duration: b * 0.45, ease: "power2.out"}, "-=0.2");
  });
}

function EstructuraVibra({titulo, texto}) {
  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const fontSizePx = useAutoFontSize(wrapRef, textRef, texto, titulo);
  const escala = useEscalaFuente();

  return (
    <>
      <div className="plg-bg absolute inset-0" />
      <div className="plg-flash absolute inset-0 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center justify-center text-center size-full px-[8%] py-[6%] gap-2">
        {titulo && (
          <span
            className="plg-ref shrink-0 inline-block uppercase rounded-full"
            style={{
              fontSize: `${14 * escala}px`,
              padding: `${5.5 * escala}px ${18 * escala}px`,
              marginBottom: `${24 * escala}px`,
            }}
          >
            {titulo}
          </span>
        )}
        <div
          ref={wrapRef}
          className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden"
        >
          <p
            ref={textRef}
            className="plg-texto w-full"
            style={{fontSize: fontSizePx ? `${fontSizePx}px` : "clamp(2rem, 5vw, 6rem)"}}
          >
            {texto}
          </p>
        </div>
        <div
          className="plg-barra shrink-0 rounded"
          style={{width: 74 * escala, height: 5 * escala, marginTop: `${24 * escala}px`}}
        />
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// LOOK 6 — GOZO
// Fiesta y celebración para cultos de jóvenes — rayos de luz multicolor
// irradiando desde el centro, tipografía redonda, entrada con rebote
// elástico. Paleta fija, look curado.
// ────────────────────────────────────────────────────────────────────────────
const PALETA_GOZO = {
  bg1: "#1b0e2e",
  bg2: "#062e2a",
  bg3: "#170a24",
  pink: "#ff77c6",
  yellow: "#ffd23f",
  teal: "#2fe2c4",
  lavanda: "#c893ff",
  texto: "#fff7ec",
};

function animarGozo(ctx, vel) {
  const b = vel.base;
  const p = PALETA_GOZO;
  ctx.add(() => {
    gsap.set(".plg-bg", {
      background: `radial-gradient(ellipse 60% 55% at 20% 15%, ${p.pink}29, transparent 55%), radial-gradient(ellipse 55% 60% at 85% 85%, ${p.teal}29, transparent 55%), linear-gradient(160deg, ${p.bg1} 0%, ${p.bg2} 55%, ${p.bg3} 100%)`,
    });
    gsap.set(".plg-ref", {
      color: "#ffe9ad",
      border: `2px dotted ${p.yellow}a6`,
      backgroundColor: `${p.yellow}22`,
      fontFamily: "'Baloo 2', Arial, sans-serif",
      fontWeight: 700,
    });
    gsap.set(".plg-texto", {
      color: p.texto,
      fontFamily: "'Baloo 2', Arial, sans-serif",
      fontWeight: 700,
      lineHeight: 1.2,
    });
    gsap.set(".plg-barra", {
      background: `linear-gradient(90deg, ${p.pink}, ${p.yellow}, ${p.teal})`,
    });
    // Ángulo y color propios por rayo — 5 elementos con la misma clase.
    gsap.set(".plg-rayo", {
      rotation: (i) => [-46, -23, 0, 23, 46][i] ?? 0,
      background: (i) => {
        const colores = [p.pink, p.yellow, p.lavanda, p.teal, p.pink];
        return `linear-gradient(${colores[i] ?? p.pink}, transparent 75%)`;
      },
      opacity: 0,
    });

    gsap.set(".plg-ref", {opacity: 0, scale: 0.6});
    gsap.set(".plg-texto", {opacity: 0, scale: 0.7});
    gsap.set(".plg-barra", {scaleX: 0});

    const tl = gsap.timeline();
    tl.to(".plg-rayo", {opacity: 0.75, duration: b * 0.6, stagger: 0.06, ease: "power1.out"})
      .to(".plg-ref", {opacity: 1, scale: 1, duration: b * 0.5, ease: "back.out(2.2)"}, "-=0.4")
      .to(".plg-texto", {opacity: 1, scale: 1, duration: b * 0.75, ease: "elastic.out(1, 0.55)"}, "-=0.15")
      .to(".plg-barra", {scaleX: 1, duration: b * 0.4, ease: "power2.out"}, "-=0.35")
      .to(
        ".plg-rayo",
        {opacity: 0.4, duration: vel.loop, repeat: -1, yoyo: true, stagger: 0.25, ease: "sine.inOut"},
        "-=0.1",
      );
  });
}

function EstructuraGozo({titulo, texto}) {
  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const fontSizePx = useAutoFontSize(wrapRef, textRef, texto, titulo);
  const escala = useEscalaFuente();

  return (
    <>
      <div className="plg-bg absolute inset-0" />
      <div
        className="absolute pointer-events-none"
        style={{left: "50%", top: "-6%", width: 2, height: "145%", mixBlendMode: "screen"}}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={`rayo-${i}`}
            className="plg-rayo absolute rounded-full"
            style={{
              top: 0,
              left: 0,
              width: 34 * escala,
              height: "100%",
              transformOrigin: "50% 0%",
              filter: "blur(1px)",
            }}
          />
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center text-center size-full px-[9%] py-[7%] gap-2">
        {titulo && (
          <span
            className="plg-ref shrink-0 inline-block uppercase rounded-full"
            style={{
              fontSize: `${14 * escala}px`,
              letterSpacing: "0.1em",
              padding: `${6 * escala}px ${18 * escala}px`,
              marginBottom: `${22 * escala}px`,
            }}
          >
            {titulo}
          </span>
        )}
        <div
          ref={wrapRef}
          className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden"
        >
          <p
            ref={textRef}
            className="plg-texto w-full"
            style={{fontSize: fontSizePx ? `${fontSizePx}px` : "clamp(1.8rem, 4.5vw, 5.5rem)"}}
          >
            {texto}
          </p>
        </div>
        <div
          className="plg-barra shrink-0 rounded"
          style={{width: 64 * escala, height: 5 * escala, marginTop: `${22 * escala}px`}}
        />
      </div>
    </>
  );
}

const ANIMADORES = {
  alabanza: animarAlabanza,
  reflexion: animarReflexion,
  ensenanza: animarEnsenanza,
  especial: animarEspecial,
  vibra: animarVibra,
  gozo: animarGozo,
};

const ESTRUCTURAS = {
  alabanza: EstructuraAlabanza,
  reflexion: EstructuraReflexion,
  ensenanza: EstructuraEnsenanza,
  especial: EstructuraEspecial,
  vibra: EstructuraVibra,
  gozo: EstructuraGozo,
};


// ────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ────────────────────────────────────────────────────────────────────────────
export default function PlantillaGSAP({
  titulo,
  texto,
  plantillaId = "ensenanza",
  config = {},
  configuracion = null,
}) {
  const containerRef = useRef(null);
  const velocidad = VEL[config.velocidad] || VEL.media;
  const firstMount = useRef(true); // skip text transition on initial mount

  // Serializar config una sola vez para usar en ambos hooks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const configKey = JSON.stringify(config);

  // ── Ocultar ANTES del primer paint → evita el flash al cargar/cambiar plantilla ──
  // useLayoutEffect corre sincrónicamente antes de que el browser pinte,
  // así los elementos plg-* nunca se ven en su estado CSS default (visible).
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const els = containerRef.current.querySelectorAll("[class*='plg-']");
    if (els.length) gsap.set(els, {opacity: 0});
  }, [plantillaId, configKey]);

  // ── Animación ESTRUCTURAL: solo cuando cambia la plantilla o la config ──────
  // No incluir titulo/texto en deps; el texto se maneja aparte.
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {}, containerRef);

    const animar = ANIMADORES[plantillaId];
    if (animar) {
      // No usar clearProps:"all" aquí: borraría TODO el estilo inline de los
      // elementos, incluyendo tamaños/paddings que dependen de `escala` o
      // `fontSizePx` y que React ya no vuelve a escribir si su valor no
      // cambió respecto al render anterior (deja badges/barras en 0px).
      // animar() ya fija su propio estado inicial (oculto) para cada
      // propiedad que anima, así que no hace falta limpiar antes.
      gsap.killTweensOf(containerRef.current.querySelectorAll("*"));
      // El useLayoutEffect de arriba puso opacity:0 en todo para evitar el
      // flash pre-paint; sólo restauramos opacity (nada más) aquí — animar()
      // vuelve a poner en 0 los elementos que sí tienen entrada animada.
      gsap.set(containerRef.current.querySelectorAll("[class*='plg-']"), {opacity: 1});
      animar(ctx, velocidad);
    }

    // La próxima vez que cambie el texto, la transición puede actuar normalmente
    firstMount.current = true;

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantillaId, configKey]);

  // ── Transición de TEXTO: cross-fade rápido al navegar párrafos ──────────────
  // useLayoutEffect corre antes de que el browser pinte, así ocultamos
  // el texto ANTES de que el usuario vea el cambio.
  useLayoutEffect(() => {
    // Primera carga: la animación estructural ya maneja la entrada del texto
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    if (!containerRef.current) return;

    const els = containerRef.current.querySelectorAll(
      ".plg-texto, .plg-ref, .plg-barra",
    );
    if (!els.length) return;

    // Ocultar inmediatamente (antes del paint) para que React actualice el DOM en silencio
    gsap.set(els, {opacity: 0, y: 10});

    // Dos frames: deja que useAutoFontSize calcule el nuevo tamaño, luego entra
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => {
        gsap.to(els, {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
          overwrite: "auto",
        });
      });
      return () => cancelAnimationFrame(r2);
    });
    return () => cancelAnimationFrame(r1);
  }, [texto, titulo]);

  const Estructura = ESTRUCTURAS[plantillaId] || ESTRUCTURAS.ensenanza;

  return (
    <ConfigProyectorContext.Provider value={configuracion}>
      <div
        ref={containerRef}
        className="w-full h-full relative overflow-hidden flex items-center justify-center"
      >
        <Estructura titulo={titulo} texto={texto} config={config} />
      </div>
    </ConfigProyectorContext.Provider>
  );
}
