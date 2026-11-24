# GloryView Proyector — CLAUDE.md

Aplicación de escritorio (Electron + React) para proyección en iglesias.
Gestiona himnos, versículos bíblicos, multimedia y presentaciones en una ventana principal,
con sincronización en tiempo real a una ventana proyectora separada.

---

## Comandos esenciales

```bash
# Desarrollo (iniciar ambos: React + Electron)
npm run electron-dev

# Solo servidor React (Vite en el puerto 3000, sin Electron)
npm start

# Compilar React → build/ (lo empaqueta electron-builder y lo sirve Express en :3001)
npm run build

# Build producción completo → dist-installer/
npm run build-exe

# Build solo Windows (.exe + portable)
npm run build-exe-win

# Reconstruir módulos nativos (better-sqlite3) después de cambiar versión de Electron
npm run rebuild

# Pruebas automáticas (correr antes de publicar)
npm test            # todo
npm run test:main   # db.js y datos de la Biblia (tests/, con el Node de Electron y base temporal)
npm run test:ui     # utilidades de React (src/**/*.test.js, Vitest — usar vi.fn, no jest.fn)
```

**Vite (desde nov 2026, antes Create React App):** la entrada es `index.html` en la raíz →
`src/index.jsx`. Archivos con JSX deben tener extensión `.jsx`. Variables de entorno: se leen con
`import.meta.env.REACT_APP_*` (no `process.env`; `envPrefix` acepta `REACT_APP_` y `VITE_`). Archivos
para pedir por URL (como el worker de pdf.js) se importan con `?url`. `base: "./"` = rutas relativas.

**Clave de Pixabay:** nunca en el código (el repo es público). Local: `.env.local`
(`REACT_APP_PIXABAY_API_KEY=…`, ignorado por git). CI: secreto de GitHub `PIXABAY_API_KEY`.
Cada iglesia puede poner la suya en Configuración → Apariencia (clave `pixabayApiKey`, tiene prioridad).

**Biblia:** una sola copia por versión: RV1960 en `public/data/biblia`, RV1909 (dominio público) en
`public/data/biblia_rv1909`. Cada libro es `export default <JSON>;` — lo leen igual la pantalla
(`src/utils/cargarLibro.js`, `fetch` + `JSON.parse`, sin eval por el CSP) y el servidor para la app móvil.
No volver a crear `src/data/biblia` (desde nov 2026; la prueba `biblia-datos` lo verifica) y si se
edita un libro, mantenerlo como JSON válido. Versión elegida: `src/utils/versionBiblia.js`
(localStorage + configuración `bibliaVersion`); la API `/api/biblia/*` acepta `?version=` y si no,
usa la de la compu (compatible con APKs viejos).

**Diapositivas → Importar PDF** (PowerPoint guardado como PDF): `src/utils/pdfADiapositivas.js`
con pdfjs-dist **3.11.174 fijo** y `isEvalSupported: false` siempre (CVE-2024-4367 / CSP sin eval).
Fuentes estándar en `public/pdfjs/standard_fonts`. Las imágenes se guardan con el IPC
`guardar-imagen-diapositiva` (valida JPEG/PNG y tamaño).

> **Nota:** El servidor Express interno corre en el puerto **3001** (no configurable aún).
> El servidor React dev corre en el puerto **3000**.

---

## 🎯 Últimas mejoras (Julio 2026)

### ✅ Texto chico en pantallas grandes (TV 65") — RESUELTO
**Síntoma**: El texto proyectado se veía chico en la pantalla real de la iglesia (TV 65") incluso con el tamaño configurado al máximo.  
**Causa**: Los tamaños de fuente del proyector eran px/rem fijos, calibrados implícitamente para una pantalla de referencia de 1920×1080 (la misma que asume el preview de `Configuracion.jsx`). `createProyectorWindow()` abre la ventana a la resolución NATIVA del monitor externo — en una pantalla 4K (2160 de alto, el doble de la referencia) el mismo px configurado ocupa la mitad de proporción de pantalla.  
**Solución**: `src/utils/pantallaScale.js` — `calcularEscalaFuente()` escala todos los tamaños según `window.innerHeight / 1080` (clamp 0.4–4). Aplicado en `ModernTextDisplay.jsx`, `PlantillaGSAP.jsx` y `ModernWelcomeScreen.jsx`. Ver sección completa más abajo.  
**Estado**: implementado y compilado, pendiente de confirmar en la pantalla real de la iglesia.

(La sección "Problema del texto pequeño" de mayo 2026 quedó superada por un rediseño del algoritmo de auto-sizing en `ModernTextDisplay.jsx` — ver la sección de abajo para el algoritmo actual, no el histórico.)

### 🔄 Sincronización en tiempo real
Los cambios en la página de **Configuración** se aplican **instantáneamente** al proyector:
- Sin necesidad de hacer clic en "Guardar cambios"
- Sin polling cada 5 segundos
- Usa eventos IPC `configuracion-actualizada` para notificación push
- Conversión automática entre claves planas (DB) ↔ anidadas (React)

### 📐 Auto-sizing inteligente
El algoritmo de búsqueda binaria asegura que **99.9% de textos** se ajusten perfectamente:
- Versículos normales: 80-120px
- Himnos estándar: 70-100px
- Títulos cortos: 120-160px
- Para textos extremadamente largos: usar función de auto-división (toggle en Configuración)

---

## Arquitectura

### Dos procesos Electron

| Proceso | Archivo | Descripción |
|---------|---------|-------------|
| Main | `main.js` | IPC handlers, Express server, ventanas, DB |
| Renderer principal | `src/` (React) | UI de control y gestión |
| Renderer proyector | `public/proyector.html` | Ventana de proyección (pantalla 2) |

### Orden de inicialización (app.whenReady)

**¡CRÍTICO!** El orden de inicialización es fundamental para que la app funcione en producción:

1. Configurar nombre de aplicación
2. Base de datos: no hay paso explícito — `db.js` se inicializa de forma síncrona al hacer `require("./db")` (conexión, tablas, migraciones, datos por defecto)
3. Inicializar fondos por defecto (y fondos animados por defecto)
4. Limpiar handlers IPC anteriores
5. Verificar integridad de archivos del build (solo producción)
6. Registrar todos los handlers IPC
7. **Iniciar servidor Express y esperar** (devuelve Promise) ← CRÍTICO
8. Esperar 2 segundos adicionales para estabilidad
9. Crear ventana principal (carga desde `http://localhost:3001` en producción)
10. Detectar y crear ventana proyector si hay segunda pantalla
11. Registrar atajos de teclado globales

**⚠️ NUNCA crear ventanas antes de que el servidor Express esté escuchando.** Esto causa pantalla blanca / app que no inicia en producción.

### Comunicación IPC

El flujo de datos siempre sigue este camino:

```
Renderer (React) → preload.js (contextBridge) → main.js (ipcMain.handle) → DB / proyector
```

- **`preload.js`** expone dos APIs: `window.electron` y `window.electronAPI` (alias para compatibilidad).
- Los métodos `invoke` y `send` genéricos tienen **whitelist de canales** — no agregar canales arbitrarios sin agregarlos a la lista.
- Los eventos entrantes al renderer usan `validChannels` en `on/removeListener/removeAllListeners`.
- **`window.electron.on()` devuelve la función para desuscribirse — usarla siempre** (`const off = window.electron.on(...); return () => off();`, o el hook `useIpcListener`). `removeListener(canal, fn)` **no funciona** a través de contextBridge (cada llamada recibe una copia nueva de `fn`); antes de nov 2026 los listeners se acumulaban (11 `navegar-a-ruta` tras navegar, handlers del proyector duplicados).

### Base de datos

- Motor: **better-sqlite3** (síncrono, sin pool de conexiones).
- Todo el esquema y las queries viven en `db.js` (archivo único; `db-new.js` se eliminó en la consolidación de julio 2026).
- **Todas las queries deben usar parámetros (`?`)** — nunca concatenar strings con datos del usuario.
- Tablas principales: `himnos`, `multimedia`, `fondos`, `configuracion`, `ordenes_servicio`, `anuncios`, `oradores` (personas guardadas para el Tercio Inferior), `diapositivas`.
- **Ojo con los nombres "presentaciones"** — hay tres cosas distintas:
  - La feature vieja `PresentationManager.jsx` (tablas `presentaciones`/`presentaciones_slides`) se eliminó en julio 2026. Esas tablas pueden seguir existiendo en instalaciones viejas con un esquema incompatible: **no reutilizar el nombre de tabla `presentaciones`**.
  - La feature actual de **diapositivas** (secuencias de imágenes, ej. PowerPoint exportado a PNG/JPG) usa la tabla `diapositivas`, aunque sus funciones/IPC se siguen llamando `obtenerPresentaciones`, `obtener-presentaciones`, `/api/presentaciones`, etc. UI: `src/pages/Diapositivas.jsx` (ruta `/diapositivas`).
  - `src/pages/Presentaciones.jsx` (ruta `/presentaciones`) es en realidad el **orden de servicio** (`ordenes_servicio`, con fallback a localStorage), no diapositivas.

### Servidor Express

- Corre dentro del proceso main de Electron en el puerto 3001.
- Sirve archivos estáticos de `public/` (multimedia, uploads, fondos).
- **`iniciarServidorMultimedia()` devuelve una Promise** que se resuelve cuando el servidor está escuchando.
- En producción, sirve el directorio `build/` completo con `express.static()`.
- **Escucha en `0.0.0.0` (expuesto a la red local)** para la app móvil y OBS. Protegido por `ipc/shared/seguridadServidor.js` (nov 2026):
  - Desde la misma PC (loopback): permitido sin PIN; escrituras con un `Origin` ajeno → 403 (anti CSRF). CORS solo para `localhost:3000/3001`.
  - Desde la red: todo `/api/*` exige el header `X-GloryView-Pin` (PIN de 6 dígitos en `{userData}/pin-movil.json`), salvo `RUTAS_PUBLICAS_LAN` (GET de solo lectura para OBS y miniaturas). `RUTAS_SOLO_LOCAL` (PIN, QR, diagnóstico, debug, pixabay) → 403 siempre.
  - 10 PIN incorrectos en 10 min → IP bloqueada 10 min (429). Regenerar el PIN (pantalla App Móvil) desbloquea.
  - Switch "Exigir PIN" (pantalla App Móvil, `POST /api/movil/pin/exigir {exigir}`, guardado en `pin-movil.json`): apagarlo deja usar APKs viejos sin campo de PIN mientras se actualizan; `RUTAS_SOLO_LOCAL` siguen bloqueadas igual.
  - **Compatibilidad con la app móvil**: todo cambio en rutas/formatos debe seguir funcionando con `app-gloryview/App.js` y con APKs viejos ya instalados — agregar campos/rutas, no renombrar ni quitar (ej. `/api/temporizador/estado` sigue devolviendo `segundosRestantes`).
  - El QR codifica `http://ip:3001/?pin=XXXXXX`; la app móvil (`app-gloryview/App.js`) envuelve `fetch` para agregar el header.
  - **Al agregar una ruta nueva**: queda protegida por defecto. Si OBS u otra fuente sin PIN la necesita, agregarla a `RUTAS_PUBLICAS_LAN` (solo si es GET de solo lectura); si expone secretos o hace peticiones salientes, a `RUTAS_SOLO_LOCAL`.

**Inicialización correcta:**
```js
// ✅ Correcto - esperar a que el servidor esté listo
await iniciarServidorMultimedia();
await new Promise(resolve => setTimeout(resolve, 2000)); // estabilidad
createMainWindow(); // ahora sí puede cargar http://localhost:3001

// ❌ Incorrecto - crear ventana antes del servidor
createMainWindow(); // intenta cargar pero servidor no está listo
iniciarServidorMultimedia(); // demasiado tarde
```

---

## Estructura de carpetas

```
my-church-proyector/
├── main.js                  # Proceso principal Electron (~2400 líneas): ventanas, menú, updates, estado compartido (timer, OBS, proyector) y el arranque de Express (seguridad, estáticos)
├── servidor/                # Servidor Express (puerto 3001) separado de main.js en nov 2026
│   ├── obsHtml.js            # HTML de los overlays /obs y /obs/tercio-inferior + plantillas del Tercio Inferior
│   └── rutas/                # Un módulo por tema: sistema, himnos, biblia, proyector, multimedia, fondos,
│                             # ordenesServicio, anuncios, presentaciones, temporizador, plantillas, obs.
│                             # Cada uno exporta registrar(expressApp, ctx). `ctx` (ctxServidor en main.js)
│                             # tiene getters en vivo de lo compartido y setters para lo que cambia
│                             # (mainWindow, proyectorWindow, diapositivaActiva, fondoActivoObs, FFMPEG_BIN):
│                             # en los módulos esas se usan como ctx.mainWindow, nunca desestructuradas.
│                             # Ruta nueva: agregarla al módulo del tema; si usa algo nuevo de main.js,
│                             # agregar su getter a ctxServidor. Dentro de servidor/rutas, RAIZ_APP = __dirname de main.js.
├── preload.js               # Bridge IPC seguro (~450 líneas)
├── db.js                    # Schema SQLite + toda la capa de datos (archivo único)
├── ipc/                     # Handlers IPC extraídos de main.js, por dominio (modularización completa — ver nota abajo)
│   ├── himnos.js             # CRUD de himnos (agregar/obtener/actualizar/eliminar/favoritos)
│   ├── fondos.js             # CRUD de fondos + selección/importación de archivos
│   ├── multimedia.js         # Multimedia activa, CRUD, subida/procesamiento de archivos
│   ├── biblia.js             # Consulta/preview de versículos bíblicos
│   ├── timer.js               # Handlers IPC del temporizador (estado/helpers viven en main.js, compartidos con las rutas Express de la app móvil)
│   ├── configuracion.js       # CRUD de configuración (obtener/guardar/restaurar por defecto/por clave)
│   ├── proyectorControl.js    # Proyectar himno/versículo/multimedia, abrir/cerrar ventana, fondos, controles remotos, OBS (el dominio más acoplado — mainWindow/proyectorWindow, actualizarObs y timer se inyectan)
│   ├── sistema.js             # Updates (autoUpdater), logo, enlace externo, info de la app, zoom, fullscreen
│   ├── backup.js              # Respaldo/restauración en .zip (JSZip) de DB + fondos/logos/multimedia; restaurar sobrescribe pero no borra archivos ajenos al respaldo
│   └── shared/
│       └── uploadValidation.js  # Validación de uploads (tamaño/extensión/magic number), usada por ipc/multimedia.js e ipc/sistema.js (logo)
├── electron-builder.yml     # Configuración de build y empaquetado
├── assets/
│   └── entitlements.mac.plist  # Permisos macOS (hardenedRuntime)
├── src/
│   ├── App.js               # Routing principal (React Router v7)
│   ├── pages/               # Vistas principales (rutas en src/App.js)
│   │   ├── Inicio.jsx       # Pantalla de inicio (ruta /)
│   │   ├── Proyector.jsx    # Control del proyector
│   │   ├── Multimedia.jsx   # Gestor multimedia
│   │   ├── Biblia.jsx       # Visor bíblico
│   │   ├── Himnos.jsx / HimnoDetalle.jsx / HimnoVidaCristiana.jsx / AgregarHimno.jsx / Favoritos.jsx
│   │   ├── Presentaciones.jsx  # ⚠️ Orden de servicio (no diapositivas — ver sección Base de datos)
│   │   ├── Diapositivas.jsx    # Secuencias de imágenes (tabla diapositivas)
│   │   ├── Anuncios.jsx
│   │   ├── TercioInferior.jsx  # Tercio inferior (lower third) para OBS — usa tabla oradores
│   │   ├── Temporizador.jsx
│   │   ├── Plantillas.jsx      # Plantillas animadas (PlantillaGSAP)
│   │   ├── AppMovil.jsx / Servidor.jsx  # Conexión de la app móvil / servidor local
│   │   ├── GestionFondos.jsx
│   │   ├── Contactos.jsx
│   │   └── Configuracion.jsx
│   ├── components/
│   │   ├── GlobalMediaPlayer.jsx    # Reproductor global de audio/video
│   │   ├── ModernMultimediaRenderer.jsx
│   │   └── Sidebar.jsx / Header.jsx
│   ├── contexts/
│   │   └── MediaPlayerContext.jsx   # Estado global del reproductor
│   ├── utils/
│   │   ├── bibliaParser.jsx / bibliaReader.jsx
│   │   └── consoleSilencer.js
│   └── data/
│       └── himnos.json / vidacristiana.json   (la Biblia está en public/data/)
└── public/
    ├── proyector.html       # Ventana proyectora (standalone)
    ├── preload-proyector.js # Bridge IPC para proyector
    ├── multimedia/          # Archivos multimedia del usuario
    ├── fondos/              # Imágenes de fondo
    └── uploads/             # Logos y uploads de usuario

app-gloryview/               # App móvil de control remoto (Expo 54 / React Native 0.81, build con EAS — ver BUILD-APK.md). Habla con las rutas Express de main.js
```

---

## Seguridad — reglas importantes

### IPC
- **No usar `ipcRenderer.invoke/send` directamente** en el renderer — siempre a través del API expuesto en `preload.js`.
- Al agregar un nuevo canal IPC:
  1. Crear el método nombrado en `preload.js` (e.g. `miNuevaFuncion: () => ipcRenderer.invoke('mi-canal')`).
  2. Si necesita estar en el `send` o `invoke` genérico, agregarlo a su whitelist correspondiente.
  3. Registrar el handler en el módulo de dominio correspondiente bajo `ipc/` (e.g. `ipc/himnos.js`), no directamente en `main.js`. Si el dominio no tiene módulo todavía, crear uno nuevo siguiendo el patrón de `ipc/himnos.js` (exporta una función `registrar()` autosuficiente) y agregar `require("./ipc/<dominio>").registrar();` dentro de `registrarHandlers()` en `main.js`.
  4. Si el archivo nuevo vive en una carpeta nueva dentro de `ipc/`, confirmar que `electron-builder.yml` la incluye en `files:` (ya cubierto por el patrón `ipc/**/*`).

### executeJavaScript
- **Nunca** interpolar variables de usuario directamente en template literals de `executeJavaScript()`.
- Usar siempre `JSON.stringify()`: `` `console.log(${JSON.stringify(variable)})` ``

### Uploads de archivos
- Todos los uploads pasan por `validarArchivoUpload(buffer, extension, categoria)` antes de escribir a disco.
- Límites: logo 10MB, imagen 50MB, audio 500MB, video 2GB, documento 100MB.
- Se validan: tamaño + extensión en whitelist + magic numbers del buffer.
- No modificar estos límites sin motivo justificado.

### CSP
- `'unsafe-eval'` y `'unsafe-inline'` en `script-src` están **prohibidos en producción** (quitados en nov 2026; verificado en la app empaquetada: las 20 rutas cargan sin violaciones).
- Vite no mete scripts inline en `build/index.html` (solo `<script type="module" src=...>`). Si se agrega un plugin que inyecte `<script>` inline, la app empaquetada queda en blanco.
- `executeJavaScript()` desde main no está sujeto al CSP de la página.
- En desarrollo se permiten para el servidor de Vite (React Refresh usa un script inline y `ws://localhost:3000`).
- `style-src 'unsafe-inline'` se mantiene (React + TailwindCSS usan estilos inline).

### Sandbox
- Ambas ventanas tienen `sandbox: true`.
- El preload **no puede usar `require()`** — si necesitas un módulo Node.js en el renderer, crear un IPC handler en main.js.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Desktop | Electron 45 (Node 24) — requiere macOS 13+ y Windows 64 bits |
| UI | React 19 + React Router 7 |
| Compilación React | Vite 8 (`vite.config.mjs`, salida en `build/`); pruebas con Vitest |
| Estilos | TailwindCSS 3 |
| Animaciones | Framer Motion 12 |
| Base de datos | better-sqlite3 13 |
| Servidor local | Express 5 |
| Editores ricos | TinyMCE 6, Quill 2, SunEditor |
| Procesamiento multimedia | FFmpeg (ffmpeg-static) |
| PowerPoint | Importar PDF con pdfjs-dist 3.11.174 (ver arriba) |
| Empaquetado | electron-builder 26 |

Al subir de versión de Electron: leer la página "Breaking Changes" de la documentación de Electron,
correr `npx electron-builder install-app-deps` (recompila better-sqlite3), `npm test` y probar
la app empaquetada. Electron solo da parches a las 3 últimas versiones mayores.
- Desde Electron 43 los diálogos no recuerdan la última carpeta: main.js envuelve
  `dialog.showOpenDialog/showSaveDialog` al inicio para recordarla.
- macOS 13+: `mac.minimumSystemVersion` en electron-builder.yml, y release.yml agrega
  `minimumSystemVersion: 22.0.0` (versión Darwin) a latest-mac.yml para que electron-updater
  no actualice Macs más viejas.

---

## Patrones de código

### Agregar un nuevo handler IPC

```js
// 1. En preload.js — método nombrado
miNuevaFuncion: (datos) => ipcRenderer.invoke('mi-nueva-funcion', datos),

// 2. En ipc/<dominio>.js — handler (no directamente en main.js)
ipcMain.handle('mi-nueva-funcion', async (event, datos) => {
  try {
    // validar datos antes de usarlos
    if (!datos || typeof datos.id !== 'number') throw new Error('Datos inválidos');
    const resultado = await miLogica(datos);
    return resultado;
  } catch (error) {
    console.error('❌ [Main] Error en mi-nueva-funcion:', error);
    return null;
  }
});

// 3. En el renderer (React)
const resultado = await window.electron.miNuevaFuncion({ id: 1 });
```

### Queries a la base de datos

```js
// ✅ Correcto — siempre parametrizado
const stmt = db.prepare('SELECT * FROM himnos WHERE id = ?');
const himno = stmt.get(id);

// ❌ Incorrecto — nunca concatenar
const stmt = db.prepare(`SELECT * FROM himnos WHERE id = ${id}`);
```

### Comunicación ventana principal → proyector

```js
// Desde main.js al proyector
if (proyectorWindow && !proyectorWindow.isDestroyed()) {
  proyectorWindow.webContents.send('nombre-canal', datos);
}

// Desde el renderer de control (via preload)
window.electron.on('nombre-canal', (datos) => { /* actualizar UI */ });
```

---

## Flujo de build

```
npm run build          →  React compila a build/
npm run build-exe      →  electron-builder empaqueta build/ + main.js + preload.js + db.js
                           Salida: dist-installer/
                           - GloryView Proyector-x.x.x-Installer.exe  (NSIS)
                           - GloryView Proyector-x.x.x-Portable.exe
```

### Code signing (requiere certificados externos)
```bash
# Windows
export WIN_CSC_LINK="/ruta/certificado.pfx"
export WIN_CSC_KEY_PASSWORD="password"

# macOS
export CSC_LINK="/ruta/certificado.p12"
export CSC_KEY_PASSWORD="password"
export APPLE_ID="correo@ejemplo.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"

npm run build-exe
```
Sin las variables de entorno, el build funciona sin firma (modo desarrollo/pruebas).

### Publicar una versión (release + APK + landing)
1. APK: subir `version` y `android.versionCode` en `app-gloryview/app.json` (y el texto
   "Versión x.y.z" del drawer en App.js), commit, y `eas build --platform android --profile preview`
   (cuenta Expo `edu-aoc`). Pegar la "Application Archive URL" en `app-gloryview/apk-url.txt`.
2. Escritorio: subir `version` en package.json/package-lock.json y agregar el bloque arriba de
   NOVEDADES.txt (el CI usa solo el primer bloque como notas).
3. Push del commit y del tag `vX.Y.Z` → `.github/workflows/release.yml` compila Windows y Mac,
   publica el release y adjunta el APK como `GloryView-Movil.apk` (nombre fijo).
4. Página web: carpeta `sitio/` (https://gloryview.app, GitHub Pages; se publica sola con
   `.github/workflows/sitio.yml` al hacer push de cambios en `sitio/`). Páginas: `index.html`,
   `novedades/index.html`, `privacidad/index.html`. Actualizar a mano la versión, los links
   `releases/download/vX.Y.Z/...` (en index y novedades) y las notas de novedades.
   El APK se enlaza con `releases/latest/download/GloryView-Movil.apk` (no cambia).
   (Antes vivía en Artifacts de claude.ai; desde nov 2026 la fuente es `sitio/`.)

---

## Datos de la app (rutas en producción)

| Tipo | Ruta |
|------|------|
| Base de datos SQLite | `{userData}/gloryview.db` |
| Log de errores | `{userData}/gloryview-error.log` |
| Multimedia del usuario | `{userData}/public/multimedia/` |
| Fondos del usuario | `{userData}/public/fondos/` |
| Uploads (logos) | `{userData}/public/uploads/` |

`{userData}` en Windows: `C:\Users\{usuario}\AppData\Roaming\GloryView Proyector`

> En desarrollo, `{userData}` en macOS es `~/Library/Application Support/my-church-proyector`.

---

## Diagnóstico de problemas

### Archivos de log

**Ubicación en producción:**
- Windows: `%APPDATA%\GloryView Proyector\gloryview-error.log`
- macOS: `~/Library/Application Support/GloryView Proyector/gloryview-error.log`

**Acceso rápido (Windows):**
```cmd
notepad "%APPDATA%\GloryView Proyector\gloryview-error.log"
```

**Contenido del log:**
- Todos los pasos de inicialización
- Errores con stack trace completo
- Eventos de carga de ventanas
- Estado del servidor Express
- Verificaciones de integridad de archivos

### Script de diagnóstico automatizado

Ejecutar en PowerShell (Windows) como administrador:
```powershell
.\diagnostico-windows.ps1
```

Este script verifica:
- Procesos en ejecución
- Puerto 3001 disponible/ocupado
- Reglas de firewall
- Archivos de log y base de datos
- Conectividad del servidor

### DevTools en producción

Atajos de teclado para abrir DevTools:
- `F12` — Alternar DevTools en ventana enfocada
- `Ctrl+Shift+I` — Alternar DevTools en ventana enfocada
- `Ctrl+Shift+P` — Abrir DevTools del proyector específicamente

### Errores comunes

#### Pantalla blanca / App no inicia
**Causa:** Ventana creada antes de que el servidor esté listo.
**Diagnóstico:** Revisar log, buscar `❌ Error cargando URL http://localhost:3001`
**Solución:** El código ya está corregido (marzo 2026, desde la 0.2.0; versión actual 0.4.8)

#### Puerto 3001 ocupado
**Causa:** Otra instancia de GloryView o proceso bloqueando el puerto.
**Diagnóstico:** Ejecutar `diagnostico-windows.ps1`
**Solución:** 
```powershell
Stop-Process -Name "GloryViewProyector" -Force
```

#### Archivos del build faltantes
**Causa:** Build incompleto o corrupto.
**Diagnóstico:** Log mostrará `❌ index.html no encontrado`
**Solución:** Reinstalar aplicación

---

## Sistema de tamaño de fuente en el Proyector

### Archivos involucrados
| Archivo | Rol |
|---------|-----|
| `src/utils/pantallaScale.js` | `calcularEscalaFuente()` + tabla `CLASS_PX` compartida — escala todo lo de abajo según la resolución real de pantalla |
| `src/components/ModernTextDisplay.jsx` | Renderiza himno/versículo proyectado (párrafo + título) con auto-sizing por búsqueda binaria |
| `src/components/PlantillaGSAP.jsx` | Auto-sizing propio (`useAutoFontSize`) para el texto dentro de las plantillas animadas |
| `src/components/ModernWelcomeScreen.jsx` | Pantalla de bienvenida/inicio — nombre de iglesia y eslogan, sin auto-fit (tamaño fijo escalado) |
| `src/pages/Configuracion.jsx` | Guarda fontSize en DB como claves planas (`fontSizeParrafo`, `fontSizeTitulo`); preview a escala 1:5 asumiendo 1920×1080 (NO se escala por diseño) |
| `src/hooks/useProyectorConfig.js` | Carga config vía IPC, convierte claves planas → `fontSize.parrafo` (anidado) |
| `src/pages/HimnoDetalle.jsx` | Divide himnos largos en slides con `splitParrafoEnSlides()` |

### Claves de configuración de tamaño
La DB guarda claves **planas**: `fontSizeParrafo`, `fontSizeTitulo`, `fontSizeEslogan`.
React usa objeto **anidado**: `configuracion.fontSize.parrafo`, `.titulo`, `.eslogan`.
`useProyectorConfig.js → mergeConfig()` hace la conversión automáticamente.

**Valores disponibles de tamaño (clase Tailwind → px, en términos de la pantalla de referencia 1920×1080):**
```
text-3xl→30  text-4xl→36  text-5xl→48  text-6xl→60  text-7xl→72
text-8xl→96  text-9xl→128  text-10xl→160  text-11xl→200
```
`text-10xl` y `text-11xl` son **clases personalizadas** (definidas en `tailwind.config.js`) — su valor real
solo se usa como referencia en la tabla `CLASS_PX` de `pantallaScale.js`. El tamaño final siempre se
aplica como `style={{fontSize: px + 'px'}}`, nunca como clase Tailwind directa (ver escalado abajo).

### Escalado por resolución real de pantalla (julio 2026)
Los px de `CLASS_PX` están calibrados para una pantalla de **1920×1080**. `createProyectorWindow()` en
`main.js` abre la ventana del proyector a la resolución NATIVA del monitor externo — en una pantalla de
mayor resolución (ej. un TV 4K, 2160 de alto) el mismo px configurado ocupa una proporción menor de
pantalla y se ve chico. `pantallaScale.js` corrige esto:

```js
calcularEscalaFuente() // = window.innerHeight / 1080, clamp [0.4, 4]
```

Se multiplica por esta escala en los tres componentes de la tabla de arriba. `TimerDisplay.jsx` nunca
tuvo este problema porque ya usaba `vmin`/`vw`/`vh` en vez de px fijos — ese es el patrón "correcto" que
el resto del proyector no seguía. El preview de `Configuracion.jsx` NO se escala, a propósito: representa
la referencia 1920×1080 tal cual, así que ahora coincide con lo que se ve en cualquier pantalla real.

### Auto-sizing de párrafo/título (`ModernTextDisplay.jsx`)

**Componentes clave:**
- `measureRef` — `<p>` oculto con `position: fixed`, ancho `92vw` del viewport real (no depende del layout
  del contenedor flex, que puede estar animando un fullscreen de macOS)
- `ajustar()` — búsqueda binaria en `useLayoutEffect` (síncrono, antes del paint)

**Flujo del algoritmo:**
1. `escala = calcularEscalaFuente()`
2. Título: `tituloFontSizePx = CLASS_PX[claseTitulo] * escala` (sin auto-fit propio — el contenedor ya lo
   limita con `max-h-[35%] overflow-hidden`)
3. Párrafo — techo: `userMaxPx = CLASS_PX[claseParrafo] * escala`
4. Espacio disponible: `avail = innerHeight * 0.94 - altoRealDelTítulo` (el título se mide con un `<h1>`
   oculto, `measureTituloRef`; antes se reservaba un 46% fijo aunque el título ocupara ~13%)
5. `calcularAjusteTexto()` (en `pantallaScale.js`, compartida con `PlantillaGSAP`): si el texto entra a
   `userMaxPx` se usa tal cual; si no, búsqueda binaria entre `minPx = max(24 * escala, userMaxPx * 0.2)` y
   `userMaxPx` hasta el mayor tamaño con `scrollHeight <= avail` y `≤ AJUSTE_TEXTO.maxLines` (9) líneas.
6. Estrofas (texto con `\n`): si ese tamaño parte un verso en dos líneas, se achica hasta
   `AJUSTE_TEXTO.maxReduccionVersos` (25%) para que cada verso entre en su línea.

**Ajuste de nov 2026 ("la letra se ve chica en la TV")** — medido a 1920×1080 con la plantilla Gozo:
versículo medio 92→110px, largo 69→79px, estrofa 130→146px, referencia 39→54px. Cambios: `maxLines` 6→9,
padding de las plantillas 8–10% → 4–5%, margen extra de `useAutoFontSize` 0.90→0.97, `REFERENCIA_BASE`
1.75→2.4, `wordSpacing` 0.28em→0.1em, `.plg-texto { white-space: pre-line }` (las plantillas juntaban
los versos), y el techo por defecto de la letra subió de `text-6xl` a `text-10xl` (migración
`migracionParrafoGrande` en `db.js`). Para medir de nuevo: proyectar por `/api/proyector/himno` (2 envíos:
el primero muestra solo el título) o `window.electron.enviarVersiculo` y emular 1920×1080 por CDP.

### Modo lejos (nov 2026) — dividir versículos largos
Si un versículo de la Biblia (`origen: "biblia"`) no entra con la letra mínima configurada, el proyector
lo divide en partes: **la división es automática y el avance es manual**.
- Config (claves planas): `modoLejosActivo` (boolean, true) y `modoLejosMinimo` (% del alto de pantalla,
  10 por defecto; opciones 8/10/12/15 en Configuración → Proyector → "Modo Lejos").
- `Proyector.jsx` mide con un `<p>` oculto a `minimo% × innerHeight` contra `innerHeight × 0.62`
  (`MODO_LEJOS_ALTO_UTIL`) y llama a `dividirTextoEnPartes()` de `pantallaScale.js` (corta en fin de
  oración > coma > palabra, partes equilibradas, máx. 8). Muestra un badge "N / M ▸" abajo a la derecha.
- `ipc/partesProyector.js` guarda `{parte,total}`: el proyector lo reporta (`proyector-partes`), y quien
  controla pide `cambiarParte(±1)` → devuelve `false` si ya está en el borde, y ahí recién se cambia de
  versículo. "Anterior" entra al versículo previo por su última parte (`parteInicial: "ultima"`).
- Controladores: flechas y botones de `Biblia.jsx` (`window.electron.cambiarParte`), app móvil vía
  `POST /api/control/parte {direccion}` → `{movido, parte, total}` y `GET /api/proyector/partes`.
- Medido a 1080p con Romanos 8:38-39: sin modo lejos 79px en una pantalla; con mínimo 10% → 4 partes a
  160px; con 15% → 7 partes. Himnos no se dividen acá (tienen su propia división en `HimnoDetalle.jsx`).

**Sincronización en tiempo real:** Configuración → `guardarSilencioso()` → IPC → DB → evento
`configuracion-actualizada` → `useProyectorConfig.js` convierte claves planas → anidadas →
`useLayoutEffect` (deps: `tamañoParrafo`, `tamañoTitulo`) recalcula automáticamente. También recalcula en
`resize` de la ventana (relevante para la animación de fullscreen de macOS, que crece el viewport
progresivamente).

**Textos extremadamente largos** (capítulo completo, himno sin dividir de 20+ líneas): el algoritmo baja
hasta el piso (`minPx`) y no hay overflow visual porque el contenedor tiene `overflow: hidden` — pero el
texto puede quedar chico. Solución existente: toggle "Auto-dividir párrafos largos" en Configuración
(`HimnoDetalle.jsx`, divide textos >350 caracteres en slides).

### Modo de ejecución — IMPORTANTE
El proyector carga desde **puertos diferentes** según el modo:
- **Desarrollo** (`!app.isPackaged`): `http://localhost:3000` → código fuente via servidor de Vite
- **Producción** (`app.isPackaged`): `http://localhost:3001` → archivos del `build/`

**Para que los cambios en código fuente se vean en el proyector:**
- En modo desarrollo: el proyector necesita **recargar** (F5 o Cmd+R en su DevTools) — HMR no siempre propaga automáticamente.
- En modo producción: ejecutar `npm run build` y reiniciar la app.

---

## Convenciones de UI (nov 2026)

- **Colores de botones**: Proyectar/Mostrar = `emerald-600` · Crear/Nuevo/Guardar/Subir = `indigo-600` · Eliminar/Detener = rojo. El color propio de cada sección (sidebar) va solo en su ícono.
- **Configuración se guarda sola** (no hay botón "Guardar"): switches y selectores llaman `guardarSilencioso()`; nombre/eslogan se guardan 700 ms después de dejar de escribir; el logo se sube al elegirlo. Indicador "Guardado ✓" en la barra lateral.
- Los fondos se administran solo en Gestión de Fondos (Configuración → Apariencia muestra el activo y un botón "Cambiar fondo").
- **Encabezado de página** (Anuncios, Diapositivas, Multimedia, Gestión de Fondos, Tercio Inferior): raíz
  `bg-[#080c14] h-full flex flex-col overflow-hidden`; barra `shrink-0 px-4 py-2.5 border-b border-slate-800
  bg-slate-900/50` con ícono del color de la sección + título `text-sm font-semibold` + dato `text-xs text-slate-500`;
  botones `h-8 px-3 rounded-lg text-xs font-semibold`. El contenido va en `flex-1 min-h-0 overflow-y-auto`.
- Multimedia tiene UN solo botón "Subir archivos" (`seleccionarArchivosMultimedia` + `procesarArchivosPorRuta`,
  copia por ruta, sin base64). `procesar-archivos-por-ruta` salta duplicados (mismo nombre sin extensión + tipo)
  y los devuelve con `duplicado: true`.

## Lo que NO hacer

- No poner en `dependencies` librerías que solo usa React (se empaquetan en `build/` con webpack):
  electron-builder mete TODO `dependencies` en app.asar. En `dependencies` van solo las que
  carga el proceso principal (main.js, preload.js, db.js, ipc/): better-sqlite3, cors,
  electron-updater, express, ffmpeg-static, jszip, node-fetch, qrcode. Lo demás → `devDependencies`.
  (Nov 2026: así app.asar bajó de 287 MB / 40.7k archivos a 18 MB / 1.7k.)
- No correr `npm audit fix --omit=dev` sin luego `npm install`: borra las devDependencies del disco.
- No usar `__dirname` para rutas de archivos subidos: en producción apunta dentro de app.asar.
  Usar `obtenerRutaBase()` (userData). `eliminarMultimedia(id, { carpetas, carpetaMiniaturas })`
  en db.js borra solo por nombre dentro de las carpetas de multimedia de la app (nunca una ruta
  externa, ni si otro registro usa el mismo archivo) y también `thumb_{id}.jpg`.
- La ruta de `ffmpeg-static` debe reescribirse a `app.asar.unpacked` (main.js); si no, las
  miniaturas de video fallan en la app instalada con `spawn ENOTDIR`.
- No deshabilitar `sandbox` en las ventanas de Electron.
- No agregar `'unsafe-eval'` o `'unsafe-inline'` a `script-src` en producción.
- No usar `executeJavaScript()` con interpolación directa de variables — usar `JSON.stringify()`.
- No crear métodos genéricos de IPC (`invoke`/`send`) sin whitelist.
- No escribir archivos al disco sin pasar por `validarArchivoUpload()`.
- No hacer queries SQL con concatenación de strings.
- No agregar `require()` al preload.js (rompe el sandbox).
- No crear ventanas antes de iniciar el servidor Express — siempre `await iniciarServidorMultimedia()` primero.
- No modificar el orden de inicialización en `app.whenReady()` sin entender las dependencias.
- No reutilizar el nombre de tabla `presentaciones` (choca con tablas viejas en instalaciones existentes).
