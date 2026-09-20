import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import * as TauriAPI from '@/API/TauriAPI';
import { loadPlatform } from '@/hooks/use-platform';

const PDF_PAGE_WIDTH = 1600;
const PDF_MAX_SCALE = 3;
const PDF_JPEG_QUALITY = 0.88;

export type ExtractProgress = (percent: number, label: string) => void;

async function nativePdfAvailable(): Promise<boolean> {
  const platform = await loadPlatform();
  if (!platform.pdf) return false;
  return invoke<boolean>('check_pdfium').catch(() => false);
}

async function renderPdfInWebview(path: string, onProgress?: ExtractProgress) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = (
    await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ).default;

  const response = await fetch(convertFileSrc(path));
  if (!response.ok) throw new Error(`Cannot read ${path}`);
  const task = pdfjs.getDocument({
    data: new Uint8Array(await response.arrayBuffer()),
  });
  const document_ = await task.promise;

  try {
    await invoke('begin_book_pages', { path });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available');

    for (let number = 1; number <= document_.numPages; number++) {
      const page = await document_.getPage(number);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({
        scale: Math.min(PDF_MAX_SCALE, PDF_PAGE_WIDTH / base.width),
      });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', PDF_JPEG_QUALITY)
      );
      if (!blob) throw new Error(`Page ${number} could not be rendered`);
      await invoke('save_book_page', new Uint8Array(await blob.arrayBuffer()), {
        headers: { 'x-page-index': String(number - 1) },
      });
      page.cleanup();
      onProgress?.(
        Math.round((number * 100) / document_.numPages),
        `${number} / ${document_.numPages}`
      );
    }
  } finally {
    await task.destroy();
  }
}

export async function extractBook(path: string, onProgress?: ExtractProgress) {
  const extension = path.split('.').pop()?.toLowerCase();
  if (extension === 'pdf' && !(await nativePdfAvailable())) {
    await renderPdfInWebview(path, onProgress);
    return;
  }
  await TauriAPI.unzipBook(path);
}
