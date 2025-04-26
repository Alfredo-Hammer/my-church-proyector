// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Biblia from "./pages/Biblia";
import Himnos from "./pages/Himnos";
import Presentaciones from "./pages/Presentaciones";
import Favoritos from "./pages/Favoritos";
import HimnoDetalle from "./pages/HimnoDetalle";
import Proyector from "./pages/Proyector";
import { useState } from "react";
import GestionFondos from "./pages/GestionFondos";
import Inicio from "./pages/Inicio";
import AgregarHimno from "./pages/AgregarHimno";

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <Router>
      <Routes>
        {/* Ruta especial para el proyector, sin sidebar */}
        <Route path="/proyector" element={<Proyector />} />
        {/* Ruta para la gestión de fondos */}
        <Route path="/gestion-fondos" element={<GestionFondos />} />

        {/* Layout principal con sidebar */}
        <Route
          path="/*"
          element={
            <div className="flex h-screen">
              <Sidebar
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
              />
              <main
                className={`flex-1 overflow-y-auto bg-gray-100 p-4 transition-all duration-300`}
              >
                <Routes>
                  <Route path="/" element={<Inicio />} />
                  <Route path="/biblia" element={<Biblia />} />
                  <Route path="/himnos" element={<Himnos />} />
                  <Route path="/presentaciones" element={<Presentaciones />} />
                  <Route path="/favoritos" element={<Favoritos />} />
                  <Route path="/himno-detalle/:id" element={<HimnoDetalle />} />
                  <Route path="/himno/:numero" element={<HimnoDetalle />} />
                  <Route path="/agregar-himno" element={<AgregarHimno />} />
                </Routes>
              </main>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
