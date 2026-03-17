# Script de diagnóstico para GloryView Proyector
# Ejecutar en PowerShell como Administrador

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GloryView Proyector - Diagnóstico" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar versión de Windows
Write-Host "[1/8] Verificando sistema operativo..." -ForegroundColor Yellow
$os = Get-CimInstance Win32_OperatingSystem
Write-Host "  ✓ Windows $($os.Version) - $($os.Caption)" -ForegroundColor Green
Write-Host ""

# 2. Verificar si GloryView está instalado
Write-Host "[2/8] Buscando instalación de GloryView..." -ForegroundColor Yellow
$appDataPath = "$env:APPDATA\GloryView Proyector"
$programFilesPath = "$env:LOCALAPPDATA\Programs\GloryView Proyector"

if (Test-Path $appDataPath) {
    Write-Host "  ✓ Datos de aplicación encontrados en: $appDataPath" -ForegroundColor Green
} else {
    Write-Host "  ✗ No se encontraron datos en: $appDataPath" -ForegroundColor Red
}

if (Test-Path $programFilesPath) {
    Write-Host "  ✓ Instalación encontrada en: $programFilesPath" -ForegroundColor Green
} else {
    Write-Host "  ℹ Instalación no encontrada en: $programFilesPath" -ForegroundColor Yellow
}
Write-Host ""

# 3. Verificar procesos en ejecución
Write-Host "[3/8] Verificando procesos en ejecución..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object { $_.ProcessName -like "*GloryView*" -or $_.ProcessName -like "*Electron*" }
if ($processes) {
    Write-Host "  ⚠ Procesos encontrados:" -ForegroundColor Yellow
    foreach ($proc in $processes) {
        Write-Host "    - $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Cyan
    }
    Write-Host "  ℹ Ejecute este comando para cerrarlos:" -ForegroundColor Yellow
    Write-Host "    Stop-Process -Name 'GloryViewProyector' -Force" -ForegroundColor White
} else {
    Write-Host "  ✓ No hay procesos de GloryView en ejecución" -ForegroundColor Green
}
Write-Host ""

# 4. Verificar puerto 3001
Write-Host "[4/8] Verificando puerto 3001..." -ForegroundColor Yellow
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port3001) {
    Write-Host "  ⚠ Puerto 3001 está en uso:" -ForegroundColor Yellow
    foreach ($conn in $port3001) {
        $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "    - Proceso: $($process.ProcessName) (PID: $($conn.OwningProcess))" -ForegroundColor Cyan
        }
    }
    Write-Host "  ℹ Ejecute este comando para liberar el puerto:" -ForegroundColor Yellow
    Write-Host "    Stop-Process -Id $($port3001[0].OwningProcess) -Force" -ForegroundColor White
} else {
    Write-Host "  ✓ Puerto 3001 está libre" -ForegroundColor Green
}
Write-Host ""

# 5. Verificar firewall
Write-Host "[5/8] Verificando reglas de firewall..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "GloryView Proyector - Puerto 3001" -ErrorAction SilentlyContinue
if ($firewallRule) {
    Write-Host "  ✓ Regla de firewall encontrada: $($firewallRule.DisplayName)" -ForegroundColor Green
    Write-Host "    Estado: $($firewallRule.Enabled)" -ForegroundColor Cyan
} else {
    Write-Host "  ⚠ Regla de firewall no encontrada" -ForegroundColor Yellow
    Write-Host "  ℹ GloryView intentará crearla automáticamente al iniciar" -ForegroundColor Yellow
}
Write-Host ""

# 6. Verificar archivo de log
Write-Host "[6/8] Verificando archivo de log..." -ForegroundColor Yellow
$logPath = "$appDataPath\gloryview-error.log"
if (Test-Path $logPath) {
    $logSize = (Get-Item $logPath).Length
    $logModified = (Get-Item $logPath).LastWriteTime
    Write-Host "  ✓ Log encontrado: $logPath" -ForegroundColor Green
    Write-Host "    Tamaño: $([math]::Round($logSize/1KB, 2)) KB" -ForegroundColor Cyan
    Write-Host "    Última modificación: $logModified" -ForegroundColor Cyan
    
    # Mostrar últimas 20 líneas del log
    Write-Host ""
    Write-Host "  📋 Últimas 20 líneas del log:" -ForegroundColor Cyan
    Write-Host "  " + ("-" * 60) -ForegroundColor Gray
    Get-Content $logPath -Tail 20 | ForEach-Object {
        if ($_ -match "✅") {
            Write-Host "  $_" -ForegroundColor Green
        } elseif ($_ -match "❌") {
            Write-Host "  $_" -ForegroundColor Red
        } elseif ($_ -match "⚠️") {
            Write-Host "  $_" -ForegroundColor Yellow
        } else {
            Write-Host "  $_" -ForegroundColor Gray
        }
    }
    Write-Host "  " + ("-" * 60) -ForegroundColor Gray
} else {
    Write-Host "  ℹ Log no encontrado (la app no se ha ejecutado aún)" -ForegroundColor Yellow
}
Write-Host ""

# 7. Verificar base de datos
Write-Host "[7/8] Verificando base de datos..." -ForegroundColor Yellow
$dbPath = "$appDataPath\gloryview.db"
if (Test-Path $dbPath) {
    $dbSize = (Get-Item $dbPath).Length
    Write-Host "  ✓ Base de datos encontrada: $dbPath" -ForegroundColor Green
    Write-Host "    Tamaño: $([math]::Round($dbSize/1KB, 2)) KB" -ForegroundColor Cyan
} else {
    Write-Host "  ℹ Base de datos no encontrada (se creará al iniciar)" -ForegroundColor Yellow
}
Write-Host ""

# 8. Verificar conectividad localhost
Write-Host "[8/8] Verificando conectividad localhost..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/ping" -TimeoutSec 2 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Servidor respondiendo en puerto 3001" -ForegroundColor Green
        $content = $response.Content | ConvertFrom-Json
        Write-Host "    Aplicación: $($content.app)" -ForegroundColor Cyan
        Write-Host "    Versión: $($content.version)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  ℹ Servidor no está ejecutándose (esto es normal si la app está cerrada)" -ForegroundColor Yellow
}
Write-Host ""

# Resumen
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "          RESUMEN DEL DIAGNÓSTICO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Contar problemas
$problemasEncontrados = @()

if (-not (Test-Path $appDataPath)) {
    $problemasEncontrados += "Datos de aplicación no encontrados"
}

if ($processes) {
    $problemasEncontrados += "Proceso(s) de GloryView en ejecución"
}

if ($port3001) {
    $problemasEncontrados += "Puerto 3001 ocupado"
}

if (-not $firewallRule) {
    $problemasEncontrados += "Regla de firewall faltante (se creará automáticamente)"
}

if (-not (Test-Path $dbPath)) {
    $problemasEncontrados += "Base de datos no inicializada (normal en primera ejecución)"
}

if ($problemasEncontrados.Count -eq 0) {
    Write-Host "  ✓ No se encontraron problemas críticos" -ForegroundColor Green
    Write-Host "  ℹ Si la aplicación no inicia, revise el log en:" -ForegroundColor Yellow
    Write-Host "    $logPath" -ForegroundColor White
} else {
    Write-Host "  ⚠ Se encontraron $($problemasEncontrados.Count) posibles problemas:" -ForegroundColor Yellow
    foreach ($problema in $problemasEncontrados) {
        Write-Host "    - $problema" -ForegroundColor Yellow
    }
}
Write-Host ""

# Acciones recomendadas
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       ACCIONES RECOMENDADAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($processes -or $port3001) {
    Write-Host "1. Cerrar procesos de GloryView:" -ForegroundColor Yellow
    Write-Host "   Stop-Process -Name 'GloryViewProyector' -Force" -ForegroundColor White
    Write-Host ""
}

if (Test-Path $logPath) {
    Write-Host "2. Abrir archivo de log completo:" -ForegroundColor Yellow
    Write-Host "   notepad `"$logPath`"" -ForegroundColor White
    Write-Host ""
}

Write-Host "3. Reiniciar GloryView Proyector" -ForegroundColor Yellow
Write-Host ""

Write-Host "4. Si el problema persiste:" -ForegroundColor Yellow
Write-Host "   - Abrir DevTools con F12 al iniciar" -ForegroundColor White
Write-Host "   - Revisar Console para errores" -ForegroundColor White
Write-Host "   - Reportar en GitHub con el log completo" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Preguntar si desea abrir el log
if (Test-Path $logPath) {
    $openLog = Read-Host "¿Desea abrir el archivo de log ahora? (S/N)"
    if ($openLog -eq "S" -or $openLog -eq "s") {
        notepad $logPath
    }
}

# Preguntar si desea cerrar procesos
if ($processes) {
    $killProcesses = Read-Host "¿Desea cerrar los procesos de GloryView ahora? (S/N)"
    if ($killProcesses -eq "S" -or $killProcesses -eq "s") {
        Stop-Process -Name "GloryViewProyector" -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Procesos cerrados" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Diagnóstico completado. Presione cualquier tecla para salir..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
