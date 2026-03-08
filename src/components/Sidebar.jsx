import {Link, useLocation} from "react-router-dom";
import {
  FaHome,
  FaMusic,
  FaBook,
  FaTv,
  FaStar,
  FaBars,
  FaTimes,
  FaPlus,
  FaBookOpen,
  FaUser,
  FaVial,
  FaDev,
} from "react-icons/fa";

const menuItems = [
  {path: "/", icon: <FaHome />, label: "Inicio", color: "text-orange-500"},
  {
    path: "/himnos",
    icon: <FaMusic />,
    label: "Himnario Moravo",
    color: "text-green-400",
  },
  {
    path: "/vida-cristiana",
    icon: <FaBookOpen />,
    label: "Vida Cristiana",
    color: "text-fuchsia-300",
  },
  {
    path: "/agregar-himno",
    icon: <FaPlus />,
    label: "Agregar Himno",
    color: "text-orange-300",
  },
  {
    path: "/biblia",
    icon: <FaBook />,
    label: "Biblia",
    color: "text-purple-400",
  },
  {
    path: "/presentaciones",
    icon: <FaTv />,
    label: "Presentaciones",
    color: "text-yellow-500",
  },
  {
    path: "/favoritos",
    icon: <FaStar />,
    label: "Favoritos",
    color: "text-blue-400",
  },
  // COntactos
  {
    path: "/contactos",
    icon: <FaUser />,
    label: "Contactos",
    color: "text-cian-600",
  },

  //Versión beta
  {
    icon: <FaDev />,
    label: "Versión 1.0.0",
    color: "text-brown-500",
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
          <div className="flex-grow flex items-center justify-center  p-2">
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

      {/* Menú */}
      {menuItems.map((item) => {
        const content = (
          <>
            <span className={`${item.color} text-xl`}>{item.icon}</span>
            {!isCollapsed && <span className="text-sm">{item.label}</span>}
            {isCollapsed && (
              <span className="sr-only group-hover:not-sr-only absolute left-16 bg-black text-xs px-2 py-1 rounded z-50">
                {item.label}
              </span>
            )}
          </>
        );

        if (!item.path) {
          return (
            <div
              key={item.label}
              className="group flex items-center gap-3 p-2 rounded text-gray-400 cursor-default"
              aria-label={item.label}
            >
              {content}
            </div>
          );
        }

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`group flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition-colors ${
              location.pathname === item.path ? "bg-gray-700" : ""
            }`}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
};

export default Sidebar;
