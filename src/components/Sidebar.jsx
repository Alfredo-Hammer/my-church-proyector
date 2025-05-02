import {Link} from "react-router-dom";
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
} from "react-icons/fa";

const Sidebar = ({isCollapsed, setIsCollapsed}) => {
  return (
    <div
      className={`${
        isCollapsed ? "w-20" : "w-60"
      } h-screen bg-gray-800 text-white flex flex-col p-4 space-y-4 transition-all duration-300 shrink-0`}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-2xl font-bold ${isCollapsed ? "hidden" : ""}`}>
          Mi Iglesia
        </h2>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-2xl"
        >
          {isCollapsed ? <FaBars /> : <FaTimes />}
        </button>
      </div>

      <Link
        to="/"
        className="hover:bg-gray-700 p-2 rounded flex items-center gap-2"
      >
        <FaHome className="text-xl text-orange-500" />
        {!isCollapsed && <span>Inicio</span>}
      </Link>
      <Link
        to="/himnos"
        className="hover:bg-gray-700 p-2 rounded flex items-center gap-2"
      >
        <FaMusic className="text-xl text-green-400 " />
        {!isCollapsed && <span>Himnario Moravo</span>}
      </Link>

      <Link
        to="/vida-cristiana"
        className="hover:bg-gray-700 p-2 rounded flex items-center gap-2"
      >
        <FaBookOpen className="text-xl text-fuchsia-300" />
        {!isCollapsed && <span>Vida Cristiana</span>}
      </Link>

      <Link
        to="/agregar-himno"
        className="hover:bg-gray-700 p-2 rounded flex items-center gap-2"
      >
        <FaPlus className="text-xl text-orange-300" />
        {!isCollapsed && <span>Agregar Himno</span>}
      </Link>
      <Link
        to="/biblia"
        className="hover:bg-gray-700 p-2 rounded flex items-center gap-2"
      >
        <FaBook className="text-xl text-purple-400" />
        {!isCollapsed && <span>Biblia</span>}
      </Link>
      <Link
        to="/presentaciones"
        className="hover:bg-gray-700 p-2 rounded flex items-center gap-2"
      >
        <FaTv className="text-xl text-yellow-500" />
        {!isCollapsed && <span>Presentaciones</span>}
      </Link>
      <Link
        to="/favoritos"
        className="hover:bg-gray-700 p-2 rounded flex items-center gap-2"
      >
        <FaStar className="text-xl text-blue-400" />
        {!isCollapsed && <span>Favoritos</span>}
      </Link>
    </div>
  );
};

export default Sidebar;
