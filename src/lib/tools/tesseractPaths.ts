/**
 * Rutas propias de tesseract.js (worker, core wasm e idiomas), alojadas en el mismo
 * dominio con `npm run models:tools` -> public/tesseract/.
 *
 * Por defecto tesseract.js baja todo de un CDN y crea el worker desde un blob:, y la CSP
 * del sitio no permite ni lo uno ni lo otro. Con workerBlobURL: false el worker se crea
 * directo desde /tesseract/worker.min.js (mismo origen).
 */
export function tesseractPaths() {
  const base = `${window.location.origin}/tesseract`;
  return {
    workerPath: `${base}/worker.min.js`,
    workerBlobURL: false,
    corePath: `${base}/core`,
    langPath: `${base}/lang`,
  };
}
