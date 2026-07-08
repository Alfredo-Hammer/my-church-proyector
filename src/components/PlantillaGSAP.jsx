import {useEffect, useLayoutEffect, useRef, useState} from "react";
import {gsap} from "gsap";
import {META_PLANTILLAS} from "./PlantillasConfig";
import {calcularEscalaFuente} from "../utils/pantallaScale";

// ── Auto-sizing: mide el área real del texto (flex-1), no el contenedor externo ─
function useAutoFontSize(wrapRef, textRef, texto, titulo) {
  const [fontSizePx, setFontSizePx] = useState(null);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const el = textRef.current;
    if (!wrap || !el || !texto) return;

    const raf = requestAnimationFrame(() => {
      const rawAvail = wrap.clientHeight;
      if (rawAvail <= 0) return;

      // Margen de seguridad del 10% para evitar desbordamiento en el proyector
      const available = rawAvail * 0.90;

      // Escala vs. la resolución de referencia (1920×1080) — sin esto el
      // texto se ve chico en pantallas de mayor resolución (ej. TV 4K).
      const escala = calcularEscalaFuente();
      const maxPx = 120 * escala;
      const minPx = 16 * escala;

      // Probar tamaño máximo primero
      el.style.fontSize = `${maxPx}px`;
      if (el.scrollHeight <= available) {
        setFontSizePx(maxPx);
        return;
      }

      // Búsqueda binaria: el.scrollHeight tiene en cuenta el word-wrap real
      let lo = minPx,
        hi = maxPx,
        best = minPx;
      for (let i = 0; i < 26 && hi - lo > 0.4; i++) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = `${mid}px`;
        if (el.scrollHeight <= available) {
          best = mid;
          lo = mid;
        } else hi = mid;
      }
      setFontSizePx(best);
    });

    return () => cancelAnimationFrame(raf);
  }, [texto, titulo]);

  return fontSizePx;
}

// ── Velocidades ─────────────────────────────────────────────────────────────
const VEL = {
  lenta: {base: 1.6, loop: 3.5},
  media: {base: 1.0, loop: 2.5},
  rapida: {base: 0.6, loop: 1.5},
};

// ────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1 — REVELAR
// Marco se dibuja desde las esquinas, luego el texto aparece
// ────────────────────────────────────────────────────────────────────────────
function animarRevelar(ctx, config, vel) {
  const {
    colorFondo = "#0f172a",
    colorPrimario = "#e2e8f0",
    colorAccento = "#34d399",
  } = config;
  const b = vel.base;

  ctx.add(() => {
    const tl = gsap.timeline();

    // Fondo
    tl.set(".plg-bg", {backgroundColor: colorFondo, opacity: 0}).to(".plg-bg", {
      opacity: 1,
      duration: b * 0.3,
    });

    // Líneas horizontales (expand from center)
    tl.set(".plg-line", {scaleX: 0, transformOrigin: "center"}).to(
      ".plg-line",
      {scaleX: 1, duration: b * 0.6, ease: "expo.out", stagger: 0.12},
      "<0.1",
    );

    // Esquinas (slide in desde exterior)
    tl.set(".plg-corner", {opacity: 0, scale: 0.6}).to(
      ".plg-corner",
      {
        opacity: 1,
        scale: 1,
        duration: b * 0.5,
        ease: "back.out(1.4)",
        stagger: 0.08,
      },
      "<0.15",
    );

    // Título
    tl.set(".plg-titulo", {opacity: 0, y: 40, color: colorAccento}).to(
      ".plg-titulo",
      {opacity: 1, y: 0, duration: b * 0.55, ease: "power3.out"},
      "<0.2",
    );

    // Divisor
    tl.set(".plg-divisor", {scaleX: 0, backgroundColor: colorAccento}).to(
      ".plg-divisor",
      {scaleX: 1, duration: b * 0.4, ease: "power2.out"},
      "<0.1",
    );

    // Texto
    tl.set(".plg-texto", {opacity: 0, y: 24, color: colorPrimario}).to(
      ".plg-texto",
      {opacity: 1, y: 0, duration: b * 0.5, ease: "power2.out"},
      "<0.12",
    );

    // Loop — glow pulsante en los marcos
    gsap.to(".plg-corner, .plg-line", {
      filter: `drop-shadow(0 0 8px ${colorAccento}) drop-shadow(0 0 3px ${colorAccento})`,
      repeat: -1,
      yoyo: true,
      duration: vel.loop,
      ease: "sine.inOut",
    });
  });
}

// ────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2 — NEÓN
// Borde neón que parpadea, texto con efecto flicker
// ────────────────────────────────────────────────────────────────────────────
function animarNeon(ctx, config, vel) {
  const {
    colorFondo = "#000000",
    colorPrimario = "#ffffff",
    colorAccento = "#00f5ff",
  } = config;
  const b = vel.base;
  const glow = `0 0 6px ${colorAccento}, 0 0 20px ${colorAccento}, 0 0 40px ${colorAccento}50`;
  const glowHigh = `0 0 8px ${colorAccento}, 0 0 30px ${colorAccento}, 0 0 60px ${colorAccento}80`;

  ctx.add(() => {
    gsap.set(".plg-bg", {backgroundColor: colorFondo});
    gsap.set(".plg-neon-box", {
      borderColor: colorAccento,
      boxShadow: "none",
      opacity: 0,
    });

    const tl = gsap.timeline();

    // Box scale in (primero X, luego Y)
    tl.to(".plg-neon-box", {opacity: 1, duration: b * 0.1})
      .to(
        ".plg-neon-box",
        {
          scaleX: 1,
          duration: b * 0.3,
          ease: "power3.out",
          transformOrigin: "center",
        },
        "<",
      )
      .to(".plg-neon-box", {
        scaleY: 1,
        boxShadow: glow,
        duration: b * 0.3,
        ease: "power3.out",
        transformOrigin: "center",
      });

    // Flicker del título
    tl.set(".plg-titulo", {opacity: 0, color: colorAccento, textShadow: glow});
    [0, 1, 0, 1, 0, 1, 1].forEach((v, i) => {
      tl.to(".plg-titulo", {opacity: v, duration: b * 0.04, ease: "none"});
    });

    // Texto
    tl.set(".plg-texto", {opacity: 0, color: colorPrimario}).to(
      ".plg-texto",
      {opacity: 1, duration: b * 0.25, ease: "power2.out"},
      "<0.1",
    );

    // Loop — glow box oscillation
    gsap.to(".plg-neon-box", {
      boxShadow: glowHigh,
      repeat: -1,
      yoyo: true,
      duration: vel.loop,
      ease: "sine.inOut",
    });
    // Loop — título glow
    gsap.to(".plg-titulo", {
      textShadow: glowHigh,
      repeat: -1,
      yoyo: true,
      duration: vel.loop * 0.8,
      ease: "sine.inOut",
    });
    // Scanlines drift
    gsap.to(".plg-scanlines", {
      backgroundPosition: "0 100%",
      duration: 8,
      repeat: -1,
      ease: "none",
    });
  });
}

// ────────────────────────────────────────────────────────────────────────────
// TEMPLATE 3 — IGLESIA
// Ornamento cruz, línea divisora, tipografía clásica
// ────────────────────────────────────────────────────────────────────────────
function animarIglesia(ctx, config, vel) {
  const {
    colorFondo = "#1a0a00",
    colorPrimario = "#fde68a",
    colorAccento = "#f59e0b",
  } = config;
  const b = vel.base;

  ctx.add(() => {
    gsap.set(".plg-bg", {backgroundColor: colorFondo});

    const tl = gsap.timeline();

    // Fondo con velo
    tl.set(".plg-velo", {opacity: 0, backgroundColor: colorFondo}).to(
      ".plg-velo",
      {opacity: 0.92, duration: b * 0.5},
    );

    // Ornamento superior (cruz/símbolo)
    tl.set(".plg-ornamento", {opacity: 0, scale: 0.4, color: colorAccento}).to(
      ".plg-ornamento",
      {opacity: 1, scale: 1, duration: b * 0.7, ease: "back.out(1.6)"},
      "<0.1",
    );

    // Líneas ornamentales
    tl.set(".plg-ornline", {
      scaleX: 0,
      backgroundColor: colorAccento,
      transformOrigin: "center",
    }).to(
      ".plg-ornline",
      {scaleX: 1, duration: b * 0.5, ease: "power2.out", stagger: 0.1},
      "<0.2",
    );

    // Título
    tl.set(".plg-titulo", {
      opacity: 0,
      y: 20,
      color: colorAccento,
      letterSpacing: "0.3em",
    }).to(
      ".plg-titulo",
      {
        opacity: 1,
        y: 0,
        letterSpacing: "0.15em",
        duration: b * 0.6,
        ease: "power3.out",
      },
      "<0.15",
    );

    // Divisor central
    tl.set(".plg-divisor", {
      scaleX: 0,
      backgroundColor: colorAccento,
      transformOrigin: "center",
    }).to(
      ".plg-divisor",
      {scaleX: 1, duration: b * 0.5, ease: "expo.out"},
      "<0.1",
    );

    // Texto
    tl.set(".plg-texto", {opacity: 0, y: 16, color: colorPrimario}).to(
      ".plg-texto",
      {opacity: 1, y: 0, duration: b * 0.55, ease: "power2.out"},
      "<0.12",
    );

    // Loop — luz ambiental suave
    gsap.to(".plg-velo", {
      opacity: 0.86,
      repeat: -1,
      yoyo: true,
      duration: vel.loop * 1.2,
      ease: "sine.inOut",
    });
    // Ornamento muy sutil giro
    gsap.to(".plg-ornamento", {
      rotation: 5,
      repeat: -1,
      yoyo: true,
      duration: vel.loop * 2,
      ease: "sine.inOut",
    });
  });
}

// ────────────────────────────────────────────────────────────────────────────
// TEMPLATE 4 — CINEMATICA
// Texto letra por letra, gradiente de fondo en movimiento
// ────────────────────────────────────────────────────────────────────────────
function animarCinematica(ctx, config, vel) {
  const {
    colorFondo = "#06082b",
    colorPrimario = "#e0e7ff",
    colorAccento = "#818cf8",
  } = config;
  const b = vel.base;

  ctx.add(() => {
    gsap.set(".plg-bg", {
      background: `linear-gradient(135deg, ${colorFondo}, #000000, ${colorFondo})`,
    });
    gsap.set(".plg-grad", {
      background: `linear-gradient(135deg, ${colorAccento}20, transparent 60%, ${colorAccento}15)`,
    });

    const tl = gsap.timeline();

    // Barras cinematográficas
    tl.set(".plg-barra", {
      scaleX: 0,
      backgroundColor: "#000",
      transformOrigin: "left",
    }).to(".plg-barra", {
      scaleX: 1,
      duration: b * 0.5,
      ease: "power3.out",
      stagger: 0.08,
    });

    // Subtítulo / categoría
    tl.set(".plg-cat", {
      opacity: 0,
      x: -30,
      color: colorAccento,
      letterSpacing: "0.4em",
    }).to(
      ".plg-cat",
      {opacity: 1, x: 0, duration: b * 0.45, ease: "power2.out"},
      "<0.3",
    );

    // Título (letra por letra simulado con clip)
    tl.set(".plg-titulo", {
      clipPath: "inset(0 100% 0 0)",
      color: colorPrimario,
    }).to(
      ".plg-titulo",
      {clipPath: "inset(0 0% 0 0)", duration: b * 0.8, ease: "power3.inOut"},
      "<0.2",
    );

    // Línea lateral
    tl.set(".plg-linelat", {
      scaleY: 0,
      backgroundColor: colorAccento,
      transformOrigin: "top",
    }).to(
      ".plg-linelat",
      {scaleY: 1, duration: b * 0.5, ease: "power3.out"},
      "<0.2",
    );

    // Texto
    tl.set(".plg-texto", {opacity: 0, x: 20, color: colorPrimario}).to(
      ".plg-texto",
      {opacity: 1, x: 0, duration: b * 0.5, ease: "power2.out"},
      "<0.15",
    );

    // Loop — gradiente en movimiento
    gsap.to(".plg-grad", {
      backgroundPosition: "200% 200%",
      duration: vel.loop * 2,
      repeat: -1,
      ease: "none",
    });
    // Barras opacidad sutil
    gsap.to(".plg-barra", {
      opacity: 0.85,
      repeat: -1,
      yoyo: true,
      duration: vel.loop * 1.5,
      ease: "sine.inOut",
    });
  });
}

// ────────────────────────────────────────────────────────────────────────────
// TEMPLATE 5 — PARTICULAS
// Partículas flotantes + texto centrado limpio
// ────────────────────────────────────────────────────────────────────────────
function animarParticulas(ctx, config, vel) {
  const {
    colorFondo = "#022c1a",
    colorPrimario = "#d1fae5",
    colorAccento = "#34d399",
  } = config;
  const b = vel.base;

  ctx.add(() => {
    gsap.set(".plg-bg", {backgroundColor: colorFondo});

    // Animar partículas individuales
    gsap.utils.toArray(".plg-particula").forEach((p, i) => {
      gsap.set(p, {
        x: `${Math.random() * 100}vw`,
        y: `${Math.random() * 100}vh`,
        opacity: 0,
        scale: Math.random() * 0.5 + 0.3,
        backgroundColor: colorAccento,
      });
      gsap.to(p, {
        y: `-=${80 + Math.random() * 120}`,
        opacity: Math.random() * 0.5 + 0.1,
        duration: 5 + Math.random() * 8,
        repeat: -1,
        delay: Math.random() * 4,
        ease: "none",
        yoyo: false,
      });
    });

    const tl = gsap.timeline();

    // Halo circular
    tl.set(".plg-halo", {opacity: 0, scale: 1.5, borderColor: colorAccento}).to(
      ".plg-halo",
      {opacity: 0.25, scale: 1, duration: b * 0.8, ease: "power2.out"},
    );

    // Título
    tl.set(".plg-titulo", {opacity: 0, scale: 0.85, color: colorPrimario}).to(
      ".plg-titulo",
      {opacity: 1, scale: 1, duration: b * 0.6, ease: "back.out(1.2)"},
      "<0.3",
    );

    // Divisor
    tl.set(".plg-divisor", {
      scaleX: 0,
      backgroundColor: colorAccento,
      transformOrigin: "center",
    }).to(
      ".plg-divisor",
      {scaleX: 1, duration: b * 0.4, ease: "power2.out"},
      "<0.2",
    );

    // Texto
    tl.set(".plg-texto", {opacity: 0, y: 18, color: colorPrimario}).to(
      ".plg-texto",
      {opacity: 1, y: 0, duration: b * 0.5, ease: "power2.out"},
      "<0.1",
    );

    // Loop — halo pulsa
    gsap.to(".plg-halo", {
      scale: 1.08,
      opacity: 0.12,
      repeat: -1,
      yoyo: true,
      duration: vel.loop * 1.2,
      ease: "sine.inOut",
    });
  });
}

// ────────────────────────────────────────────────────────────────────────────
// TEMPLATE 6 — GLORIA
// Rayos de luz desde el centro, halos concéntricos, adoración
// ────────────────────────────────────────────────────────────────────────────
function animarGloria(ctx, config, vel) {
  const {
    colorFondo = "#080812",
    colorPrimario = "#fef3c7",
    colorAccento = "#f59e0b",
  } = config;
  const b = vel.base;

  ctx.add(() => {
    gsap.set(".plg-bg", {backgroundColor: colorFondo});
    gsap.utils.toArray(".plg-rayo").forEach((r, i) => {
      gsap.set(r, {
        rotation: i * 20,
        scaleY: 0,
        opacity: 0,
        transformOrigin: "bottom center",
      });
    });
    gsap.set(".plg-gloria-outer", {scale: 0, opacity: 0});
    gsap.set(".plg-gloria-inner", {scale: 0, opacity: 0});

    const tl = gsap.timeline();
    tl.to(".plg-gloria-outer", {
      scale: 1,
      opacity: 0.13,
      duration: b * 0.8,
      ease: "power3.out",
    })
      .to(
        ".plg-gloria-inner",
        {scale: 1, opacity: 0.24, duration: b * 0.6, ease: "power2.out"},
        "<0.2",
      )
      .to(
        ".plg-rayo",
        {
          scaleY: 1,
          opacity: 0.12,
          duration: b * 0.7,
          stagger: 0.03,
          ease: "power2.out",
        },
        "<0.1",
      )
      .set(".plg-titulo", {opacity: 0, scale: 0.85, color: colorAccento})
      .to(
        ".plg-titulo",
        {opacity: 1, scale: 1, duration: b * 0.65, ease: "back.out(1.4)"},
        "<0.25",
      )
      .set(".plg-divisor", {scaleX: 0, backgroundColor: colorAccento})
      .to(
        ".plg-divisor",
        {scaleX: 1, duration: b * 0.4, ease: "expo.out"},
        "<0.1",
      )
      .set(".plg-texto", {opacity: 0, y: 22, color: colorPrimario})
      .to(
        ".plg-texto",
        {opacity: 1, y: 0, duration: b * 0.5, ease: "power2.out"},
        "<0.12",
      );

    gsap.to(".plg-gloria-outer", {
      scale: 1.07,
      opacity: 0.18,
      repeat: -1,
      yoyo: true,
      duration: vel.loop * 1.5,
      ease: "sine.inOut",
    });
    gsap.to(".plg-gloria-inner", {
      scale: 1.05,
      opacity: 0.28,
      repeat: -1,
      yoyo: true,
      duration: vel.loop * 1.2,
      ease: "sine.inOut",
    });
    gsap.utils.toArray(".plg-rayo").forEach((r, i) => {
      gsap.to(r, {
        opacity: (i % 3) * 0.04 + 0.03,
        repeat: -1,
        yoyo: true,
        duration: vel.loop * (0.6 + (i % 5) * 0.2),
        ease: "sine.inOut",
      });
    });
  });
}

function EstructuraGloria({titulo, texto, config}) {
  const {colorAccento = "#f59e0b", colorPrimario = "#fef3c7"} = config;
  return (
    <>
      <div
        className="plg-bg absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(ellipse 70% 55% at 50% 50%, ${colorAccento}20 0%, transparent 65%)`,
        }}
      />
      {Array.from({length: 18}).map((_, i) => (
        <div
          key={`rayo-${i}`}
          className="plg-rayo absolute pointer-events-none"
          style={{
            width: "2px",
            height: "50%",
            bottom: "50%",
            left: "calc(50% - 1px)",
            background: `linear-gradient(to top, ${colorAccento}55, transparent)`,
          }}
        />
      ))}
      <div
        className="plg-gloria-outer absolute rounded-full border-[1.5px] pointer-events-none"
        style={{inset: "18%", borderColor: colorAccento}}
      />
      <div
        className="plg-gloria-inner absolute rounded-full border pointer-events-none"
        style={{inset: "31%", borderColor: colorAccento}}
      />
      <TextoAuto
        texto={texto}
        titulo={titulo}
        colorTexto={colorPrimario}
        colorTitulo={colorAccento}
        colorAccento={colorAccento}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TEMPLATE 7 — AURORA
// Bandas de luz aurora boreal flotando, etéreo y celestial
// ────────────────────────────────────────────────────────────────────────────
function animarAurora(ctx, config, vel) {
  const {
    colorFondo = "#020611",
    colorPrimario = "#e0f2fe",
    colorAccento = "#06b6d4",
  } = config;
  const b = vel.base;

  ctx.add(() => {
    gsap.set(".plg-bg", {backgroundColor: colorFondo});
    gsap.set(".plg-aurora-blob", {opacity: 0, scale: 0.8, y: 20});

    const tl = gsap.timeline();
    tl.to(".plg-aurora-blob", {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: b * 1.1,
      stagger: 0.15,
      ease: "power2.out",
    })
      .set(".plg-titulo", {opacity: 0, y: 24, color: colorPrimario})
      .to(
        ".plg-titulo",
        {opacity: 1, y: 0, duration: b * 0.6, ease: "power3.out"},
        "<0.25",
      )
      .set(".plg-divisor", {scaleX: 0, backgroundColor: colorAccento})
      .to(
        ".plg-divisor",
        {scaleX: 1, duration: b * 0.4, ease: "power2.out"},
        "<0.1",
      )
      .set(".plg-texto", {opacity: 0, y: 18, color: colorPrimario})
      .to(
        ".plg-texto",
        {opacity: 1, y: 0, duration: b * 0.5, ease: "power2.out"},
        "<0.1",
      );

    gsap.utils.toArray(".plg-aurora-blob").forEach((blob, i) => {
      const dir = i % 2 === 0 ? -1 : 1;
      gsap.to(blob, {
        y: dir * (25 + i * 12),
        x: (i % 3 === 0 ? 1 : -1) * 18,
        scale: 1 + i * 0.05,
        repeat: -1,
        yoyo: true,
        duration: vel.loop * (1.4 + i * 0.35),
        ease: "sine.inOut",
      });
    });
  });
}

function EstructuraAurora({titulo, texto, config}) {
  const {colorAccento = "#06b6d4", colorPrimario = "#e0f2fe"} = config;
  return (
    <>
      <div className="plg-bg absolute inset-0" />
      <div
        className="plg-aurora-blob absolute pointer-events-none rounded-full"
        style={{
          width: "75%",
          height: "55%",
          top: "-15%",
          left: "-10%",
          background: `radial-gradient(ellipse, ${colorAccento}2a 0%, transparent 70%)`,
          filter: "blur(10px)",
        }}
      />
      <div
        className="plg-aurora-blob absolute pointer-events-none rounded-full"
        style={{
          width: "60%",
          height: "50%",
          top: "10%",
          right: "-5%",
          background: `radial-gradient(ellipse, ${colorPrimario}18 0%, transparent 70%)`,
          filter: "blur(10px)",
        }}
      />
      <div
        className="plg-aurora-blob absolute pointer-events-none rounded-full"
        style={{
          width: "65%",
          height: "45%",
          bottom: "-10%",
          left: "15%",
          background: `radial-gradient(ellipse, ${colorAccento}22 0%, transparent 70%)`,
          filter: "blur(55px)",
        }}
      />
      <TextoAuto
        texto={texto}
        titulo={titulo}
        colorTexto={colorPrimario}
        colorTitulo={colorAccento}
        colorAccento={colorAccento}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TEMPLATE 8 — MINIMAL
// Ultra limpio, barrido de línea + texto revelado con clip
// ────────────────────────────────────────────────────────────────────────────
function animarMinimal(ctx, config, vel) {
  const {
    colorFondo = "#0f172a",
    colorPrimario = "#f1f5f9",
    colorAccento = "#6366f1",
  } = config;
  const b = vel.base;

  ctx.add(() => {
    gsap.set(".plg-bg", {backgroundColor: colorFondo});
    gsap.set(".plg-min-line", {
      scaleX: 0,
      transformOrigin: "left",
      backgroundColor: colorAccento,
    });
    gsap.set(".plg-min-dot", {scale: 0, backgroundColor: colorAccento});

    const tl = gsap.timeline();
    tl.to(".plg-min-line", {
      scaleX: 1,
      duration: b * 0.65,
      ease: "power3.out",
      stagger: 0.1,
    })
      .to(
        ".plg-min-dot",
        {scale: 1, duration: b * 0.3, ease: "back.out(2)"},
        "<0.35",
      )
      .set(".plg-titulo", {
        opacity: 0,
        clipPath: "inset(0 100% 0 0)",
        color: colorPrimario,
      })
      .to(
        ".plg-titulo",
        {
          opacity: 1,
          clipPath: "inset(0 0% 0 0)",
          duration: b * 0.7,
          ease: "power2.inOut",
        },
        "<0.05",
      )
      .set(".plg-texto", {opacity: 0, y: 14, color: colorPrimario})
      .to(
        ".plg-texto",
        {opacity: 1, y: 0, duration: b * 0.5, ease: "power2.out"},
        "<0.3",
      );

    gsap.to(".plg-min-line", {
      opacity: 0.5,
      repeat: -1,
      yoyo: true,
      duration: vel.loop * 1.3,
      ease: "sine.inOut",
    });
    gsap.to(".plg-min-dot", {
      scale: 1.5,
      opacity: 0.6,
      repeat: -1,
      yoyo: true,
      duration: vel.loop * 0.9,
      ease: "sine.inOut",
    });
  });
}

function EstructuraMinimal({titulo, texto, config}) {
  const {colorAccento = "#6366f1", colorPrimario = "#f1f5f9"} = config;
  return (
    <>
      <div className="plg-bg absolute inset-0" />
      <div className="plg-min-line absolute top-[11%] left-[7%] right-[7%] h-[2px]" />
      <div className="plg-min-dot  absolute top-[11%] left-[7%] size-2.5 rounded-full -translate-y-[5px]" />
      <div
        className="plg-min-line absolute bottom-[11%] left-[7%] right-[7%] h-px"
        style={{opacity: 0.4}}
      />
      <TextoAuto
        texto={texto}
        titulo={titulo}
        colorTexto={colorPrimario}
        colorTitulo={colorAccento}
        colorAccento={null}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TEMPLATE 9 — MAJESTAD
// Diamantes en esquinas, paleta real púrpura/dorado, elegante
// ────────────────────────────────────────────────────────────────────────────
function animarMajestad(ctx, config, vel) {
  const {
    colorFondo = "#0d0520",
    colorPrimario = "#fde68a",
    colorAccento = "#a855f7",
  } = config;
  const b = vel.base;

  ctx.add(() => {
    gsap.set(".plg-bg", {
      backgroundColor: colorFondo,
      backgroundImage: `radial-gradient(ellipse 80% 60% at 50% 100%, ${colorAccento}18 0%, transparent 60%)`,
    });
    gsap.set(".plg-diamante", {scale: 0, opacity: 0, rotation: 45});
    gsap.set(".plg-majline", {scaleX: 0, transformOrigin: "center"});

    const tl = gsap.timeline();
    tl.to(".plg-diamante", {
      scale: 1,
      opacity: 1,
      duration: b * 0.5,
      stagger: 0.07,
      ease: "back.out(1.5)",
    })
      .to(
        ".plg-majline",
        {scaleX: 1, duration: b * 0.5, ease: "power2.out", stagger: 0.08},
        "<0.2",
      )
      .set(".plg-titulo", {
        opacity: 0,
        letterSpacing: "0.35em",
        color: colorPrimario,
      })
      .to(
        ".plg-titulo",
        {
          opacity: 1,
          letterSpacing: "0.06em",
          duration: b * 0.7,
          ease: "power3.out",
        },
        "<0.15",
      )
      .set(".plg-divisor", {scaleX: 0, backgroundColor: colorAccento})
      .to(
        ".plg-divisor",
        {scaleX: 1, duration: b * 0.4, ease: "expo.out"},
        "<0.1",
      )
      .set(".plg-texto", {opacity: 0, y: 16, color: colorPrimario})
      .to(
        ".plg-texto",
        {opacity: 1, y: 0, duration: b * 0.55, ease: "power2.out"},
        "<0.1",
      );

    gsap.to(".plg-diamante", {
      scale: 1.15,
      opacity: 0.75,
      stagger: 0.25,
      repeat: -1,
      yoyo: true,
      duration: vel.loop * 1.4,
      ease: "sine.inOut",
    });
    gsap.to(".plg-majline", {
      opacity: 0.4,
      repeat: -1,
      yoyo: true,
      duration: vel.loop,
      ease: "sine.inOut",
    });
  });
}

function EstructuraMajestad({titulo, texto, config}) {
  const {colorAccento = "#a855f7", colorPrimario = "#fde68a"} = config;
  const corners = [
    "top-[5%] left-[3.5%]",
    "top-[5%] right-[3.5%]",
    "bottom-[5%] left-[3.5%]",
    "bottom-[5%] right-[3.5%]",
  ];
  return (
    <>
      <div className="plg-bg absolute inset-0" />
      {corners.map((pos, i) => (
        <div
          key={`diamante-${i}`}
          className={`plg-diamante absolute ${pos} size-5 border-2 pointer-events-none`}
          style={{borderColor: colorAccento}}
        />
      ))}
      <div
        className="plg-majline absolute top-[15%] left-[12%] right-[12%] h-px"
        style={{backgroundColor: colorAccento, opacity: 0.6}}
      />
      <div
        className="plg-majline absolute bottom-[13%] left-[12%] right-[12%] h-px"
        style={{backgroundColor: colorAccento, opacity: 0.6}}
      />
      <TextoAuto
        texto={texto}
        titulo={titulo}
        colorTexto={colorPrimario}
        colorTitulo={colorPrimario}
        colorAccento={colorAccento}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TEMPLATE 10 — OLAS
// Líneas de onda en bordes superior/inferior, centro limpio y amplio
// ────────────────────────────────────────────────────────────────────────────
function animarOlas(ctx, config, vel) {
  const {
    colorFondo = "#0c1a2e",
    colorPrimario = "#e0f2fe",
    colorAccento = "#38bdf8",
  } = config;
  const b = vel.base;

  ctx.add(() => {
    gsap.set(".plg-bg", {backgroundColor: colorFondo});
    gsap.set(".plg-ola-top", {scaleX: 0, transformOrigin: "left"});
    gsap.set(".plg-ola-bot", {scaleX: 0, transformOrigin: "right"});

    const tl = gsap.timeline();
    tl.to(".plg-ola-top", {
      scaleX: 1,
      duration: b * 0.6,
      ease: "power3.out",
      stagger: 0.08,
    })
      .to(
        ".plg-ola-bot",
        {
          scaleX: 1,
          duration: b * 0.6,
          ease: "power3.out",
          stagger: {each: 0.08, from: "end"},
        },
        "<0.05",
      )
      .set(".plg-titulo", {opacity: 0, y: -18, color: colorAccento})
      .to(
        ".plg-titulo",
        {opacity: 1, y: 0, duration: b * 0.55, ease: "power3.out"},
        "<0.2",
      )
      .set(".plg-divisor", {scaleX: 0, backgroundColor: colorAccento})
      .to(
        ".plg-divisor",
        {scaleX: 1, duration: b * 0.4, ease: "power2.out"},
        "<0.1",
      )
      .set(".plg-texto", {opacity: 0, y: 18, color: colorPrimario})
      .to(
        ".plg-texto",
        {opacity: 1, y: 0, duration: b * 0.5, ease: "power2.out"},
        "<0.1",
      );

    gsap.utils.toArray(".plg-ola-top").forEach((o, i) => {
      gsap.to(o, {
        y: i % 2 === 0 ? -7 : 7,
        opacity: 0.5 + i * 0.15,
        repeat: -1,
        yoyo: true,
        duration: vel.loop * (0.85 + i * 0.28),
        ease: "sine.inOut",
      });
    });
    gsap.utils.toArray(".plg-ola-bot").forEach((o, i) => {
      gsap.to(o, {
        y: i % 2 === 0 ? 7 : -7,
        opacity: 0.5 + i * 0.15,
        repeat: -1,
        yoyo: true,
        duration: vel.loop * (0.9 + i * 0.22),
        ease: "sine.inOut",
      });
    });
  });
}

function EstructuraOlas({titulo, texto, config}) {
  const {colorAccento = "#38bdf8", colorPrimario = "#e0f2fe"} = config;
  return (
    <>
      <div className="plg-bg absolute inset-0" />
      {[
        ["7%", "h-[3px]", 0.7],
        ["12%", "h-[2px]", 0.45],
        ["16.5%", "h-px", 0.25],
      ].map(([top, h, op], i) => (
        <div
          key={`ola-${i}`}
          className={`plg-ola-top absolute left-0 right-0 ${h} rounded-full pointer-events-none`}
          style={{top, backgroundColor: colorAccento, opacity: op}}
        />
      ))}
      {[
        ["83.5%", "h-px", 0.25],
        ["88%", "h-[2px]", 0.45],
        ["93%", "h-[3px]", 0.7],
      ].map(([top, h, op], i) => (
        <div
          key={`ola-${i}`}
          className={`plg-ola-bot absolute left-0 right-0 ${h} rounded-full pointer-events-none`}
          style={{top, backgroundColor: colorAccento, opacity: op}}
        />
      ))}
      <TextoAuto
        texto={texto}
        titulo={titulo}
        colorTexto={colorPrimario}
        colorTitulo={colorAccento}
        colorAccento={colorAccento}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MAPA DE PLANTILLAS
// ────────────────────────────────────────────────────────────────────────────
const ANIMADORES = {
  revelar: animarRevelar,
  neon: animarNeon,
  iglesia: animarIglesia,
  cinematica: animarCinematica,
  particulas: animarParticulas,
  gloria: animarGloria,
  aurora: animarAurora,
  minimal: animarMinimal,
  majestad: animarMajestad,
  olas: animarOlas,
};

// ────────────────────────────────────────────────────────────────────────────
// ESTRUCTURAS JSX por plantilla
// ────────────────────────────────────────────────────────────────────────────
// ── Texto auto-dimensionado compartido por todas las plantillas ──────────────
function TextoAuto({
  texto,
  titulo,
  colorTexto,
  colorTitulo,
  colorAccento,
  extraClass = "",
}) {
  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const fontSizePx = useAutoFontSize(wrapRef, textRef, texto, titulo);

  return (
    <div className="relative z-10 flex flex-col items-center justify-center text-center size-full px-[10%] py-[6%] gap-2">
      {titulo && (
        <h1
          className={`plg-titulo font-bold leading-tight shrink-0 ${extraClass}`}
          style={{
            color: colorTitulo || colorAccento,
            fontSize: "clamp(1.6rem, 3.5vw, 4rem)",
          }}
        >
          {titulo}
        </h1>
      )}
      {colorAccento && (
        <div
          className="plg-divisor w-20 h-[3px] mx-auto shrink-0"
          style={{backgroundColor: colorAccento}}
        />
      )}
      <div
        ref={wrapRef}
        className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden"
      >
        <p
          ref={textRef}
          className="plg-texto font-semibold whitespace-pre-wrap w-full"
          style={{
            color: colorTexto,
            lineHeight: 1.25,
            fontSize: fontSizePx ? `${fontSizePx}px` : "clamp(2rem, 5vw, 6rem)",
          }}
        >
          {texto}
        </p>
      </div>
    </div>
  );
}

function EstructuraRevelar({titulo, texto, config}) {
  const {colorAccento = "#34d399", colorPrimario = "#e2e8f0"} = config;
  return (
    <>
      <div className="plg-bg absolute inset-0" />
      <div
        className="plg-line absolute left-[8%] right-[8%] top-[10%] h-[2px] origin-center"
        style={{backgroundColor: colorAccento}}
      />
      <div
        className="plg-line absolute left-[8%] right-[8%] bottom-[10%] h-[2px] origin-center"
        style={{backgroundColor: colorAccento}}
      />
      {[
        ["top-[7%] left-[5%]", "border-t-2 border-l-2"],
        ["top-[7%] right-[5%]", "border-t-2 border-r-2"],
        ["bottom-[7%] left-[5%]", "border-b-2 border-l-2"],
        ["bottom-[7%] right-[5%]", "border-b-2 border-r-2"],
      ].map(([pos, cls], i) => (
        <div
          key={`corner-${i}`}
          className={`plg-corner absolute ${pos} size-10 ${cls}`}
          style={{borderColor: colorAccento}}
        />
      ))}
      <TextoAuto
        texto={texto}
        titulo={titulo}
        colorTexto={colorPrimario}
        colorTitulo={colorAccento}
        colorAccento={colorAccento}
      />
    </>
  );
}

function EstructuraNeon({titulo, texto, config}) {
  const {colorAccento = "#00f5ff", colorPrimario = "#ffffff"} = config;
  return (
    <>
      <div className="plg-bg absolute inset-0" />
      <div
        className="plg-scanlines absolute inset-0 pointer-events-none opacity-10"
        style={{
          background:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.3) 2px,rgba(0,0,0,0.3) 4px)",
        }}
      />
      <div
        className="plg-neon-box absolute inset-[6%] border-[3px] rounded-sm"
        style={{borderColor: colorAccento, scaleX: 0, scaleY: 0}}
      />
      <TextoAuto
        texto={texto}
        titulo={titulo}
        colorTexto={colorPrimario}
        colorTitulo={colorAccento}
        colorAccento={null}
      />
    </>
  );
}

function EstructuraIglesia({titulo, texto, config}) {
  const {colorAccento = "#f59e0b", colorPrimario = "#fde68a"} = config;
  return (
    <>
      <div
        className="plg-bg absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at center, rgba(255,220,100,0.04) 0%, transparent 70%)",
        }}
      />
      <div className="plg-velo absolute inset-0" />
      <div
        className="plg-ornamento absolute top-[4%] left-1/2 -translate-x-1/2 text-4xl select-none"
        style={{color: colorAccento}}
      >
        ✝
      </div>
      <div
        className="plg-ornline absolute top-[14%] left-[12%] right-[12%] h-px origin-center"
        style={{backgroundColor: colorAccento}}
      />
      <div
        className="plg-ornline absolute bottom-[8%] left-[12%] right-[12%] h-px origin-center"
        style={{backgroundColor: colorAccento}}
      />
      <TextoAuto
        texto={texto}
        titulo={titulo}
        colorTexto={colorPrimario}
        colorTitulo={colorAccento}
        colorAccento={null}
      />
    </>
  );
}

function EstructuraCinematica({titulo, texto, config}) {
  const {colorAccento = "#818cf8", colorPrimario = "#e0e7ff"} = config;
  return (
    <>
      <div className="plg-bg absolute inset-0" />
      <div
        className="plg-grad absolute inset-0 pointer-events-none"
        style={{backgroundSize: "300% 300%"}}
      />
      <div className="plg-barra absolute top-0 left-0 right-0 h-[7%]" />
      <div className="plg-barra absolute bottom-0 left-0 right-0 h-[7%]" />
      <div
        className="plg-linelat absolute left-[7%] top-[10%] bottom-[10%] w-1"
        style={{backgroundColor: colorAccento}}
      />
      <TextoAuto
        texto={texto}
        titulo={titulo}
        colorTexto={colorPrimario}
        colorTitulo={colorAccento}
        colorAccento={null}
        extraClass="pl-[4%]"
      />
    </>
  );
}

function EstructuraParticulas({titulo, texto, config}) {
  const {colorAccento = "#34d399", colorPrimario = "#d1fae5"} = config;
  return (
    <>
      <div className="plg-bg absolute inset-0" />
      {Array.from({length: 18}).map((_, i) => (
        <div
          key={`particula-${i}`}
          className="plg-particula absolute size-1.5 rounded-full pointer-events-none"
        />
      ))}
      <div
        className="plg-halo absolute inset-[18%] rounded-full border-2 pointer-events-none"
        style={{borderColor: colorAccento}}
      />
      <TextoAuto
        texto={texto}
        titulo={titulo}
        colorTexto={colorPrimario}
        colorTitulo={colorAccento}
        colorAccento={colorAccento}
      />
    </>
  );
}

const ESTRUCTURAS = {
  revelar: EstructuraRevelar,
  neon: EstructuraNeon,
  iglesia: EstructuraIglesia,
  cinematica: EstructuraCinematica,
  particulas: EstructuraParticulas,
  gloria: EstructuraGloria,
  aurora: EstructuraAurora,
  minimal: EstructuraMinimal,
  majestad: EstructuraMajestad,
  olas: EstructuraOlas,
};

// ────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ────────────────────────────────────────────────────────────────────────────
export default function PlantillaGSAP({
  titulo,
  texto,
  plantillaId = "revelar",
  config = {},
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
      gsap.killTweensOf(containerRef.current.querySelectorAll("*"));
      gsap.set(containerRef.current.querySelectorAll("*"), {clearProps: "all"});
      animar(ctx, config, velocidad);
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
      ".plg-texto, .plg-titulo, .plg-divisor",
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

  const Estructura = ESTRUCTURAS[plantillaId] || ESTRUCTURAS.revelar;

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden flex items-center justify-center"
    >
      <Estructura titulo={titulo} texto={texto} config={config} />
    </div>
  );
}
