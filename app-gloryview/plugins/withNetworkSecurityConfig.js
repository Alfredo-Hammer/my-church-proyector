/**
 * Expo plugin: genera un network_security_config.xml que permite HTTP cleartext
 * a todas las IPs privadas (192.168.x.x, 10.x.x.x, 172.16-31.x.x).
 *
 * Esto es más robusto que solo `usesCleartextTraffic: true` en app.json porque
 * algunos plugins de React Native agregan su propio networkSecurityConfig que
 * puede sobreescribir el atributo del manifest.
 */

const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// El proyector puede estar en cualquier IP de la red local (192.168.x.x, 10.x.x.x, etc.)
// y no lo sabemos en tiempo de compilación, así que permitimos cleartext global.
// Esto es equivalente a usesCleartextTraffic="true" pero sobrevive si otro plugin
// agrega su propio networkSecurityConfig que sobreescriba el atributo del manifest.
const NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

const withNetworkSecurityConfig = (config) => {
  // Paso 1: escribir el archivo XML en la carpeta de recursos de Android
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), NETWORK_SECURITY_XML, 'utf8');
      return cfg;
    },
  ]);

  // Paso 2: referenciar el archivo desde AndroidManifest.xml
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = manifest?.manifest?.application?.[0];
    if (app) {
      app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
      // Mantener usesCleartextTraffic como respaldo para API < 24
      app.$['android:usesCleartextTraffic'] = 'true';
    }
    return cfg;
  });

  return config;
};

module.exports = withNetworkSecurityConfig;
