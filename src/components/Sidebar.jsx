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
} from "react-icons/fa";

const menuItems = [
  {
    id: "inicio",
    path: "/",
    icon: <FaHome />,
    label: "Inicio",
  },
  {
    id: "himnos",
    path: "/himnos",
    icon: <FaMusic />,
    label: "Himnario Moravo",
  },
  {
    id: "vida-cristiana",
    path: "/vida-cristiana",
    icon: <FaBookOpen />,
    label: "Vida Cristiana",
  },
  {
    id: "agregar-himno",
    path: "/agregar-himno",
    icon: <FaPlus />,
    label: "Agregar Himno",
  },
  {
    id: "biblia",
    path: "/biblia",
    icon: <FaBook />,
    label: "Biblia",
  },
  {
    id: "multimedia",
    path: "/multimedia",
    icon: <FaPlay />,
    label: "Fuentes Multimedia",
  },
  {
    id: "gestion-fondos",
    path: "/gestion-fondos",
    icon: <FaImage />,
    label: "Gestión de Fondos",
  },
  {
    id: "favoritos",
    path: "/favoritos",
    icon: <FaStar />,
    label: "Favoritos",
  },
  {
    id: "app-movil",
    path: "/app-movil",
    icon: <FaMobileAlt />,
    label: "App móvil",
  },
  {
    id: "configuracion",
    path: "/configuracion",
    icon: <FaVial />,
    label: "Configuración",
  },
  {
    id: "contactos",
    path: "/contactos",
    icon: <FaSteam />,
    label: "Soporte",
  },
  {
    id: "version",
    icon: <FaDev />,
    label: "Versión 1.0.0",
    isLabel: true,
  },
];

const Sidebar = ({isCollapsed, setIsCollapsed}) => {
  const location = useLocation();

  return (
    <div
      className={`${
        isCollapsed ? "w-16" : "w-60"
      } h-screen bg-gray-950 text-white flex flex-col p-3 transition-all duration-300 shrink-0 border-r border-gray-800`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 pt-1 pb-2">
        {!isCollapsed && (
          <div className="flex-grow flex items-center justify-center py-2">
            <div className="flex items-center gap-2">
              <img
                src="/images/icon-256.png"
                alt="GloryView"
                className="w-9 h-9 rounded-md object-contain"
                draggable={false}
              />
              <h1 className="text-lg font-semibold tracking-wide text-gray-100">
                GloryView
              </h1>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-lg text-gray-300 hover:text-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded"
          aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {isCollapsed ? <FaBars /> : <FaTimes />}
        </button>
      </div>

      <div className="h-px bg-gray-800 mx-2" />

      {/* Menú - ✨ USAR ID COMO KEY Y MANEJAR ELEMENTOS SIN PATH */}
      <nav className="flex-1 pt-2 space-y-2">
        {menuItems.map((item) => {
          // ✨ SI ES SOLO UNA ETIQUETA (como versión), renderizar diferente
          if (item.isLabel) {
            return (
              <div
                key={item.id} // ✨ USAR ID COMO KEY
                className="group relative flex items-center gap-3 px-3 py-2.5 rounded opacity-60 cursor-default"
              >
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-700 bg-gradient-to-br from-indigo-900/35 via-gray-900 to-gray-950">
                  <span className="text-lg text-gray-400">{item.icon}</span>
                </span>
                {!isCollapsed && (
                  <span className="text-xs text-gray-400">{item.label}</span>
                )}
                {isCollapsed && (
                  <span className="sr-only group-hover:not-sr-only absolute left-16 bg-gray-900 text-xs px-2 py-1 rounded border border-gray-800 z-50 whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </div>
            );
          }

          const isActive = location.pathname === item.path;

          // ✨ ELEMENTOS NORMALES CON LINK
          return (
            <Link
              key={item.id} // ✨ USAR ID COMO KEY
              to={item.path}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
                isActive
                  ? "bg-gray-900 text-gray-100"
                  : "text-gray-300 hover:text-gray-100 hover:bg-gray-900"
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-9 h-9 rounded-md border transition-colors bg-gradient-to-br ${
                  isActive
                    ? "from-indigo-800/45 via-gray-900 to-gray-950 border-indigo-900/40"
                    : "from-indigo-900/30 via-gray-900 to-gray-950 border-gray-700 group-hover:from-indigo-800/45 group-hover:via-gray-900 group-hover:to-gray-950 group-hover:border-indigo-900/40"
                }`}
              >
                <span
                  className={`text-lg transition-colors ${
                    isActive
                      ? "text-gray-100"
                      : "text-gray-400 group-hover:text-gray-100"
                  }`}
                >
                  {item.icon}
                </span>
              </span>
              {!isCollapsed && (
                <span className={`text-sm ${isActive ? "font-medium" : ""}`}>
                  {item.label}
                </span>
              )}
              {isCollapsed && (
                <span className="sr-only group-hover:not-sr-only absolute left-16 bg-gray-900 text-xs px-2 py-1 rounded border border-gray-800 z-50 whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
