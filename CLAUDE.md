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

## Arquitectura

### Dos procesos Electron

| Proceso | Archivo | Descripción |
|---------|---------|-------------|
| Main | `main.js` | IPC handlers, Express server, ventanas, DB |
| Renderer principal | `src/` (React) | UI de control y gestión |
| Renderer proyector | `public/proyector.html` | Ventana de proyección (pantalla 2) |

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
- Esquema principal en `db.js`; tablas nuevas en `db-new.js`.
- **Todas las queries deben usar parámetros (`?`)** — nunca concatenar strings con datos del usuario.
- Tablas principales: `himnos`, `multimedia`, `presentaciones`, `presentaciones_slides`, `fondos`, `configuracion`.

### Servidor Express

- Corre dentro del proceso main de Electron en el puerto 3001.
- Sirve archivos estáticos de `public/` (multimedia, uploads, fondos).
- No tiene autenticación (es localhost, no expuesto a red).

---

## Estructura de carpetas

```
my-church-proyector/
├── main.js                  # Proceso principal Electron (~5400 líneas)
├── preload.js               # Bridge IPC seguro (~380 líneas)
├── db.js                    # Schema SQLite principal
├── db-new.js                # Schema extendido (multimedia, slides, fondos)
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
│   │   ├── PresentationManager.jsx  # Gestor de presentaciones (~104KB)
│   │   ├── GlobalMediaPlayer.jsx    # Reproductor global de audio/video
│   │   ├── ModernMultimediaRenderer.jsx
│   │   └── Sidebar.jsx / Header.jsx
│   ├── contexts/
│   │   └── MediaPlayerContext.jsx   # Estado global del reproductor
│   ├── utils/
│   │   ├── powerPointProcessor.js   # Conversión PPTX → imágenes
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
  3. Registrar el handler en `main.js` con `ipcMain.handle()`.

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

// 2. En main.js — handler
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

`{userData}` en Windows: `C:\Users\{usuario}\AppData\Roaming\GloryView Proyector`

---

## Lo que NO hacer

- No deshabilitar `sandbox` en las ventanas de Electron.
- No agregar `'unsafe-eval'` o `'unsafe-inline'` a `script-src` en producción.
- No usar `executeJavaScript()` con interpolación directa de variables — usar `JSON.stringify()`.
- No crear métodos genéricos de IPC (`invoke`/`send`) sin whitelist.
- No escribir archivos al disco sin pasar por `validarArchivoUpload()`.
- No hacer queries SQL con concatenación de strings.
- No agregar `require()` al preload.js (rompe el sandbox).
