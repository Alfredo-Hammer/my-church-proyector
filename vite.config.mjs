// Vite (reemplaza a react-scripts / Create React App desde nov 2026).
// - Salida en build/ (electron-builder la copia como extraResources y Express la sirve en :3001).
// - base "./" = "homepage": "." de CRA: rutas relativas a los archivos.
// - Desarrollo en el puerto 3000 (main.js carga http://localhost:3000 en modo dev).
// - Variables de entorno: se aceptan las REACT_APP_* de siempre (CI: secreto PIXABAY_API_KEY →
//   REACT_APP_PIXABAY_API_KEY) y se leen con import.meta.env.REACT_APP_*.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  envPrefix: ["VITE_", "REACT_APP_"],
  server: { port: 3000, strictPort: true },
  build: {
    outDir: "build",
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{js,jsx}"],
    setupFiles: ["src/setupTests.js"],
  },
});
