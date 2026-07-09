# GloryView Proyector — CLAUDE.md

Aplicación de escritorio (Electron + React) para proyección en iglesias.
Gestiona himnos, versículos bíblicos, multimedia y presentaciones en una ventana principal,
con sincronización en tiempo real a una ventana proyectora separada.

---

## Comandos esenciales

```bash
# Desarrollo (iniciar ambos: React + Electron)
npm run electron-dev

# Solo servidor React (sin Electron)
npm start

# Build producción completo → dist-installer/
npm run build-exe

# Build solo Windows (.exe + portable)
npm run build-exe-win

# Reconstruir módulos nativos (better-sqlite3) después de cambiar versión de Electron
npm run rebuild
```

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
2. Inicializar base de datos (`dbNew.initializeDatabase()`)
3. Inicializar fondos por defecto
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

### Base de datos

- Motor: **better-sqlite3** (síncrono, sin pool de conexiones).
- Todo el esquema y las queries viven en `db.js` (archivo único; `db-new.js` se eliminó en la consolidación de julio 2026).
- **Todas las queries deben usar parámetros (`?`)** — nunca concatenar strings con datos del usuario.
- Tablas principales: `himnos`, `multimedia`, `fondos`, `configuracion`, `ordenes_servicio`, `anuncios`.
- `presentaciones`/`presentaciones_slides` fueron eliminadas del código en julio 2026 (feature completa removida, ver `PresentationManager.jsx` en el historial de git). Las tablas pueden seguir existiendo en instalaciones productivas viejas, pero ya no se crean ni se usan.

### Servidor Express

- Corre dentro del proceso main de Electron en el puerto 3001.
- Sirve archivos estáticos de `public/` (multimedia, uploads, fondos).
- **`iniciarServidorMultimedia()` devuelve una Promise** que se resuelve cuando el servidor está escuchando.
- En producción, sirve el directorio `build/` completo con `express.static()`.
- No tiene autenticación (es localhost, no expuesto a red).

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
├── main.js                  # Proceso principal Electron (~4400 líneas)
├── preload.js               # Bridge IPC seguro (~380 líneas)
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
│   └── shared/
│       └── uploadValidation.js  # Validación de uploads (tamaño/extensión/magic number), usada por multimedia y por handlers aún en main.js (logo, presentaciones)
├── electron-builder.yml     # Configuración de build y empaquetado
├── assets/
│   └── entitlements.mac.plist  # Permisos macOS (hardenedRuntime)
├── src/
│   ├── App.js               # Routing principal (React Router v7)
│   ├── pages/               # Vistas principales
│   │   ├── Proyector.jsx    # Control del proyector (~91KB)
│   │   ├── Multimedia.jsx   # Gestor multimedia (~133KB)
│   │   ├── Biblia.jsx       # Visor bíblico (~59KB)
│   │   ├── Himnos.jsx / HimnoDetalle.jsx
│   │   ├── AgregarHimno.jsx
│   │   ├── GestionFondos.jsx
│   │   ├── Configuracion.jsx
│   │   └── Favoritos.jsx
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
│       ├── himnos.json / vidacristiana.json
│       └── biblia/          # 66 libros como módulos JS
└── public/
    ├── proyector.html       # Ventana proyectora (standalone)
    ├── preload-proyector.js # Bridge IPC para proyector
    ├── multimedia/          # Archivos multimedia del usuario
    ├── fondos/              # Imágenes de fondo
    └── uploads/             # Logos y uploads de usuario
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
- `'unsafe-eval'` y `'unsafe-inline'` en `script-src` están **prohibidos en producción**.
- En desarrollo se permiten para el webpack dev server (source maps).
- `style-src 'unsafe-inline'` se mantiene (React + TailwindCSS usan estilos inline).

### Sandbox
- Ambas ventanas tienen `sandbox: true`.
- El preload **no puede usar `require()`** — si necesitas un módulo Node.js en el renderer, crear un IPC handler en main.js.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Desktop | Electron 35.7.5 |
| UI | React 19 + React Router 7 |
| Estilos | TailwindCSS 3 |
| Animaciones | Framer Motion 12 |
| Base de datos | better-sqlite3 11 |
| Servidor local | Express 5 |
| Editores ricos | TinyMCE 6, Quill 2, SunEditor |
| Procesamiento multimedia | FFmpeg (ffmpeg-static) |
| PowerPoint | pptx-parser, mammoth, officegen |
| Empaquetado | electron-builder 26 |

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

---

## Datos de la app (rutas en producción)

| Tipo | Ruta |
|------|------|
| Base de datos SQLite | `{userData}/gloryview.db` |
| Log de errores | `{userData}/gloryview-error.log` |
| Multimedia del usuario | `{userData}/public/multimedia/` |
| Fondos del usuario | `{userData}/public/fondos/` |
| Uploads (logos) | `{userData}/public/uploads/` |
- **No crear ventanas antes de iniciar el servidor Express** — siempre usar `await iniciarServidorMultimedia()` primero.
- **No modificar el orden de inicialización en `app.whenReady()`** sin entender las dependencias.

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
**Solución:** El código ya está corregido (marzo 2026), actualizar a versión 0.2.0+

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

`{userData}` en Windows: `C:\Users\{usuario}\AppData\Roaming\GloryView Proyector`

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
4. Espacio disponible: `avail = window.innerHeight * (hayTítuloVisible ? 0.50 : 0.87)`
5. Si el texto entra a `userMaxPx`, se usa tal cual. Si no, búsqueda binaria entre
   `minPx = max(24 * escala, userMaxPx * 0.2)` y `userMaxPx`, hasta encontrar el mayor tamaño donde
   `measure.scrollHeight <= avail`

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
- **Desarrollo** (`!app.isPackaged`): `http://localhost:3000` → código fuente via CRA dev server
- **Producción** (`app.isPackaged`): `http://localhost:3001` → archivos del `build/`

**Para que los cambios en código fuente se vean en el proyector:**
- En modo desarrollo: el proyector necesita **recargar** (F5 o Cmd+R en su DevTools) — HMR no siempre propaga automáticamente.
- En modo producción: ejecutar `npm run build` y reiniciar la app.

---

## Lo que NO hacer

- No deshabilitar `sandbox` en las ventanas de Electron.
- No agregar `'unsafe-eval'` o `'unsafe-inline'` a `script-src` en producción.
- No usar `executeJavaScript()` con interpolación directa de variables — usar `JSON.stringify()`.
- No crear métodos genéricos de IPC (`invoke`/`send`) sin whitelist.
- No escribir archivos al disco sin pasar por `validarArchivoUpload()`.
- No hacer queries SQL con concatenación de strings.
- No agregar `require()` al preload.js (rompe el sandbox).
