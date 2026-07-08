// ============================================================
// VALIDACIÓN DE ARCHIVOS: magic numbers + tamaño + extensión
// ============================================================
// Compartido entre dominios (multimedia, logo, presentaciones) — por eso
// vive en ipc/shared/ y no dentro de un solo módulo de dominio.
const LIMITES_MB = {
  logo: 10,
  imagen: 50,
  audio: 500,
  video: 2048,
  documento: 100,
};

const EXTENSIONES_PERMITIDAS = {
  logo: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  imagen: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'],
  video: ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'],
  documento: ['.pdf', '.pptx', '.ppt', '.key'],
};

// Devuelve true si el buffer corresponde al tipo indicado por la extensión
function verificarMagicNumber(buffer, ext) {
  const e = ext.toLowerCase().replace('.', '');
  if (buffer.length < 12) return false;
  switch (e) {
    case 'jpg': case 'jpeg':
      return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    case 'png':
      return buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
    case 'gif':
      return buffer.slice(0, 6).equals(Buffer.from('GIF87a')) ||
        buffer.slice(0, 6).equals(Buffer.from('GIF89a'));
    case 'webp':
      return buffer.slice(0, 4).equals(Buffer.from('RIFF')) &&
        buffer.slice(8, 12).equals(Buffer.from('WEBP'));
    case 'pdf':
      return buffer.slice(0, 4).equals(Buffer.from('%PDF'));
    case 'mp3':
      return (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) || // sync frame
        buffer.slice(0, 3).equals(Buffer.from('ID3'));
    case 'wav':
      return buffer.slice(0, 4).equals(Buffer.from('RIFF')) &&
        buffer.slice(8, 12).equals(Buffer.from('WAVE'));
    case 'ogg':
      return buffer.slice(0, 4).equals(Buffer.from('OggS'));
    case 'mp4': case 'mov': case 'm4a': case 'm4v':
      return buffer.slice(4, 8).equals(Buffer.from('ftyp'));
    case 'webm':
      return buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;
    case 'pptx': case 'ppt':
      return buffer.slice(0, 4).equals(Buffer.from([0x50, 0x4B, 0x03, 0x04])); // ZIP
    default:
      return true; // Sin firma definida → validación por extensión es suficiente
  }
}

function validarArchivoUpload(buffer, extension, categoria) {
  const limiteMB = LIMITES_MB[categoria] ?? LIMITES_MB.documento;
  const limiteBytes = limiteMB * 1024 * 1024;
  if (buffer.length > limiteBytes) {
    throw new Error(`Archivo demasiado grande (${Math.round(buffer.length / 1024 / 1024)} MB). Límite: ${limiteMB} MB`);
  }
  // Normalizar a ".ext" — el frontend puede mandar la extensión con o sin punto
  const ext = extension.toLowerCase().startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  const extsPermitidas = EXTENSIONES_PERMITIDAS[categoria];
  if (extsPermitidas && !extsPermitidas.includes(ext)) {
    throw new Error(`Extensión "${ext}" no permitida para ${categoria}`);
  }
  if (!verificarMagicNumber(buffer, ext)) {
    throw new Error(`El contenido del archivo no corresponde a la extensión "${ext}"`);
  }
}

module.exports = { validarArchivoUpload, LIMITES_MB, EXTENSIONES_PERMITIDAS };
