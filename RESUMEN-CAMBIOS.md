# Resumen de cambios - Corrección problema de inicio en producción

## ¿Qué estaba pasando?

La aplicación no iniciaba cuando se instalaba desde el `.exe` de GitHub Actions porque:

1. **La ventana principal se creaba ANTES de que el servidor Express estuviera listo**
2. Cuando la ventana intentaba cargar `http://localhost:3001`, el servidor no estaba escuchando aún
3. Resultado: pantalla blanca o ventana que no se mostraba

## Solución implementada

### 1. Servidor como Promesa ✅
- `iniciarServidorMultimedia()` ahora devuelve una `Promise`
- Se resuelve solo cuando el servidor está escuchando en puerto 3001
- Permite usar `await` para esperar sincronización correcta

### 2. Orden de inicialización corregido ✅
**Nuevo flujo en `app.whenReady()`:**
```
Base de datos → Handlers IPC → Verificar archivos build → 
→ INICIAR SERVIDOR Y ESPERAR → Esperar 2s → 
→ Crear ventana principal → Crear proyector
```

**Antes (incorrecto):**
```
Base de datos → Handlers → Crear ventana → Iniciar servidor
                              ↑ ERROR: ventana intenta cargar pero servidor no está listo
```

### 3. Verificación de integridad ✅
En producción, antes de crear ventanas:
- Verifica que `build/` exista
- Verifica que `index.html` exista
- Lista archivos disponibles en el log
- Muestra error claro si faltan archivos

### 4. Logging mejorado ✅
Ahora se registra:
- ✅ Cada paso exitoso de inicialización
- ❌ Todos los errores con stack trace
- 🌐 Eventos de carga de página (inicio, fin, error)
- 🔧 Estado del servidor Express
- 📁 Rutas de archivos verificados

### 5. Manejo de errores mejorado ✅
- Detecta cuando `loadURL()` falla
- Detecta errores de carga de página
- Muestra diálogos informativos al usuario
- Escribe todo al log para diagnóstico

## Archivos modificados

### main.js (~5400 líneas)
- **Línea ~409**: `iniciarServidorMultimedia()` ahora devuelve Promise
- **Línea ~2370**: Servidor resuelve Promise al estar listo
- **Línea ~3160-3270**: Orden de inicialización corregido
- **Línea ~2540-2590**: Logging mejorado en `createMainWindow()`

### Archivos nuevos creados

1. **SOLUCION-PROBLEMA-INICIO.md**
   - Explicación completa del problema
   - Guía de diagnóstico paso a paso
   - Ubicación de logs
   - Errores comunes y soluciones

2. **diagnostico-windows.ps1**
   - Script automatizado de diagnóstico
   - Verifica procesos, puerto, firewall, logs
   - Muestra últimas líneas del log
   - Acciones recomendadas automáticas

3. **CLAUDE.md** (actualizado)
   - Nueva sección "Orden de inicialización"
   - Nueva sección "Diagnóstico de problemas"
   - Ejemplos de código correcto/incorrecto
   - Reglas para prevenir errores futuros

## Cómo probar la solución

### Opción 1: Testing local (recomendado antes de push)

```bash
# 1. Limpiar builds anteriores
rm -rf build dist-installer

# 2. Instalar dependencias (si hay cambios)
npm ci

# 3. Build completo
npm run build

# 4. Crear ejecutable Windows
npm run build-exe-win

# 5. Ubicar instalador
cd dist-installer
# Ejecutar: GloryView Proyector-0.2.0-Installer.exe
```

En Windows:
- Instalar el `.exe` generado
- Iniciar la aplicación
- Si hay problema, revisar log en: `%APPDATA%\GloryView Proyector\gloryview-error.log`
- Ejecutar el script de diagnóstico: `.\diagnostico-windows.ps1`

### Opción 2: Testing con GitHub Actions

1. Push de los cambios:
```bash
git add main.js SOLUCION-PROBLEMA-INICIO.md diagnostico-windows.ps1 CLAUDE.md
git commit -m "Fix: Corregir problema de inicio en producción - servidor antes de ventanas"
git push origin master
```

2. El workflow `.github/workflows/build-windows.yml` se ejecutará automáticamente

3. Descargar artefactos desde GitHub Actions:
   - Ve a: Actions → Build Windows Executable → último run
   - Descarga: "GloryView-Windows-Installer"
   - Extrae y ejecuta el `.exe`

### Opción 3: Desarrollo local (sin build)

```bash
npm run electron-dev
```

Esto **NO** reproducirá el problema porque en desarrollo:
- Carga desde `http://localhost:3000` (React dev server)
- No usa el servidor Express para servir la UI
- El orden de inicialización es menos crítico

## Verificación del fix

### Señales de éxito ✅

En el log (`gloryview-error.log`) deberías ver:
```
[timestamp] ✅ Electron app ready - Iniciando GloryView Proyector
[timestamp] ✅ Base de datos inicializada correctamente
[timestamp] ✅ Handlers registrados
[timestamp] ✅ Archivos esenciales del build verificados correctamente
[timestamp] Iniciando servidor Express en puerto 3001...
[timestamp] ✅ [Servidor] Express escuchando en puerto 3001
[timestamp] ✅ Servidor Express completamente listo
[timestamp] Creando ventana principal...
[timestamp] Intentando cargar URL: http://localhost:3001
[timestamp] ✅ Inicio de carga de página detectado
[timestamp] ✅ Página cargada completamente
[timestamp] ✅ Ventana principal creada
[timestamp] ✅ GloryView Proyector iniciado exitosamente
```

Y la aplicación debería:
- ✅ Abrir ventana principal maximizada
- ✅ Mostrar interfaz de usuario correctamente
- ✅ Funcionar normalmente

### Señales de que aún hay problema ❌

- Ventana blanca / vacía
- App no aparece después de instalación
- Log muestra: `❌ Error cargando URL http://localhost:3001`
- Log muestra: `❌ Error al cargar página: ERR_CONNECTION_REFUSED`

Si esto ocurre:
1. Ejecutar `diagnostico-windows.ps1`
2. Revisar log completo
3. Verificar que no haya instancias anteriores corriendo
4. Verificar que el puerto 3001 esté libre

## Comandos útiles para diagnóstico

### Windows PowerShell

```powershell
# Ver log en tiempo real (mientras la app inicia)
Get-Content "$env:APPDATA\GloryView Proyector\gloryview-error.log" -Wait -Tail 20

# Ver solo errores en el log
Get-Content "$env:APPDATA\GloryView Proyector\gloryview-error.log" | Select-String "❌"

# Cerrar todas las instancias
Stop-Process -Name "GloryViewProyector" -Force

# Verificar si el puerto 3001 está en uso
Get-NetTCPConnection -LocalPort 3001

# Liberar puerto 3001 (si está ocupado)
$pid = (Get-NetTCPConnection -LocalPort 3001).OwningProcess
Stop-Process -Id $pid -Force

# Ejecutar script de diagnóstico completo
.\diagnostico-windows.ps1
```

## Próximos pasos

### Antes de merge/release:

1. ✅ **Probar localmente** con `npm run build-exe-win`
2. ✅ **Instalar y ejecutar** el `.exe` generado
3. ✅ **Revisar log** — debe mostrar secuencia correcta
4. ✅ **Verificar funcionalidad** — probar características principales

### Después de confirmar que funciona:

1. Push a master
2. Verificar que GitHub Actions complete exitosamente
3. Descargar artefacto y probar en máquina limpia (VM recomendado)
4. Si todo OK, crear release/tag

### Para futuro mantenimiento:

- **NO modificar** el orden de inicialización sin revisar dependencias
- **SIEMPRE** usar `await iniciarServidorMultimedia()` antes de crear ventanas
- **MANTENER** logging detallado en cambios críticos
- **PROBAR** builds de producción, no solo desarrollo

## Información adicional

### ¿Por qué necesita esperar 2 segundos después del servidor?

```js
await iniciarServidorMultimedia(); // servidor escuchando
await new Promise(resolve => setTimeout(resolve, 2000)); // estabilidad
createMainWindow(); // ahora sí cargar
```

Los 2 segundos dan tiempo a:
- Sistema operativo completar bind del puerto
- Stack TCP/IP estar completamente listo
- Express terminar inicialización interna
- Evitar race conditions en sistemas lentos

En desarrollo esto no es tan crítico, pero en producción (especialmente en PCs con antivirus, poco RAM, etc) puede ser la diferencia entre éxito y fallo.

### ¿Por qué `iniciarServidorMultimedia()` devuelve Promise ahora?

Antes:
```js
function iniciarServidorMultimedia() {
  const servidor = expressApp.listen(3001, () => {
    console.log("Servidor listo");
  });
  // Función termina ANTES de que el servidor esté listo
}

iniciarServidorMultimedia(); // no espera
createWindow(); // ❌ servidor no está listo
```

Ahora:
```js
function iniciarServidorMultimedia() {
  return new Promise((resolve) => {
    const servidor = expressApp.listen(3001, () => {
      console.log("Servidor listo");
      resolve(); // ✅ señal de que está listo
    });
  });
}

await iniciarServidorMultimedia(); // espera a que resuelva
createWindow(); // ✅ servidor garantizado listo
```

## Contacto/Soporte

Si después de implementar estos cambios el problema persiste:

1. Recopilar:
   - Log completo (`gloryview-error.log`)
   - Output del script de diagnóstico
   - Screenshot de error (si visible)
   - Versión de Windows

2. Reportar en GitHub Issues con toda la información

---

**Autor:** GitHub Copilot (Claude Sonnet 4.5)  
**Fecha:** 15 de marzo de 2026  
**Versión aplicación:** 0.2.0+
