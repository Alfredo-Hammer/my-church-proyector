# Solución: Problema de inicio en producción (Windows)

## Problema identificado

La aplicación no iniciaba cuando se instalaba desde el archivo `.exe` generado por GitHub Actions. El problema ocurría porque:

1. **Orden de inicialización incorrecto**: La ventana principal intentaba cargar `http://localhost:3001` ANTES de que el servidor Express estuviera escuchando conexiones.
2. **Falta de sincronización**: No había garantía de que el servidor estuviera completamente listo antes de intentar cargar la aplicación.
3. **Logging insuficiente**: No había suficiente información de diagnóstico para identificar dónde fallaba exactamente.

## Cambios implementados

### 1. Servidor Express como Promesa
- Modificado `iniciarServidorMultimedia()` para devolver una `Promise` que se resuelve cuando el servidor está escuchando.
- Esto permite usar `await` para esperar a que el servidor esté completamente listo.

### 2. Orden de inicialización corregido
**Nuevo orden en `app.whenReady()`:**
1. Inicializar base de datos
2. Limpiar y registrar handlers IPC
3. **Verificar integridad de archivos del build** (solo producción)
4. **Iniciar servidor Express y esperar** ← NUEVO
5. Esperar 2 segundos adicionales para estabilidad
6. Crear ventana principal
7. Crear ventana proyector (si hay segunda pantalla)
8. Registrar atajos de teclado

### 3. Verificación de integridad del build
En producción, antes de crear ventanas:
- Verificar que el directorio `build/` exista
- Verificar que `index.html` exista
- Listar archivos disponibles en el log
- Mostrar error claro si faltan archivos

### 4. Logging mejorado
**Archivos de log**:
- Ubicación: `%APPDATA%\GloryView Proyector\gloryview-error.log` (Windows)
- Se registran todos los pasos de inicialización
- Errores incluyen stack trace completo

**Información registrada**:
- ✅ Cada paso de inicialización exitoso
- ❌ Todos los errores con detalles
- 📁 Rutas de archivos verificados
- 🌐 URLs de carga y eventos de navegación
- 🔧 Estado del servidor Express

### 5. Manejo de errores de carga
La ventana principal ahora detecta y reporta:
- Errores al cargar URL
- Fallos de carga de página (con código de error)
- Eventos de navegación (inicio, fin, error)

## Cómo diagnosticar problemas

### 1. Ubicar el archivo de log
**Windows:**
```
C:\Users\{TU_USUARIO}\AppData\Roaming\GloryView Proyector\gloryview-error.log
```

**Acceso rápido:**
- Presiona `Windows+R`
- Escribe: `%APPDATA%\GloryView Proyector`
- Presiona Enter
- Abre `gloryview-error.log`

### 2. Revisar el log
Busca estos mensajes clave:

**Inicio correcto:**
```
[timestamp] ✅ Electron app ready - Iniciando GloryView Proyector
[timestamp] ✅ Base de datos inicializada correctamente
[timestamp] ✅ Handlers registrados
[timestamp] ✅ Archivos esenciales del build verificados correctamente
[timestamp] ✅ [Servidor] Express escuchando en puerto 3001
[timestamp] ✅ Servidor Express completamente listo
[timestamp] ✅ Ventana principal creada
[timestamp] ✅ Página cargada completamente
```

**Errores comunes y soluciones:**

#### Error: "Puerto 3001 ocupado"
```
⚠️ [Servidor] Puerto 3001 ocupado, intentando liberar...
```
**Solución:** 
- Cerrar todas las instancias de GloryView
- Abrir PowerShell como administrador:
```powershell
Stop-Process -Name "GloryViewProyector" -Force
```

#### Error: "Archivos del build no encontrados"
```
❌ ERROR CRÍTICO: Archivos del build no encontrados: index.html no encontrado
```
**Solución:**
- Reinstalar la aplicación
- Si el problema persiste, reportar bug con el log completo

#### Error: "No se pudo cargar la aplicación"
```
❌ Error cargando URL http://localhost:3001
```
**Solución:**
- Verificar que no haya firewall bloqueando el puerto 3001
- Agregar excepción en Windows Defender/Firewall

### 3. Habilitar DevTools en producción
Si la ventana se abre vacía o con pantalla blanca:

1. Presiona `F12` o `Ctrl+Shift+I`
2. Se abrirán las DevTools de Chrome
3. Ve a la pestaña **Console**
4. Busca errores en rojo
5. Copia los errores y repórtalos

### 4. Probar servidor local manualmente
Abrir navegador y navegar a: `http://localhost:3001`

**Si funciona:** La aplicación debería mostrar la interfaz  
**Si no funciona:** El servidor no está iniciándose correctamente

## Testing local (antes de GitHub Actions)

### 1. Build local
```bash
# Limpiar builds anteriores
rm -rf build dist-installer

# Instalar dependencias
npm ci

# Compilar React
npm run build

# Compilar ejecutable Windows (en Windows o con wine)
npm run build-exe-win
```

### 2. Probar instalador
```bash
# Ubicación del instalador
cd dist-installer
# Ejecutar: GloryView Proyector-x.x.x-Installer.exe
```

### 3. Probar versión portable
```bash
cd dist-installer/win-unpacked
# Ejecutar: GloryViewProyector.exe
```

### 4. Verificar log después de ejecutar
```bash
# Windows PowerShell
Get-Content "$env:APPDATA\GloryView Proyector\gloryview-error.log" -Tail 50
```

## Archivo de configuración para CI/CD

No se requieren cambios en `.github/workflows/build-windows.yml`. El workflow actual es correcto:

```yaml
- name: Compilar React (UI)
  run: npm run build
  env:
    CI: false  # Ignorar warnings de ESLint

- name: Compilar ejecutable Windows
  run: npx electron-builder --win --x64
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Prevención de problemas futuros

### 1. No modificar orden de inicialización
El orden en `app.whenReady()` es crítico. No mover bloques de código sin entender la dependencia.

### 2. Mantener logging detallado
Todos los cambios críticos deben escribir al log con `writeLog()`.

### 3. Testing en producción
Siempre probar el `.exe` instalado antes de publicar release:
- Instalar en máquina limpia (VM o usuario de prueba)
- Verificar que inicie correctamente
- Revisar el log generado

### 4. Sincronización de servidor
Nunca crear ventanas antes de que el servidor esté listo. Usar `await` correctamente.

## Información adicional

### Estructura de inicialización

```
app.whenReady()
├── Configurar nombre app
├── Inicializar base de datos
├── Inicializar fondos por defecto
├── Limpiar handlers IPC
├── Verificar integridad build (producción)
├── Registrar handlers IPC
├── ⚡ INICIAR SERVIDOR EXPRESS
│   ├── Configurar rutas estáticas
│   ├── Configurar endpoints API
│   ├── Escuchar en puerto 3001
│   └── ✅ Resolver promesa cuando esté listo
├── ⏰ Esperar 2s estabilidad
├── Crear ventana principal
│   ├── Cargar http://localhost:3001
│   ├── Escuchar eventos de carga
│   └── Mostrar al terminar carga
├── Detectar segunda pantalla
├── Crear ventana proyector (si aplica)
└── Registrar atajos de teclado
```

### Archivos modificados
- `main.js` (~5400 líneas)
  - Línea ~409: `iniciarServidorMultimedia()` ahora devuelve Promise
  - Línea ~2370: Servidor resuelve Promise al escuchar
  - Línea ~3160-3270: Orden de inicialización corregido en `app.whenReady()`
  - Línea ~2540-2580: Logging mejorado en `createMainWindow()`

## Contacto para soporte

Si después de seguir estos pasos el problema persiste:

1. Recopilar el archivo `gloryview-error.log` completo
2. Capturar screenshot del error (si hay diálogo visible)
3. Incluir información del sistema:
   - Versión de Windows
   - Versión de GloryView instalada
   - ¿Primera instalación o actualización?
4. Reportar en GitHub Issues con toda la información

---

**Última actualización:** 15 de marzo de 2026  
**Versión aplicación:** 0.2.0+
