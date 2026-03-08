# Traslado a Mac mini (macOS)

Este proyecto es React (CRA) + Electron + electron-builder.

## Qué incluye la carpeta `TRASLADO_MAC`
- Código fuente: `src/`, `public/`
- Recursos del app: `assets/`
- Datos necesarios del app: `data/` (incluye `data/himnos.sqbpro` y `data/archivos/...`)
- Configuración: `package.json`, `package-lock.json`, `electron-builder.yml`, `tailwind.config.js`
- Backend local: `main.js`, `preload.js`, `db.js`, `db-new.js`

## Qué NO incluye (se regenera)
- `node_modules/`
- `build/` (salida de `npm run build`)
- `dist-installer/` (salida de `electron-builder`)

## Crear la carpeta de traslado en Windows
En PowerShell, dentro del proyecto:

- Solo proyecto + data:
  - `powershell -ExecutionPolicy Bypass -File .\crear-traslado-mac.ps1 -Zip`

- Proyecto + data + tus carpetas grandes `uploads/` y `videos/`:
  - `powershell -ExecutionPolicy Bypass -File .\crear-traslado-mac.ps1 -IncludeUserMedia -Zip`

Esto genera:
- Carpeta `TRASLADO_MAC/`
- Archivo `TRASLADO_MAC.zip`

## Restaurar en macOS
1) Copia `TRASLADO_MAC.zip` al Mac y descomprímelo.
2) En Terminal, entra a la carpeta:
   - `cd TRASLADO_MAC`
3) Instala dependencias:
   - `npm install`
4) Si falla por módulos nativos (ej. `better-sqlite3`), ejecuta:
   - `npm run rebuild`
5) Desarrollo:
   - `npm run start` (React)
   - En otra terminal: `npm run electron-dev`
6) Empaquetar para macOS:
   - `npx electron-builder --mac`

Nota: tu `electron-builder.yml` está orientado a Windows (`nsis`). Para un instalador `.dmg`/`.pkg` en Mac puede requerir agregar sección `mac:` y un icono `.icns`.
