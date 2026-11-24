// Convierte cada página de un PDF en una imagen JPEG para Diapositivas.
// Así se "importa un PowerPoint": en PowerPoint/Keynote/Google Slides se guarda
// como PDF y cada página queda con su diseño exacto.
//
// pdfjs-dist 3.11 (build legacy, compatible con CRA). IMPORTANTE: siempre
// `isEvalSupported: false` — evita la ejecución de código desde PDFs
// maliciosos (CVE-2024-4367) y respeta el CSP de producción (sin eval).
import * as pdfjs from "pdfjs-dist/legacy/build/pdf";
// Vite copia el worker como archivo aparte y devuelve su URL (CSP: script-src 'self').
import urlWorker from "pdfjs-dist/legacy/build/pdf.worker.js?url";

let workerListo = false;
function prepararWorker() {
  if (workerListo) return;
  pdfjs.GlobalWorkerOptions.workerSrc = urlWorker;
  workerListo = true;
}

const ANCHO_OBJETIVO = 1920; // ancho del proyector
const MAX_PAGINAS = 300;

function canvasAJpeg(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo crear la imagen"))),
      "image/jpeg",
      0.9,
    );
  });
}

/**
 * @param {ArrayBuffer} datos  bytes del PDF
 * @param {(hecho:number,total:number)=>void} [alProgresar]
 * @returns {AsyncGenerator<{pagina:number,total:number,bytes:Uint8Array}>}
 */
export async function* paginasPdfComoJpeg(datos, alProgresar) {
  prepararWorker();
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(datos),
    isEvalSupported: false,
    enableXfa: false,
    // Fuentes estándar (Helvetica, Times…) para PDFs que no las incrustan.
    // Copiadas de pdfjs-dist/standard_fonts a public/pdfjs/standard_fonts.
    standardFontDataUrl: "/pdfjs/standard_fonts/",
  }).promise;
  try {
    const total = Math.min(doc.numPages, MAX_PAGINAS);
    for (let n = 1; n <= total; n++) {
      const pagina = await doc.getPage(n);
      const base = pagina.getViewport({scale: 1});
      const escala = Math.min(ANCHO_OBJETIVO / base.width, 4);
      const vista = pagina.getViewport({scale: escala});
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(vista.width);
      canvas.height = Math.round(vista.height);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff"; // páginas sin fondo → blanco, no negro
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await pagina.render({canvasContext: ctx, viewport: vista}).promise;
      const blob = await canvasAJpeg(canvas);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      pagina.cleanup();
      canvas.width = canvas.height = 0;
      alProgresar?.(n, total);
      yield {pagina: n, total, bytes};
    }
  } finally {
    doc.destroy();
  }
}
