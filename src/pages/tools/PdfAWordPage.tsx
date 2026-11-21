import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Download } from "lucide-react";
import ToolPageLayout from "@/components/tools/ToolPageLayout";
import FileDropZone from "@/components/tools/FileDropZone";
import { Button } from "@/components/ui/button";
import { buildDocx, extractPdfText, type PdfToWordProgress } from "@/lib/tools/pdfToWord";

const PdfAWordPage = () => {
  const { t } = useTranslation("tools");
  const { lang = "es" } = useParams<{ lang: string }>();

  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<PdfToWordProgress | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleFile = (selected: File) => {
    setFile(selected);
    setResultUrl(null);
    setError(null);
    setProgress(null);
  };

  const handleConvert = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const pagesText = await extractPdfText(file, lang, setProgress);
      const blob = await buildDocx(pagesText);
      setResultUrl(URL.createObjectURL(blob));
      const base = file.name.replace(/\.pdf$/i, "");
      setResultName(`${base}.docx`);
    } catch {
      setError(t("ui.error_generic"));
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResultUrl(null);
    setError(null);
    setProgress(null);
  };

  const progressLabel = progress
    ? `${t(progress.stage === "ocr" ? "ui.ocr_progress" : "ui.reading_progress")} (${progress.page}/${progress.totalPages})`
    : t("ui.processing");

  return (
    <ToolPageLayout toolId="pdf-a-word">
      <div className="border border-neutral-800 rounded-xl p-6 md:p-8">
        {!file ? (
          <FileDropZone
            accept="application/pdf"
            label={t("ui.upload_label_pdf")}
            hint={t("ui.upload_hint_pdf")}
            onFile={handleFile}
            toolId="pdf-a-word"
          />
        ) : (
          <div className="space-y-6">
            <div className="text-sm text-neutral-400 truncate">{file.name}</div>

            {processing && progress?.stage === "ocr" && (
              <p className="text-neutral-500 text-xs">{t("ui.ocr_warning")}</p>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex flex-wrap gap-3">
              {!resultUrl ? (
                <Button
                  onClick={handleConvert}
                  isLoading={processing}
                  loadingText={progressLabel}
                  className="bg-white text-black hover:bg-white/80 rounded-full px-8"
                >
                  {t("ui.convert_to_word_button")}
                </Button>
              ) : (
                <a href={resultUrl} download={resultName}>
                  <Button className="bg-white text-black hover:bg-white/80 rounded-full px-8">
                    <Download className="w-4 h-4" />
                    {t("ui.download_button")}
                  </Button>
                </a>
              )}
              <Button
                variant="outline"
                onClick={reset}
                className="rounded-full px-8 border-neutral-700 text-white bg-transparent hover:bg-white/10"
              >
                {t("ui.reset_button_file")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default PdfAWordPage;
