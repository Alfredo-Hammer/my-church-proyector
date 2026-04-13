# 🔄 Sistema de Actualizaciones Automáticas - GloryView

Este documento explica cómo funciona el sistema de actualizaciones automáticas de GloryView Proyector y cómo configurarlo.

## 📋 Características

✅ **Detección automática** de nuevas versiones al iniciar la app  
✅ **Verificación manual** desde el menú Ayuda → Buscar Actualizaciones  
✅ **Descarga en segundo plano** sin bloquear la aplicación  
✅ **Instalación segura** al cerrar la aplicación  
✅ **UI moderna** con indicadores de progreso  
✅ **Notas de versión** mostradas al usuario  

## 🏗️ Arquitectura

### Componentes

1. **electron-updater** - Módulo que maneja la lógica de actualización
2. **main.js** - Configuración de autoUpdater y eventos
3. **preload.js** - Bridge IPC para comunicación segura
4. **UpdateNotification.jsx** - Componente React de UI
5. **electron-builder.yml** - Configuración de publicación

### Flujo de Actualización

```
1. App inicia → Verifica actualizaciones (5 seg después)
2. Nueva versión encontrada → Muestra modal al usuario
3. Usuario acepta → Descarga en segundo plano
4. Descarga completa → Ofrece instalar ahora o más tarde
5. Usuario acepta → App se reinicia e instala actualización
```

## ⚙️ Configuración

### 1. Servidor de Actualización

**🎯 Configuración Actual: GitHub Releases**

El proyecto está configurado para usar **GitHub Releases** como servidor de actualizaciones.

```yaml
# electron-builder.yml (CONFIGURACIÓN ACTIVA)
publish:
  provider: github
  owner: Alfredo-Hammer
  repo: my-church-proyector
  private: false
  releaseType: release
```

**📖 [Guía Completa de GitHub Releases →](GITHUB-RELEASES.md)**

---

### Opciones Alternativas

#### Opción A: GitHub Releases (ACTUALMENTE CONFIGURADA) ⭐

**Ventajas:**
- ✅ Gratis e ilimitado
- ✅ Hosting confiable
- ✅ Versionado automático
- ✅ Estadísticas de descargas
- ✅ Control de acceso

**Configuración actual:**
```yaml
# electron-builder.yml
publish:
  provider: github
  owner: Alfredo-Hammer
  repo: my-church-proyector
```

**Comandos disponibles:**
```bash
npm run release-github  # Publicar release automáticamente
npm run release-draft   # Crear draft para revisión manual
```

**Ver guía completa:** [GITHUB-RELEASES.md](GITHUB-RELEASES.md)

---

#### Opción B: Amazon S3

```yaml
# electron-builder.yml
publish:
  provider: generic
  url: https://tu-bucket.s3.amazonaws.com
```

**Pasos:**
1. Crear un bucket S3 en AWS
2. Configurar acceso público de lectura
3. Subir los archivos de actualización:
   - `latest.yml` (metadatos de la versión)
   - `GloryView-X.X.X-Installer.exe`
   - `GloryView-X.X.X-Installer.exe.blockmap`

---

#### Opción C: Servidor Propio

```yaml
# electron-builder.yml
publish:
  provider: generic
  url: https://updates.tudominio.com
```

**Estructura del servidor:**
```
https://updates.tudominio.com/
├── latest.yml
├── GloryView-0.2.0-Installer.exe
└── GloryView-0.2.0-Installer.exe.blockmap
```

### 2. Generar Actualización

```bash
# 1. Incrementar versión en package.json
"version": "0.3.0"

# 2. Compilar y generar instalador
npm run build-exe

# 3. Los archivos están en dist-installer/:
# - GloryView Proyector-0.3.0-Installer.exe
# - GloryView Proyector-0.3.0-Installer.exe.blockmap
# - latest.yml
```

### 3. Publicar Actualización

#### 🎯 Con GitHub Releases (MÉTODO ACTUAL)

```bash
# 1. Configurar token (solo primera vez)
# Ver: GITHUB-RELEASES.md para obtener el token
export GH_TOKEN=tu_token_github  # macOS/Linux
$env:GH_TOKEN="tu_token_github"  # Windows PowerShell

# 2. Publicar automáticamente
npm run release-github

# O crear draft para revisión manual
npm run release-draft
```

**Archivos que se publican:**
- `GloryView Proyector-X.X.X-Installer.exe`
- `GloryView Proyector-X.X.X-Installer.exe.blockmap`
- `latest.yml`

**Verificar en:** https://github.com/Alfredo-Hammer/my-church-proyector/releases

**📖 [Guía Completa de GitHub Releases →](GITHUB-RELEASES.md)**

---

#### Métodos Alternativos

**Para S3:**
```bash
aws s3 cp "dist-installer/latest.yml" s3://tu-bucket/
aws s3 cp "dist-installer/GloryView Proyector-0.3.0-Installer.exe" s3://tu-bucket/
aws s3 cp "dist-installer/GloryView Proyector-0.3.0-Installer.exe.blockmap" s3://tu-bucket/
```

**Para servidor propio:**
```bash
# Subir por FTP/SCP/rsync
scp dist-installer/* usuario@servidor:/var/www/updates/
```

## 🧪 Testing

### Modo Desarrollo

Las actualizaciones están **deshabilitadas** en modo desarrollo (`NODE_ENV=development`).

### Modo Producción Local

Para probar sin publicar:

```bash
# 1. Crear build de prueba
npm run build-exe

# 2. Instalar desde dist-installer/
# En Windows: ejecutar GloryView Proyector-X.X.X-Installer.exe

# 3. En main.js, comentar la verificación de producción temporalmente:
// if (process.env.NODE_ENV !== 'development') {
  autoUpdater.checkForUpdates();
// }
```

### Servidor Local de Prueba

```bash
# 1. Instalar servidor HTTP simple
npm install -g http-server

# 2. Servir la carpeta dist-installer
cd dist-installer
http-server -p 8080 --cors

# 3. Actualizar electron-builder.yml temporalmente:
publish:
  provider: generic
  url: http://localhost:8080

# 4. Probar con la app instalada
```

## 📝 Notas de Versión

Para agregar notas de versión que se muestren al usuario:

```json
// package.json
{
  "version": "0.3.0",
  "description": "GloryView Proyector - Aplicación de proyección para iglesias",
  "releaseNotes": "- Nueva funcionalidad de control remoto\\n- Mejoras en el rendimiento\\n- Corrección de errores"
}
```

O crear un archivo `CHANGELOG.md` y agregar en `electron-builder.yml`:

```yaml
releaseInfo:
  releaseNotes: ${changelog}
```

## 🔒 Seguridad

### Code Signing (Recomendado para Producción)

```bash
# Windows
export WIN_CSC_LINK=ruta/a/certificado.pfx
export WIN_CSC_KEY_PASSWORD=password_del_certificado

# macOS
export CSC_LINK=ruta/a/certificado.p12
export CSC_KEY_PASSWORD=password_del_certificado

npm run build-exe
```

**Beneficios:**
- Evita advertencias de seguridad de Windows/macOS
- Los usuarios confían más en la app
- Actualizaciones verificadas criptográficamente

### Verificación de Actualizaciones

Por defecto, `electron-updater` verifica las firmas digitales de las actualizaciones.

```javascript
// En main.js
autoUpdater.autoDownload = false; // ✅ Preguntar al usuario primero
autoUpdater.autoInstallOnAppQuit = true; // ✅ Instalar al cerrar
```

## 🐛 Troubleshooting

### La app no detecta actualizaciones

1. Verificar que la URL del servidor sea correcta
2. Revisar logs en `%APPDATA%/GloryView Proyector/gloryview-error.log`
3. Comprobar que `latest.yml` sea accesible: `curl https://tu-servidor/latest.yml`

### Error "Cannot find latest.yml"

- El archivo `latest.yml` debe estar en la raíz de la URL configurada
- Verificar permisos de lectura pública (para S3/servidor web)

### Las actualizaciones se descargan pero no se instalan

- Verificar que `autoInstallOnAppQuit` esté en `true`
- Asegurarse de que la app tenga permisos de escritura en Program Files

### Errores de firma digital

```bash
# Deshabilitar verificación (solo para desarrollo)
autoUpdater.autoDownload = false;
autoUpdater.allowDowngrade = true;
```

## 📊 Monitoreo

### Logs de Actualización

Los eventos de actualización se registran en:

**Windows:** `C:\Users\{usuario}\AppData\Roaming\GloryView Proyector\gloryview-error.log`

Buscar líneas con:
- `🔍 Verificando actualizaciones...`
- `✅ Nueva actualización disponible`
- `📥 Descargando actualización`
- `❌ Error en autoUpdater`

### Eventos Principales

```javascript
autoUpdater.on('checking-for-update', ...) // Verificando
autoUpdater.on('update-available', ...)    // Nueva versión
autoUpdater.on('download-progress', ...)   // Progreso de descarga
autoUpdater.on('update-downloaded', ...)   // Lista para instalar
autoUpdater.on('error', ...)               // Errores
```

## 📦 Estructura de Archivos de Actualización

```
latest.yml              → Metadatos de la última versión
{appName}-{version}.exe → Instalador completo
{appName}-{version}.exe.blockmap → Mapeo para descarga diferencial
```

El archivo `latest.yml` contiene:

```yaml
version: 0.3.0
files:
  - url: GloryView Proyector-0.3.0-Installer.exe
    sha512: ...
    size: 123456789
path: GloryView Proyector-0.3.0-Installer.exe
sha512: ...
releaseDate: '2026-04-12T12:00:00.000Z'
```

## 🚀 Mejores Prácticas

1. **Incrementar versión antes de cada build**: Editar `package.json`
2. **Probar actualizaciones localmente**: Usar servidor HTTP local
3. **Firmar instaladores**: Usar certificado de code signing
4. **Backup de versiones antiguas**: Mantener al menos 2 versiones
5. **Notas de versión claras**: Explicar cambios al usuario
6. **Monitorear logs**: Revisar errores de actualización
7. **Canal de publicación**: Considerar canales beta/stable

## 📖 Recursos

- [electron-updater docs](https://www.electron.build/auto-update)
- [Code Signing Guide](https://www.electron.build/code-signing)
- [AWS S3 Setup](https://docs.aws.amazon.com/s3/index.html)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)

---

**Versión del documento:** 1.0.0  
**Última actualización:** Abril 2026  
**Autor:** Alfredo Hammer
