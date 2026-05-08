// Utilidad para procesar archivos PowerPoint (modo compatibilidad — solo texto)
// Nota: este parser extrae SOLO texto. Para fidelidad visual, se requiere LibreOffice.
import PizZip from "pizzip";

export const processPowerPointFile = async (file) => {
  try {
    console.log("🔄 Procesando PowerPoint (modo texto):", file.name);

    const arrayBuffer = await file.arrayBuffer();
    const zip = new PizZip(arrayBuffer);

    const slides = [];
    let slideIndex = 1;

    while (true) {
      const slideFile = zip.files[`ppt/slides/slide${slideIndex}.xml`];
      if (!slideFile) break;

      try {
        const xml = slideFile.asText();
        slides.push(extraerContenidoSlide(xml, slideIndex));
      } catch (e) {
        slides.push(slideBasico(slideIndex));
      }

      slideIndex++;
    }

    console.log(`✅ ${slides.length} diapositivas extraídas (solo texto)`);
    return slides;

  } catch (error) {
    console.error("❌ Error procesando PowerPoint:", error);
    throw new Error(`No se pudo leer el archivo: ${error.message}`);
  }
};

// Extrae texto de una diapositiva — sin imágenes (rápido, no bloquea UI)
const extraerContenidoSlide = (xml, index) => {
  // Extraer todos los fragmentos de texto <a:t>
  const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
  const textos = matches
    .map(m => m.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean);

  const titulo = textos[0] || `Diapositiva ${index}`;
  const contenido = textos.slice(1).join("\n").trim();

  // Color de fondo (intento básico)
  const colorMatch = xml.match(/(?:srgbClr|srgbClr)\s+val="([0-9A-Fa-f]{6})"/);
  const bgColor = colorMatch ? `#${colorMatch[1].toLowerCase()}` : "#1e293b";

  return {
    id: `slide-${index}-${Date.now()}`,
    title: titulo,
    content: contenido,
    backgroundColor: bgColor,
    backgroundImage: null,
    textColor: "#ffffff",
    fontSize: "1.5rem",
    titleFontSize: "2.5rem",
    textAlign: "center",
    order: index,
    source: "powerpoint-texto",
  };
};

const slideBasico = (index) => ({
  id: `slide-${index}-${Date.now()}`,
  title: `Diapositiva ${index}`,
  content: "",
  backgroundColor: "#1e293b",
  backgroundImage: null,
  textColor: "#ffffff",
  fontSize: "1.5rem",
  titleFontSize: "2.5rem",
  textAlign: "center",
  order: index,
  source: "powerpoint-texto",
});

export const isValidPowerPointFile = (file) => {
  const validTypes = [
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];
  const validExtensions = [".ppt", ".pptx"];
  return (
    validTypes.includes(file.type) ||
    validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
  );
};

export default { processPowerPointFile, isValidPowerPointFile };
