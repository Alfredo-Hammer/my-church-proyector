// Utilidad para procesar archivos PowerPoint
import PizZip from "pizzip";

/**
 * Procesa un archivo PowerPoint y extrae las diapositivas
 * @param {File} file - Archivo PowerPoint
 * @returns {Promise<Array>} Array de diapositivas procesadas
 */
export const processPowerPointFile = async (file) => {
  try {
    console.log("🔄 Procesando archivo PowerPoint:", file.name);

    const arrayBuffer = await file.arrayBuffer();
    const zip = new PizZip(arrayBuffer);

    // Extraer información básica del PowerPoint
    const slides = [];
    const images = {}; // Almacenar imágenes extraídas
    const relationships = {}; // Mapear IDs de relación con archivos de imagen
    let slideIndex = 1;

    // Primero extraer todas las imágenes del PowerPoint
    try {
      extractImagesFromPowerPoint(zip, images);
      extractRelationships(zip, relationships, images);
    } catch (error) {
      console.warn("⚠️ Error extrayendo imágenes:", error);
    }

    // Buscar archivos de diapositivas en el ZIP
    while (true) {
      const slideXmlPath = `ppt/slides/slide${slideIndex}.xml`;
      const slideFile = zip.files[slideXmlPath];

      if (!slideFile) {
        break; // No hay más diapositivas
      }

      try {
        const slideXml = slideFile.asText();
        const slideContent = extractSlideContent(slideXml, slideIndex, images, relationships);

        if (slideContent) {
          slides.push(slideContent);
        }
      } catch (error) {
        console.warn(`⚠️ Error procesando diapositiva ${slideIndex}:`, error);
        // Crear diapositiva básica si falla la extracción
        slides.push(createBasicSlide(slideIndex, `Diapositiva ${slideIndex}`));
      }

      slideIndex++;
    }

    console.log(`✅ PowerPoint procesado: ${slides.length} diapositivas extraídas`);
    console.log(`🖼️ Imágenes extraídas: ${Object.keys(images).length}`);

    return slides;

  } catch (error) {
    console.error("❌ Error procesando PowerPoint:", error);
    throw new Error(`No se pudo procesar el archivo PowerPoint: ${error.message}`);
  }
};

/**
 * Extrae el contenido de una diapositiva desde el XML
 */
const extractSlideContent = (slideXml, slideIndex, images = {}, relationships = {}) => {
  try {
    // Buscar texto en el XML usando expresiones regulares
    const textMatches = slideXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
    const extractedTexts = textMatches
      .map(match => match.replace(/<[^>]*>/g, ''))
      .filter(text => text.trim().length > 0);

    // Separar título y contenido
    const title = extractedTexts[0] || `Diapositiva ${slideIndex}`;
    const content = extractedTexts.slice(1).join('\n') || '';

    // Buscar información de colores de fondo (básico)
    const backgroundColorMatch = slideXml.match(/(?:bg|fill).*?val="([^"]*)"/) || [];
    const backgroundColor = parseColorFromPPTX(backgroundColorMatch[1]) || "#1e293b";

    // Buscar imágenes en la diapositiva usando relaciones
    const imageMatches = slideXml.match(/r:embed="([^"]*)"/g) || [];
    let backgroundImage = null;
    let slideImages = [];

    if (imageMatches.length > 0) {
      imageMatches.forEach(match => {
        const relationId = match.replace(/r:embed="([^"]*)"/, '$1');
        const imageData = relationships[relationId];

        if (imageData) {
          slideImages.push(imageData);
          // Usar la primera imagen como fondo si no hay fondo definido
          if (!backgroundImage) {
            backgroundImage = imageData;
          }
        }
      });
    }

    return createSlideObject({
      index: slideIndex,
      title,
      content,
      backgroundColor,
      backgroundImage,
      slideImages // Añadir todas las imágenes de la diapositiva
    });

  } catch (error) {
    console.warn(`⚠️ Error extrayendo contenido de diapositiva ${slideIndex}:`, error);
    return createBasicSlide(slideIndex, `Diapositiva ${slideIndex}`);
  }
};

/**
 * Extrae las relaciones entre IDs y archivos de imagen
 */
const extractRelationships = (zip, relationships, images) => {
  try {
    console.log("🔗 Iniciando extracción de relaciones...");

    // PASO 1: Procesar relaciones globales (presentation.xml.rels)
    try {
      const globalRelsPath = 'ppt/_rels/presentation.xml.rels';
      const globalRelsFile = zip.files[globalRelsPath];

      if (globalRelsFile) {
        const globalRelsXml = globalRelsFile.asText();
        const relationMatches = globalRelsXml.match(/<Relationship[^>]*>/g) || [];

        relationMatches.forEach(match => {
          const idMatch = match.match(/Id="([^"]*)"/);
          const targetMatch = match.match(/Target="([^"]*)"/);

          if (idMatch && targetMatch) {
            const id = idMatch[1];
            const target = targetMatch[1];

            // Buscar imágenes en varias formas posibles de referencia
            if (target.includes('media/')) {
              const fileName = target.split('/').pop();
              if (images[fileName]) {
                relationships[id] = images[fileName];
                console.log(`🖼️ Relación global encontrada: ${id} -> ${fileName}`);
              }
            }
          }
        });
      }
    } catch (globalError) {
      console.warn("⚠️ Error procesando relaciones globales:", globalError);
    }

    // PASO 2: Procesar relaciones de cada diapositiva
    let slideIndex = 1;
    let foundRels = 0;

    while (true) {
      const relsPath = `ppt/slides/_rels/slide${slideIndex}.xml.rels`;
      const relsFile = zip.files[relsPath];

      if (!relsFile) {
        break;
      }

      try {
        const relsXml = relsFile.asText();

        // Buscar relaciones de imagen
        const relationMatches = relsXml.match(/<Relationship[^>]*>/g) || [];

        relationMatches.forEach(match => {
          const idMatch = match.match(/Id="([^"]*)"/);
          const targetMatch = match.match(/Target="([^"]*)"/);

          if (idMatch && targetMatch) {
            const id = idMatch[1];
            const target = targetMatch[1];

            // Buscar imágenes en varias formas posibles de referencia
            // Puede ser '../media/' o 'media/' o incluso con rutas absolutas
            if (target.includes('media/')) {
              const fileName = target.split('/').pop();
              if (images[fileName]) {
                relationships[id] = images[fileName];
                foundRels++;
                console.log(`🖼️ Relación encontrada en slide ${slideIndex}: ${id} -> ${fileName}`);
              }
            }
          }
        });
      } catch (error) {
        console.warn(`⚠️ Error procesando relaciones de diapositiva ${slideIndex}:`, error);
      }

      slideIndex++;
    }

    console.log(`✅ Total de relaciones encontradas: ${foundRels + Object.keys(relationships).length}`);
  } catch (error) {
    console.warn("⚠️ Error extrayendo relaciones:", error);
  }
};

/**
 * Convierte colores de PowerPoint a formato hexadecimal
 */
const parseColorFromPPTX = (pptxColor) => {
  if (!pptxColor) return null;

  // Mapeo básico de colores comunes de PowerPoint
  const colorMap = {
    'FFFFFF': '#ffffff',
    '000000': '#000000',
    'FF0000': '#ff0000',
    '00FF00': '#00ff00',
    '0000FF': '#0000ff',
    'FFFF00': '#ffff00',
    'FF00FF': '#ff00ff',
    '00FFFF': '#00ffff',
  };

  // Limpiar y normalizar el color
  const cleanColor = pptxColor.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();

  if (cleanColor.length === 6) {
    return `#${cleanColor.toLowerCase()}`;
  }

  return colorMap[cleanColor] || null;
};

/**
 * Crea un objeto de diapositiva con la estructura estándar
 */
const createSlideObject = ({
  index,
  title,
  content,
  backgroundColor = "#1e293b",
  backgroundImage = null,
  slideImages = []
}) => {
  return {
    id: `slide-${index}-${Date.now()}`,
    title: title || `Diapositiva ${index}`,
    content: content || '',
    backgroundColor,
    backgroundImage,
    slideImages, // Todas las imágenes de la diapositiva
    textColor: "#ffffff",
    fontSize: "1.5rem",
    titleFontSize: "2.5rem",
    textAlign: "center",
    order: index,
    createdAt: new Date().toISOString(),
    source: 'powerpoint'
  };
};

/**
 * Crea una diapositiva básica como fallback
 */
const createBasicSlide = (index, title) => {
  return createSlideObject({
    index,
    title,
    content: '',
    backgroundColor: "#1e293b"
  });
};

/**
 * Extrae imágenes del archivo PowerPoint
 */
const extractImagesFromPowerPoint = (zip, images) => {
  try {
    // Buscar archivos de imagen en el directorio media
    Object.keys(zip.files).forEach(filePath => {
      if (filePath.startsWith('ppt/media/')) {
        const file = zip.files[filePath];
        if (file && !file.dir) {
          // Verificar si es una imagen
          const isImage = /\.(jpg|jpeg|png|gif|bmp)$/i.test(filePath);
          if (isImage) {
            try {
              // Convertir a base64 para poder usar en src
              const arrayBuffer = file.asArrayBuffer();
              const bytes = new Uint8Array(arrayBuffer);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64 = btoa(binary);

              // Determinar tipo MIME
              const extension = filePath.split('.').pop().toLowerCase();
              let mimeType = 'image/jpeg';
              if (extension === 'png') mimeType = 'image/png';
              else if (extension === 'gif') mimeType = 'image/gif';
              else if (extension === 'bmp') mimeType = 'image/bmp';

              // Crear data URL
              const dataUrl = `data:${mimeType};base64,${base64}`;

              // Usar el nombre del archivo como clave
              const fileName = filePath.split('/').pop();
              images[fileName] = dataUrl;

              console.log(`🖼️ Imagen extraída: ${fileName}`);
            } catch (error) {
              console.warn(`⚠️ Error procesando imagen ${filePath}:`, error);
            }
          }
        }
      }
    });
  } catch (error) {
    console.warn("⚠️ Error extrayendo imágenes del PowerPoint:", error);
  }
};

/**
 * Validar si un archivo es un PowerPoint válido
 */
export const isValidPowerPointFile = (file) => {
  const validTypes = [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  const validExtensions = ['.ppt', '.pptx'];
  const hasValidType = validTypes.includes(file.type);
  const hasValidExtension = validExtensions.some(ext =>
    file.name.toLowerCase().endsWith(ext)
  );

  return hasValidType || hasValidExtension;
};

// Export object
const powerPointProcessor = {
  processPowerPointFile,
  isValidPowerPointFile
};

export default powerPointProcessor;
