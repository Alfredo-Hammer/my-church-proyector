# Guía para Generar APK de GloryView Mobile

## Requisitos Previos

1. **Cuenta de Expo** (gratuita)
   - Crea una cuenta en [expo.dev](https://expo.dev)

2. **EAS CLI instalado globalmente**
   ```bash
   npm install -g eas-cli
   ```

3. **Iniciar sesión en EAS**
   ```bash
   eas login
   ```

## Opciones de Build

### 1. APK Preview (Recomendado para pruebas)
Este build es ideal para probar en dispositivos reales sin necesidad de publicar en Play Store.

```bash
cd app-gloryview
npm run build:preview
```

O directamente:
```bash
eas build --platform android --profile preview
```

**Características:**
- ✅ APK independiente (no requiere Expo Go)
- ✅ Build más rápido
- ✅ Perfecto para compartir con testers
- ✅ No requiere configuración de certificados

### 2. Development Build (Para desarrollo activo)
Si necesitas debugging avanzado y hot reload:

```bash
npm run build:dev
```

**Características:**
- ✅ Incluye Expo Dev Client
- ✅ Hot reload sobre la red
- ✅ Debugging tools
- ⚠️ Requiere metro bundler corriendo (`expo start --dev-client`)

## Proceso de Build

1. **Navegar a la carpeta de la app**
   ```bash
   cd app-gloryview
   ```

2. **Verificar configuración** (ya está lista)
   - ✅ `app.json` configurado
   - ✅ `eas.json` configurado
   - ✅ Permisos de Android configurados

3. **Iniciar el build**
   ```bash
   npm run build:preview
   ```

4. **Esperar el build** (10-15 minutos en la nube de Expo)
   - El CLI mostrará el progreso
   - Puedes seguirlo en la web: https://expo.dev/accounts/edu-aoc/projects/app-gloryview/builds

5. **Descargar el APK**
   - Al finalizar, el CLI mostrará un link de descarga
   - También puedes descargarlo desde el dashboard de Expo

## Instalar APK en Android

### Método 1: Descarga directa en el dispositivo
1. En tu móvil, abre el link del APK que generó EAS
2. Descarga el APK
3. Android pedirá permisos para instalar apps de fuentes desconocidas
4. Acepta e instala

### Método 2: Transferencia por cable (ADB)
```bash
adb install ruta/al/archivo.apk
```

### Método 3: Compartir por email/drive
1. Descarga el APK en tu computadora
2. Súbelo a Google Drive o envíalo por email
3. Ábrelo desde tu móvil Android

## Configuración de Red

⚠️ **IMPORTANTE**: Para que la app se conecte al proyector:

1. **Asegúrate que el dispositivo móvil y el servidor GloryView están en la misma red WiFi**

2. **El servidor debe estar corriendo en el PC**
   ```bash
   # En la carpeta principal del proyecto
   npm run electron-dev
   ```

3. **La app buscará automáticamente el servidor en la red local**
   - Puerto por defecto: 3001
   - Protocolo: HTTP (cleartext habilitado en Android)

## Troubleshooting

### Error: "Not logged in"
```bash
eas login
```

### Error: "Project not linked"
```bash
eas build:configure
```

### Build falla por recursos
- Los builds gratuitos tienen un límite mensual
- Considera usar el plan de pago o esperar al próximo mes

### APK no se conecta al servidor
1. Verifica que ambos dispositivos estén en la misma red
2. Verifica que el servidor esté corriendo (puerto 3001)
3. Revisa el firewall del PC (debe permitir conexiones entrantes)

## Información del Proyecto

- **Package**: `com.gloryview.remote`
- **Owner**: `edu-aoc`
- **Project ID**: `e78b0151-3f82-4963-832f-4485f09b307e`

## Comandos Rápidos

```bash
# Generar APK de prueba
npm run build:preview

# Ver builds anteriores
eas build:list

# Ver detalles de un build
eas build:view [BUILD_ID]

# Cancelar un build en progreso
eas build:cancel
```

## Próximos Pasos

Una vez que tengas el APK instalado:

1. Abre la app en tu móvil
2. Asegúrate que el servidor GloryView esté corriendo
3. La app debería detectar automáticamente el servidor
4. Escanea el código QR que muestra el servidor (si está implementado)
5. ¡Comienza a controlar el proyector desde tu móvil!
