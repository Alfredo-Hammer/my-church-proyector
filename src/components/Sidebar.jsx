import {Link, useLocation} from "react-router-dom";
import {
  FaHome,
  FaMusic,
  FaBook,
  FaStar,
  FaBars,
  FaTimes,
  FaPlus,
  FaBookOpen,
  FaVial,
  FaDev,
  FaSteam,
  FaPlay,
  FaFile,
  FaImage,
} from "react-icons/fa";

const menuItems = [
  {
    id: "inicio",
    path: "/",
    icon: <FaHome />,
    label: "Inicio",
    color: "text-orange-500",
  },
  {
    id: "himnos",
    path: "/himnos",
    icon: <FaMusic />,
    label: "Himnario Moravo",
    color: "text-green-400",
  },
  {
    id: "vida-cristiana",
    path: "/vida-cristiana",
    icon: <FaBookOpen />,
    label: "Vida Cristiana",
    color: "text-fuchsia-300",
  },
  {
    id: "agregar-himno",
    path: "/agregar-himno",
    icon: <FaPlus />,
    label: "Agregar Himno",
    color: "text-orange-300",
  },
  {
    id: "biblia",
    path: "/biblia",
    icon: <FaBook />,
    label: "Biblia",
    color: "text-purple-400",
  },
  // ✨ NUEVA OPCIÓN PARA PRESENTACIONES
  {
    id: "presentaciones",
    path: "/presentacion-manager",
    icon: <FaFile />,
    label: "Presentaciones",
    color: "text-cyan-400",
  },
  {
    id: "multimedia",
    path: "/multimedia",
    icon: <FaPlay />,
    label: "Fuentes Multimedia",
    color: "text-red-500",
  },
  {
    id: "gestion-fondos",
    path: "/gestion-fondos",
    icon: <FaImage />,
    label: "Gestión de Fondos",
    color: "text-indigo-400",
  },
  {
    id: "favoritos",
    path: "/favoritos",
    icon: <FaStar />,
    label: "Favoritos",
    color: "text-blue-400",
  },
  {
    id: "configuracion",
    path: "/configuracion",
    icon: <FaVial />,
    label: "Configuración",
    color: "text-pink-500",
  },
  {
    id: "contactos",
    path: "/contactos",
    icon: <FaSteam />,
    label: "Soporte",
    color: "text-yellow-500",
  },
  {
    id: "version",
    icon: <FaDev />,
    label: "Versión 1.0.0",
    color: "text-brown-500",
    isLabel: true,
  },
];

const Sidebar = ({isCollapsed, setIsCollapsed}) => {
  const location = useLocation();

  return (
    <div
      className={`${
        isCollapsed ? "w-16" : "w-60"
      } h-screen bg-gray-900 text-white flex flex-col p-4 space-y-6 transition-all duration-300 shrink-0 border-r border-gray-700`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        {!isCollapsed && (
          <div className="flex-grow flex items-center justify-center p-2">
            <h1 className="text-2xl font-extrabold text-white tracking-wide">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
                Glory
              </span>
              <span className="ml-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500">
                View
              </span>
            </h1>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-xl"
        >
          {isCollapsed ? <FaBars /> : <FaTimes />}
        </button>
      </div>

      {/* Menú - ✨ USAR ID COMO KEY Y MANEJAR ELEMENTOS SIN PATH */}
      {menuItems.map((item) => {
        // ✨ SI ES SOLO UNA ETIQUETA (como versión), renderizar diferente
        if (item.isLabel) {
          return (
            <div
              key={item.id} // ✨ USAR ID COMO KEY
              className="group flex items-center gap-3 p-2 rounded opacity-60 cursor-default"
            >
              <span className={`${item.color} text-xl`}>{item.icon}</span>
              {!isCollapsed && (
                <span className="text-xs text-gray-400">{item.label}</span>
              )}
              {isCollapsed && (
                <span className="sr-only group-hover:not-sr-only absolute left-16 bg-black text-xs px-2 py-1 rounded z-50">
                  {item.label}
                </span>
              )}
            </div>
          );
        }

        // ✨ ELEMENTOS NORMALES CON LINK
        return (
          <Link
            key={item.id} // ✨ USAR ID COMO KEY
            to={item.path}
            className={`group flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition-colors ${
              location.pathname === item.path ? "bg-gray-700" : ""
            }`}
          >
            <span className={`${item.color} text-xl`}>{item.icon}</span>
            {!isCollapsed && <span className="text-sm">{item.label}</span>}
            {isCollapsed && (
              <span className="sr-only group-hover:not-sr-only absolute left-16 bg-black text-xs px-2 py-1 rounded z-50">
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
};

export default Sidebar;
