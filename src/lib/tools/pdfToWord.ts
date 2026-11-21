import { Document, Packer, Paragraph } from "docx";
import pdfjsLib from "./pdfjs";
import { tesseractPaths } from "./tesseractPaths";

const TESSERACT_LANG_BY_SITE_LANG: Record<string, string> = {
  es: "spa",
  en: "eng",
  fr: "fra",
  "pt-BR": "por",
};

export interface PdfToWordProgress {
  stage: "reading" | "ocr";
  page: number;
  totalPages: number;
}

/**
 * Extrae el texto de un PDF. Si el texto nativo es minimo (PDF escaneado),
 * cae a OCR pagina por pagina via tesseract.js -mas lento, se avisa por progreso-.
 */
export async function extractPdfText(
  file: File,
  siteLang: string,
  onProgress?: (progress: PdfToWordProgress) => void
): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pagesText: string[] = [];
  let totalChars = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.({ stage: "reading", page: i, totalPages: pdf.numPages });
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim();
    pagesText.push(text);
    totalChars += text.length;
  }

  const avgCharsPerPage = totalChars / pdf.numPages;
  if (avgCharsPerPage > 20) {
    return pagesText;
  }

  // Poco o ningun texto nativo: probablemente escaneado. OCR pagina por pagina.
  const { createWorker } = await import("tesseract.js");
  const lang = TESSERACT_LANG_BY_SITE_LANG[siteLang] || "eng";
  const worker = await createWorker(lang, 1, tesseractPaths());
  const ocrPages: string[] = [];

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.({ stage: "ocr", page: i, totalPages: pdf.numPages });
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo crear el contexto de canvas");
      await page.render({ canvasContext: ctx, viewport }).promise;
      const { data } = await worker.recognize(canvas);
      ocrPages.push(data.text.trim());
    }
  } finally {
    await worker.terminate();
  }

  return ocrPages;
}

export async function buildDocx(pagesText: string[]): Promise<Blob> {
  const paragraphs: Paragraph[] = [];

  pagesText.forEach((pageText, idx) => {
    const lines = pageText.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length === 0) {
      paragraphs.push(new Paragraph(""));
    } else {
      for (const line of lines) {
        paragraphs.push(new Paragraph(line));
      }
    }
    if (idx < pagesText.length - 1) {
      paragraphs.push(new Paragraph({ text: "", pageBreakBefore: true }));
    }
  });

  const doc = new Document({ sections: [{ children: paragraphs }] });
  return Packer.toBlob(doc);
}
