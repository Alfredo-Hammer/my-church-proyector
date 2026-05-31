import {useCallback, useEffect, useRef, useState} from "react";
import {Link, useLocation} from "react-router-dom";
import {
  FaHome,
  FaMusic,
  FaStar,
  FaBookOpen,
  FaCog,
  FaList,
  FaPlay,
  FaImage,
  FaBook,
  FaChevronLeft,
  FaChevronRight,
  FaHeadset,
  FaBullhorn,
  FaClock,
  FaMagic,
  FaPlus,
  FaMobileAlt,
} from "react-icons/fa";

const COLLAPSED_W = 56;
const MIN_W = 180;
const MAX_W = 400;
const DEFAULT_W = 224;

const MENU = [
  {id: "sep-1", isSection: true, label: "Contenido"},
  {id: "inicio", path: "/", icon: <FaHome />, label: "Inicio"},
  {id: "himnos", path: "/himnos", icon: <FaMusic />, label: "Himnario Moravo"},
  {
    id: "vida-cristiana",
    path: "/vida-cristiana",
    icon: <FaBookOpen />,
    label: "Vida Cristiana",
  },
  {id: "biblia", path: "/biblia", icon: <FaBook />, label: "Biblia"},
  {id: "favoritos", path: "/favoritos", icon: <FaStar />, label: "Favoritos"},
  {
    id: "agregar-himno",
    path: "/agregar-himno",
    icon: <FaPlus />,
    label: "Agregar Himno",
  },

  {id: "sep-2", isSection: true, label: "Servicio"},
  {
    id: "presentaciones",
    path: "/presentaciones",
    icon: <FaList />,
    label: "Orden de Servicio",
  },
  {id: "anuncios", path: "/anuncios", icon: <FaBullhorn />, label: "Anuncios"},
  {
    id: "temporizador",
    path: "/temporizador",
    icon: <FaClock />,
    label: "Temporizador",
  },
  {
    id: "plantillas",
    path: "/plantillas",
    icon: <FaMagic />,
    label: "Plantillas",
  },

  {id: "sep-3", isSection: true, label: "Herramientas"},
  {
    id: "multimedia",
    path: "/multimedia",
    icon: <FaPlay />,
    label: "Multimedia",
  },
  {
    id: "gestion-fondos",
    path: "/gestion-fondos",
    icon: <FaImage />,
    label: "Gestión de Fondos",
  },
  {
    id: "app-movil",
    path: "/app-movil",
    icon: <FaMobileAlt />,
    label: "App Móvil",
  },
  {
    id: "configuracion",
    path: "/configuracion",
    icon: <FaCog />,
    label: "Configuración",
  },
  {id: "contactos", path: "/contactos", icon: <FaHeadset />, label: "Soporte"},
];

export default function Sidebar() {
  const location = useLocation();
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    window.electron
      ?.getAppVersion?.()
      .then((v) => setAppVersion(v || ""))
      .catch(() => {});
  }, []);

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true",
  );
  const [width, setWidth] = useState(() => {
    const v = parseInt(localStorage.getItem("sidebar-width") || "");
    return isNaN(v) ? DEFAULT_W : Math.max(MIN_W, Math.min(MAX_W, v));
  });
  const [resizing, setResizing] = useState(false);

  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  /* ── Toggle ── */
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  /* ── Resize drag ── */
  const onHandleDown = useCallback(
    (e) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startW.current = width;
      setResizing(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width],
  );

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const next = Math.max(
        MIN_W,
        Math.min(MAX_W, startW.current + e.clientX - startX.current),
      );
      setWidth(next);
    };
    const onUp = (e) => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setResizing(false);
      const final = Math.max(
        MIN_W,
        Math.min(MAX_W, startW.current + e.clientX - startX.current),
      );
      localStorage.setItem("sidebar-width", String(final));
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  const resetWidth = () => {
    setWidth(DEFAULT_W);
    localStorage.setItem("sidebar-width", String(DEFAULT_W));
  };

  const currentW = collapsed ? COLLAPSED_W : width;

  return (
    <aside
      style={{width: currentW}}
      className={`relative h-screen bg-[#0d0f14] text-white flex flex-col shrink-0 border-r border-white/[0.06] z-40 select-none
        ${!resizing ? "transition-[width] duration-200 ease-in-out" : ""}`}
    >
      {/* ── HEADER ── */}
      <div className="flex items-center h-11 px-2 shrink-0 border-b border-white/[0.06] gap-1.5">
        <div className="shrink-0 size-8 flex items-center justify-center">
          <img
            src="/images/icon-256.png"
            alt="GloryView"
            className="size-7 rounded-lg object-contain"
            draggable={false}
          />
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-[14px] font-bold text-white leading-none truncate">
              GloryView
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          className={`shrink-0 size-6 rounded-md flex items-center justify-center
            text-white/25 hover:text-white/70 hover:bg-white/8 transition-all
            ${collapsed ? "mx-auto" : ""}`}
        >
          {collapsed ? (
            <FaChevronRight className="text-[9px]" />
          ) : (
            <FaChevronLeft className="text-[9px]" />
          )}
        </button>
      </div>

      {/* ── NAVEGACIÓN ── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden p-1.5 space-y-px
        scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {MENU.map((item) => {
          /* Separador de sección */
          if (item.isSection) {
            return collapsed ? (
              <div key={item.id} className="my-2 mx-2 h-px bg-white/[0.07]" />
            ) : (
              <p
                key={item.id}
                className="text-[11px] uppercase tracking-widest font-bold text-white/30
                  px-2.5 pt-4 pb-1 first:pt-2 select-none"
              >
                {item.label}
              </p>
            );
          }

          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname === item.path ||
                location.pathname.startsWith(item.path + "/");

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`group relative flex items-center gap-2.5 rounded-lg h-9 transition-colors focus-visible:outline-none
                ${collapsed ? "justify-center px-0" : "px-2.5"}
                ${
                  isActive
                    ? "bg-indigo-500/[0.13] text-white"
                    : "text-white/50 hover:text-white/85 hover:bg-white/[0.055]"
                }`}
            >
              {/* Barra indicadora activa */}
              {isActive && (
                <span className="absolute left-0 top-[8px] bottom-[8px] w-[3px] bg-indigo-400 rounded-r-full" />
              )}

              {/* Icono */}
              <span
                className={`shrink-0 size-7 rounded-md flex items-center justify-center text-[13px] transition-colors
                ${
                  isActive
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "group-hover:bg-white/[0.07] group-hover:text-white/70"
                }`}
              >
                {item.icon}
              </span>

              {/* Label */}
              {!collapsed && (
                <span
                  className={`text-[13.5px] leading-none truncate
                  ${isActive ? "font-semibold text-white" : ""}`}
                >
                  {item.label}
                </span>
              )}

              {/* Tooltip en modo colapsado */}
              {collapsed && (
                <div
                  className="pointer-events-none absolute left-full ml-2 px-2.5 py-1.5
                  bg-[#1a1d24] border border-white/10 rounded-lg text-[13px] text-white/85
                  whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100
                  transition-opacity duration-100 z-[60]"
                >
                  {item.label}
                  <div
                    className="absolute right-full top-1/2 -translate-y-1/2
                    border-4 border-transparent border-r-[#1a1d24]"
                  />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── FOOTER ── */}
      <div
        className={`shrink-0 border-t border-white/[0.06] ${collapsed ? "py-2 flex justify-center" : "px-3 py-2"}`}
      >
        {collapsed ? (
          <span className="size-5 rounded-md bg-white/5 flex items-center justify-center text-white/20">
            <FaCog className="text-[9px]" />
          </span>
        ) : (
          <p className="text-[9px] text-white/18 text-center tracking-wide">
            GloryView © 2026{appVersion ? ` — v${appVersion}` : ""}
          </p>
        )}
      </div>

      {/* ── HANDLE DE REDIMENSIONADO ── */}
      {!collapsed && (
        <div
          onMouseDown={onHandleDown}
          onDoubleClick={resetWidth}
          title="Arrastrar para redimensionar · Doble clic para restablecer"
          className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-50 group/rh flex items-center justify-center"
          role="separator"
          aria-label="Redimensionar barra lateral"
        >
          {/* línea visual */}
          <div
            className={`h-full transition-all duration-150
            ${
              resizing
                ? "w-[2px] bg-indigo-500/70"
                : "w-px bg-white/[0.06] group-hover/rh:w-[2px] group-hover/rh:bg-indigo-500/45"
            }`}
          />
          {/* zona de agarre ampliada invisible */}
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>
      )}
    </aside>
  );
}
