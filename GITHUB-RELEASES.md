# 🚀 Guía Rápida: GitHub Releases

Esta guía te ayudará a configurar y usar GitHub Releases para distribuir actualizaciones automáticas de GloryView.

## 📋 Requisitos Previos

- ✅ Cuenta de GitHub
- ✅ Repositorio: `Alfredo-Hammer/my-church-proyector`
- ✅ Node.js y npm instalados
- ✅ Proyecto configurado localmente

## 🔑 Paso 1: Generar Token de GitHub

1. Ve a: https://github.com/settings/tokens
2. Click en **"Generate new token"** → **"Generate new token (classic)"**
3. Nombre del token: `GloryView Releases`
4. Selecciona los permisos:
   - ✅ **repo** (acceso completo al repositorio)
5. Click en **"Generate token"**
6. **⚠️ IMPORTANTE:** Copia el token AHORA (solo se muestra una vez)

## ⚙️ Paso 2: Configurar Token Localmente

### Opción A: Archivo .env (Recomendado)

```bash
# 1. Copia el archivo de ejemplo
cp .env.example .env

# 2. Edita .env y pega tu token
# Reemplaza "tu_github_token_aqui" con tu token real
GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Opción B: Variable de Entorno (Temporal)

**Windows (PowerShell):**
```powershell
$env:GH_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Windows (CMD):**
```cmd
set GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**macOS/Linux:**
```bash
export GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 📦 Paso 3: Crear una Nueva Versión

### 1. Incrementar Versión

Edita `package.json`:
```json
{
  "version": "0.3.0"  // ← Cambia esto
}
```

### 2. Commit de Cambios (Opcional pero Recomendado)

```bash
git add .
git commit -m "v0.3.0 - Descripción de cambios"
git push origin master
```

### 3. Compilar y Publicar

```bash
npm run release-github
```

Este comando:
- ✅ Compila la aplicación React
- ✅ Empaqueta con electron-builder
- ✅ Crea un release en GitHub automáticamente
- ✅ Sube los archivos (.exe, .blockmap, latest.yml)

## 📝 Paso 4: Verificar el Release

1. Ve a: https://github.com/Alfredo-Hammer/my-church-proyector/releases
2. Deberías ver tu nuevo release: **v0.3.0**
3. Archivos incluidos:
   - `GloryView Proyector-0.3.0-Installer.exe`
   - `GloryView Proyector-0.3.0-Installer.exe.blockmap`
   - `latest.yml`

## 🧪 Paso 5: Probar la Actualización

1. **Instala la versión anterior** (0.2.0) en tu computadora
2. **Abre GloryView**
3. Espera 5 segundos o usa: **Ayuda → Buscar Actualizaciones**
4. Deberías ver un modal con la nueva versión disponible
5. Click en **"Descargar"**
6. Una vez descargada, click en **"Instalar Ahora"**
7. La app se reiniciará con la nueva versión

## 🔄 Flujo de Trabajo Completo

```bash
# 1. Hacer cambios en el código
git add .
git commit -m "feat: nueva funcionalidad"

# 2. Incrementar versión
# Editar package.json: "version": "0.3.0"

# 3. Crear release
npm run release-github

# 4. Verificar en GitHub
# https://github.com/Alfredo-Hammer/my-church-proyector/releases

# 5. Las apps instaladas recibirán la notificación automáticamente
```

## 🎯 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run release-github` | Publica automáticamente a GitHub Releases |
| `npm run release-draft` | Crea un draft (borrador) para revisión manual |
| `npm run build-exe` | Solo compila sin publicar |

## 📋 Draft Release (Borrador)

Si quieres revisar antes de publicar:

```bash
# 1. Crear draft
npm run release-draft

# 2. Ve a GitHub Releases
# https://github.com/Alfredo-Hammer/my-church-proyector/releases

# 3. Edita el draft:
#    - Agrega descripción
#    - Agrega changelog
#    - Marca las casillas necesarias

# 4. Click en "Publish release"
```

## 📝 Agregar Notas de Versión

### Opción 1: En GitHub (Manual)

1. Ve al release en GitHub
2. Click en **"Edit"**
3. Agrega descripción en el editor
4. Click en **"Update release"**

### Opción 2: En package.json (Automático)

```json
{
  "version": "0.3.0",
  "releaseNotes": "### Novedades\n- Nueva funcionalidad X\n- Mejora en Y\n- Corrección de bug Z"
}
```

### Opción 3: Con CHANGELOG.md

Crea un archivo `CHANGELOG.md`:

```markdown
# Changelog

## [0.3.0] - 2026-04-12

### Agregado
- Control remoto desde app móvil
- Sistema de actualizaciones automático

### Mejorado
- Rendimiento de multimedia
- Interfaz de usuario

### Corregido
- Error al proyectar videos grandes
- Crash en Windows 10
```

## 🐛 Troubleshooting

### Error: "GitHub token is not set"

```bash
# Verifica que GH_TOKEN esté configurado
echo $env:GH_TOKEN  # Windows PowerShell
echo $GH_TOKEN      # macOS/Linux

# Si está vacío, configúralo según el Paso 2
```

### Error: "Cannot create release"

- Verifica que el token tenga permisos de `repo`
- Asegúrate de que el repositorio sea el correcto
- Comprueba que no exista ya un release con ese tag

### Error: "Version already published"

- Ya existe un release con esa versión
- Incrementa el número de versión en package.json
- O elimina el release anterior en GitHub

### El update no se detecta

- Verifica que el release sea público (no draft)
- Espera hasta 5 minutos para propagación
- Revisa logs en: `%APPDATA%/GloryView Proyector/gloryview-error.log`

## 🔐 Seguridad

### ⚠️ IMPORTANTE: Proteger tu Token

1. **NUNCA** subas `.env` a GitHub
2. **NUNCA** compartas tu token de GitHub
3. Si el token se compromete:
   - Ve a https://github.com/settings/tokens
   - Revoca el token comprometido
   - Genera uno nuevo

### Verificar .gitignore

```bash
# Verifica que .env esté ignorado
cat .gitignore | grep .env

# Debe mostrar:
# .env
# .env.local
# etc.
```

## 📊 Monitoreo de Releases

### Ver estadísticas

1. Ve a: https://github.com/Alfredo-Hammer/my-church-proyector/releases
2. Cada release muestra:
   - Número de descargas
   - Fecha de publicación
   - Assets (archivos)

### Analytics

GitHub Insights muestra:
- Traffic → Views (vistas del repo)
- Releases → Downloads por archivo

## 🚀 Automatización con GitHub Actions (Opcional)

Puedes automatizar releases con GitHub Actions:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run release-github
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 📖 Recursos

- [GitHub Personal Access Tokens](https://github.com/settings/tokens)
- [electron-builder Publishing](https://www.electron.build/configuration/publish)
- [GitHub Releases Docs](https://docs.github.com/en/repositories/releasing-projects-on-github)

---

**¿Necesitas ayuda?**
- 📧 Email: coderhammer70@gmail.com
- 📝 Documentación completa: [ACTUALIZACIONES.md](ACTUALIZACIONES.md)
