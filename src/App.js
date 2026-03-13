// src/App.jsx
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
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
import AppMovil from "./pages/AppMovil";
import { MediaPlayerProvider } from "./contexts/MediaPlayerContext";
import GlobalMediaPlayer from "./components/GlobalMediaPlayer";
import librosDeLaBiblia from "./utils/libros";
import { cargarLibro } from "./utils/cargarLibro";

// Componente interno para manejar la navegación
function AppContent() {
  const navigate = useNavigate();

  useEffect(() => {
    // Migración 1 vez: favoritos antiguos (localStorage) -> backend (SQLite/config)
    // Esto hace que el estado sea el mismo en escritorio y móvil.
    const API_BASE = "http://localhost:3001";

    const migrarKey = async ({
      storageKey,
      migradoKey,
      tipo,
    }) => {
      try {
        if (localStorage.getItem(migradoKey) === "1") return;

        const raw = localStorage.getItem(storageKey) || "[]";
        const numeros = JSON.parse(raw);
        if (!Array.isArray(numeros) || numeros.length === 0) {
          localStorage.setItem(migradoKey, "1");
          return;
        }

        // Enviar al backend como IDs base:<tipo>:<numero>
        for (const n of numeros) {
          const numero = String(n ?? "").trim();
          if (!numero) continue;

          const id = `base:${tipo}:${numero}`;
          try {
            const res = await fetch(
              `${API_BASE}/api/himnos/${encodeURIComponent(id)}/favorito`,
              {
                method: "POST",
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ favorito: true }),
              },
            );
            const json = await res.json().catch(() => null);
            if (!res.ok || !json?.ok) {
              // No abortar toda la migración por un himno
              console.warn("⚠️ [Migración favoritos] Falló", id, json);
            }
          } catch (err) {
            console.warn("⚠️ [Migración favoritos] Error", id, err);
          }
        }

        localStorage.setItem(migradoKey, "1");
      } catch (err) {
        // Si hay error, no marcamos como migrado para reintentar luego.
        console.warn("⚠️ [Migración favoritos] No completada:", storageKey, err);
      }
    };

    (async () => {
      await migrarKey({
        storageKey: "himnosFavoritos",
        migradoKey: "himnosFavoritos:migrado:v2",
        tipo: "moravo",
      });
      await migrarKey({
        storageKey: "himnosVidaCristianaFavoritos",
        migradoKey: "himnosVidaCristianaFavoritos:migrado:v2",
        tipo: "vida",
      });
    })();
  }, []);

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

  useEffect(() => {
    const handleControlBibliaProyectar = async (event, payload) => {
      try {
        const libroId = typeof payload?.libroId === "string" ? payload.libroId : "";
        const capitulo = Number(payload?.capitulo);
        const versiculo = Number(payload?.versiculo);

        if (!libroId || !Number.isFinite(capitulo) || !Number.isFinite(versiculo)) {
          console.warn("⚠️ [App] Payload inválido para control Biblia:", payload);
          return;
        }

        const todosLosLibros = [
          ...librosDeLaBiblia.antiguoTestamento,
          ...librosDeLaBiblia.nuevoTestamento,
        ];
        const libro = todosLosLibros.find((l) => l.id === libroId);
        const nombreLibro = libro?.nombre || libroId;

        const data = await cargarLibro(libroId);
        const capIndex = capitulo - 1;
        const verIndex = versiculo - 1;

        const versiculosCapitulo = Array.isArray(data) ? data[capIndex] : null;
        const capOk = Array.isArray(versiculosCapitulo);
        const textoActual = capOk ? versiculosCapitulo[verIndex] : null;
        const texto = typeof textoActual === "string" && textoActual.trim() ? textoActual : "No disponible";

        if (!window.electron?.enviarVersiculo) {
          console.warn("⚠️ [App] window.electron.enviarVersiculo no disponible");
          return;
        }

        window.electron.enviarVersiculo({
          parrafo: texto,
          titulo: nombreLibro,
          numero: `${capitulo}:${versiculo}`,
          origen: "biblia",
        });
      } catch (error) {
        console.error("❌ [App] Error control Biblia:", error);
      }
    };

    if (window.electron?.on) {
      window.electron.on("control-biblia-proyectar", handleControlBibliaProyectar);
    }

    return () => {
      if (window.electron?.removeAllListeners) {
        window.electron.removeAllListeners("control-biblia-proyectar");
      }
    };
  }, []);

  useEffect(() => {
    const handleControlBibliaPreview = async (event, payload) => {
      const id = payload?.id;
      try {
        const libroId = typeof payload?.libroId === "string" ? payload.libroId : "";
        const capitulo = Number(payload?.capitulo);
        const versiculo = Number(payload?.versiculo);

        if (!id || !libroId || !Number.isFinite(capitulo) || !Number.isFinite(versiculo)) {
          return;
        }

        const todosLosLibros = [
          ...librosDeLaBiblia.antiguoTestamento,
          ...librosDeLaBiblia.nuevoTestamento,
        ];
        const libro = todosLosLibros.find((l) => l.id === libroId);
        const nombreLibro = libro?.nombre || libroId;

        const data = await cargarLibro(libroId);
        const capIndex = capitulo - 1;
        const verIndex = versiculo - 1;
        const versiculosCapitulo = Array.isArray(data) ? data[capIndex] : null;
        const capOk = Array.isArray(versiculosCapitulo);

        const textoAnterior = capOk && verIndex - 1 >= 0 ? versiculosCapitulo[verIndex - 1] : null;
        const textoActual = capOk ? versiculosCapitulo[verIndex] : null;
        const textoPosterior = capOk ? versiculosCapitulo[verIndex + 1] : null;

        const respuesta = {
          libroId,
          nombreLibro,
          capitulo,
          versiculo,
          prev:
            typeof textoAnterior === "string" && textoAnterior.trim()
              ? { numero: versiculo - 1, texto: textoAnterior }
              : null,
          current:
            typeof textoActual === "string" && textoActual.trim()
              ? { numero: versiculo, texto: textoActual }
              : { numero: versiculo, texto: null },
          next:
            typeof textoPosterior === "string" && textoPosterior.trim()
              ? { numero: versiculo + 1, texto: textoPosterior }
              : null,
        };

        if (window.electron?.send) {
          window.electron.send('control-biblia-preview-response', {
            id,
            ok: true,
            data: respuesta,
          });
        }
      } catch (error) {
        if (window.electron?.send && id) {
          window.electron.send('control-biblia-preview-response', {
            id,
            ok: false,
            error: error?.message || 'Error generando vista previa',
          });
        }
      }
    };

    if (window.electron?.on) {
      window.electron.on('control-biblia-preview', handleControlBibliaPreview);
    }

    return () => {
      if (window.electron?.removeAllListeners) {
        window.electron.removeAllListeners('control-biblia-preview');
      }
    };
  }, []);

  return null; // Este componente no renderiza nada
}

// Componente para el layout principal que adapta el padding según la ruta
function MainLayout() {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Para la página de inicio y multimedia, no aplicar padding top adicional
  const isInicio = location.pathname === '/';
  const isMultimedia = location.pathname === '/multimedia';

  const mainClasses = isInicio
    ? `flex-1 overflow-hidden bg-gray-800 transition-all duration-300`
    : isMultimedia
      ? `flex-1 overflow-hidden bg-gray-800 p-2 lg:p-3 xl:p-4 transition-all duration-300`
      : `flex-1 overflow-y-auto bg-gray-800 p-2 lg:p-3 xl:p-4 2xl:p-5 transition-all duration-300`;

  return (
    <div className="flex h-screen">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <main className={mainClasses}>
        {/* Header para todas las páginas excepto Inicio */}
        {!isInicio && !isMultimedia && <Header />}
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
          <Route path="/app-movil" element={<AppMovil />} />
          <Route path="/multimedia" element={<Multimedia />} />
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
