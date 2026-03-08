// src/App.jsx
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Biblia from "./pages/Biblia";
import Himnos from "./pages/Himnos";
import Favoritos from "./pages/Favoritos";
import HimnoDetalle from "./pages/HimnoDetalle";
import Proyector from "./pages/Proyector";
import { useState, useEffect } from "react";
import GestionFondos from "./pages/GestionFondos";
import Contactos from "./pages/Contactos";
import Inicio from "./pages/Inicio";
import AgregarHimno from "./pages/AgregarHimno";
import Multimedia from './pages/Multimedia';
import HimnoVidaCristiana from "./pages/HimnoVidaCristiana";
import Configuracion from "./pages/Configuracion";
import PresentationManager from "./components/PresentationManager";
import { MediaPlayerProvider } from "./contexts/MediaPlayerContext";
import GlobalMediaPlayer from "./components/GlobalMediaPlayer";

// Componente interno para manejar la navegación
function AppContent() {
  const navigate = useNavigate();

  useEffect(() => {
    // Listener para navegación desde el menú de Electron
    const handleNavigation = (event, ruta) => {
      console.log("🧭 [App] Navegando a:", ruta);
      navigate(ruta);
    };

    if (window.electron?.on) {
      window.electron.on('navegar-a-ruta', handleNavigation);
    }

    return () => {
      if (window.electron?.removeAllListeners) {
        window.electron.removeAllListeners('navegar-a-ruta');
      }
    };
  }, [navigate]);

  return null; // Este componente no renderiza nada
}

// Componente para el layout principal que adapta el padding según la ruta
function MainLayout() {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Para la página de inicio, no aplicar padding
  const isInicio = location.pathname === '/';
  const mainClasses = isInicio
    ? `flex-1 overflow-hidden bg-gray-800 transition-all duration-300`
    : `flex-1 overflow-y-auto bg-gray-800 p-4 transition-all duration-300`;

  return (
    <div className="flex h-screen">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <main className={mainClasses}>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/biblia" element={<Biblia />} />
          <Route path="/himnos" element={<Himnos />} />
          <Route path="/vida-cristiana" element={<HimnoVidaCristiana />} />
          <Route path="/favoritos" element={<Favoritos />} />
          <Route path="/himno-detalle/:id" element={<HimnoDetalle />} />
          <Route path="/himno/:numero" element={<HimnoDetalle />} />
          <Route path="/agregar-himno" element={<AgregarHimno />} />
          <Route path="/contactos" element={<Contactos />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/multimedia" element={<Multimedia />} />
          <Route path="/presentacion-manager" element={<PresentationManager />} />
          <Route path="/gestion-fondos" element={<GestionFondos />} />
        </Routes>
      </main>
    </div>
  );
}


function App() {
  return (
    <MediaPlayerProvider>
      <Router>
        <AppContent />
        <Routes>
          {/* Ruta especial para el proyector, sin sidebar */}
          <Route path="/proyector" element={<Proyector />} />

          {/* Layout principal con sidebar y padding adaptable */}
          <Route path="/*" element={<MainLayout />} />
        </Routes>

        {/* Reproductor global que persiste entre navegaciones */}
        <GlobalMediaPlayer />
      </Router>
    </MediaPlayerProvider>
  );
}

export default App;
