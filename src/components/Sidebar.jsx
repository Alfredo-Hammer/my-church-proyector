import {Link, useLocation} from "react-router-dom";
import {
  FaHome,
  FaMusic,
  FaStar,
  FaBars,
  FaTimes,
  FaPlus,
  FaBookOpen,
  FaMobileAlt,
  FaVial,
  FaDev,
  FaSteam,
  FaPlay,
  FaImage,
  FaBook,
  FaChevronRight,
} from "react-icons/fa";

const menuItems = [
  {id: "inicio",         path: "/",              icon: <FaHome />,      label: "Inicio"},
  {id: "himnos",         path: "/himnos",         icon: <FaMusic />,     label: "Himnario Moravo"},
  {id: "vida-cristiana", path: "/vida-cristiana", icon: <FaBookOpen />,  label: "Vida Cristiana"},
  {id: "agregar-himno",  path: "/agregar-himno",  icon: <FaPlus />,      label: "Agregar Himno"},
  {id: "biblia",         path: "/biblia",         icon: <FaBook />,      label: "Biblia"},
  {id: "multimedia",     path: "/multimedia",     icon: <FaPlay />,      label: "Fuentes Multimedia"},
  {id: "gestion-fondos", path: "/gestion-fondos", icon: <FaImage />,     label: "Gestión de Fondos"},
  {id: "favoritos",      path: "/favoritos",      icon: <FaStar />,      label: "Favoritos"},
  {id: "app-movil",      path: "/app-movil",      icon: <FaMobileAlt />, label: "App móvil"},
  {id: "configuracion",  path: "/configuracion",  icon: <FaVial />,      label: "Configuración"},
  {id: "contactos",      path: "/contactos",      icon: <FaSteam />,     label: "Soporte"},
  {id: "version", icon: <FaDev />, label: "Versión 1.0.0", isLabel: true},
];

const Sidebar = ({isCollapsed, setIsCollapsed}) => {
  const location = useLocation();

  return (
    <div
      className={`${
        isCollapsed ? "w-[60px]" : "w-52 lg:w-56 xl:w-60"
      } h-screen bg-gray-950 text-white flex flex-col transition-all duration-300 shrink-0 border-r border-white/6 relative z-40`}
    >
      {/* ── HEADER ── */}
      <div
        className={`flex items-center border-b border-white/6 shrink-0 ${
          isCollapsed ? "justify-center px-0 py-3" : "justify-between px-3 py-3"
        }`}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="/images/icon-256.png"
              alt="GloryView"
              className="w-8 h-8 rounded-lg object-contain shrink-0"
              draggable={false}
            />
            <h1 className="text-sm font-semibold tracking-wide text-gray-100 truncate">
              GloryView
            </h1>
          </div>
        )}

        {isCollapsed && (
          <img
            src="/images/icon-256.png"
            alt="GloryView"
            className="w-8 h-8 rounded-lg object-contain"
            draggable={false}
          />
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`shrink-0 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/12 border border-white/8 flex items-center justify-center transition-colors text-gray-400 hover:text-white ${
            isCollapsed ? "absolute -right-3 top-4 bg-gray-900 border-white/15 shadow-lg" : ""
          }`}
          aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {isCollapsed
            ? <FaChevronRight className="text-[10px]" />
            : <FaTimes className="text-[10px]" />}
        </button>
      </div>

      {/* ── NAVEGACIÓN ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5">
        {menuItems.map((item) => {
          if (item.isLabel) {
            return (
              <div
                key={item.id}
                className={`group relative flex items-center rounded-lg opacity-50 cursor-default mt-2 ${
                  isCollapsed ? "justify-center px-0 py-2" : "gap-3 px-2 py-2"
                }`}
              >
                <span className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-white/4 border border-white/6 text-gray-500 text-sm">
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="text-[10px] text-gray-500 leading-tight truncate">
                    {item.label}
                  </span>
                )}
                {isCollapsed && (
                  <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 border border-white/10 rounded-lg text-xs text-gray-300 whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                    {item.label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                  </div>
                )}
              </div>
            );
          }

          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`group relative flex items-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
                isCollapsed ? "justify-center px-0 py-2" : "gap-3 px-2 py-2"
              } ${
                isActive
                  ? "bg-indigo-500/15 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/6"
              }`}
            >
              {/* Indicador activo */}
              {isActive && (
                <span className={`absolute ${isCollapsed ? "left-0" : "left-0"} top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-r-full`} />
              )}

              {/* Icono */}
              <span
                className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border text-base transition-all ${
                  isActive
                    ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                    : "bg-white/4 border-white/6 text-gray-400 group-hover:bg-white/8 group-hover:border-white/10 group-hover:text-gray-200"
                }`}
              >
                {item.icon}
              </span>

              {/* Label (expandido) */}
              {!isCollapsed && (
                <span
                  className={`text-[11px] xl:text-xs leading-tight truncate ${
                    isActive ? "font-semibold text-white" : ""
                  }`}
                >
                  {item.label}
                </span>
              )}

              {/* Tooltip (colapsado) */}
              {isCollapsed && (
                <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 border border-white/10 rounded-lg text-xs text-gray-200 whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
