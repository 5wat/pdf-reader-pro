import * as pdfjsLib from 'pdfjs-dist';
import { TextBlock, PageInfo } from '../types/pdf';

// Configure the PDF.js worker using modern Vite URL pattern
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function loadPdfDocument(data: ArrayBuffer | Uint8Array): Promise<pdfjsLib.PDFDocumentProxy> {
  // CRITICAL: Clone bytes so PDF.js Web Worker postMessage does NOT detach the caller's ArrayBuffer!
  const clonedData = data instanceof Uint8Array ? data.slice() : new Uint8Array(data).slice();
  const loadingTask = pdfjsLib.getDocument({
    data: clonedData,
    cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
  });
  return await loadingTask.promise;
}

export async function getPagesInfo(pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<PageInfo[]> {
  const pages: PageInfo[] = [];
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    pages.push({
      pageIndex: i - 1,
      pageNumber: i,
      width: viewport.width,
      height: viewport.height,
      rotation: page.rotate || 0,
    });
  }
  return pages;
}

export async function renderPage(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5,
  rotation: number = 0
): Promise<{ width: number; height: number; viewport: pdfjsLib.PageViewport }> {
  const page = await pdfDoc.getPage(pageNumber);
  const totalRotation = ((page.rotate || 0) + rotation) % 360;
  const viewport = page.getViewport({ scale, rotation: totalRotation });

  // Handle Retina / HiDPI displays for ultra-crisp vector rendering
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * pixelRatio);
  canvas.height = Math.floor(viewport.height * pixelRatio);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    throw new Error('Canvas 2D context not available');
  }

  const renderContext: any = {
    canvasContext: context,
    viewport: viewport,
  };

  if (pixelRatio !== 1) {
    renderContext.transform = [pixelRatio, 0, 0, pixelRatio, 0, 0];
  }

  await page.render(renderContext).promise;

  return {
    width: viewport.width,
    height: viewport.height,
    viewport,
  };
}

interface RawTextItem {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[];
  fontName: string;
}

/**
 * Extracts and groups text elements from a PDF page into editable lines/blocks.
 * Normalized to standard 72 DPI PDF coordinates (top-left origin).
 */
export async function extractPageTextBlocks(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageIndex: number,
  rotation: number = 0
): Promise<TextBlock[]> {
  const pageNumber = pageIndex + 1;
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1, rotation });
  const textContent = await page.getTextContent();

  const items: RawTextItem[] = (textContent.items as any[]).filter(
    (item: any): item is RawTextItem =>
      item && typeof item.str === 'string' && item.str.trim().length > 0
  );

  if (items.length === 0) return [];

  // Convert items to normalized top-left coordinates
  const processedItems = items.map((item, idx) => {
    // Transform matrix: [a, b, c, d, tx, ty]
    const tx = item.transform[4];
    const ty = item.transform[5];
    const [vx, vy] = viewport.convertToViewportPoint(tx, ty);

    // Approximate font size from transform
    const fontSize = Math.max(
      8,
      Math.round(Math.sqrt(item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1]))
    );

    // Typographic bounds:
    // Ascent is ~0.82 * fontSize above baseline vy (cap height + accents like Ї, Й)
    // Descent is ~0.22 * fontSize below baseline vy (accommodating Cyrillic Д, Ц, Щ, р, у, ф descenders)
    const ascent = Math.round(fontSize * 0.82);
    const descent = Math.round(fontSize * 0.22);
    const height = ascent + descent;
    const topY = Math.round(vy - ascent);
    const width =
      item.width && item.width > 0
        ? Math.round(item.width)
        : Math.round((item.str.length * fontSize) * 0.5);

    return {
      id: `orig-${pageIndex}-${idx}`,
      x: vx,
      y: topY,
      width,
      height,
      str: item.str,
      fontSize,
      fontName: item.fontName,
      bottomY: vy + descent,
    };
  });

  // Group adjacent items on the same line (within 4pt vertical tolerance)
  processedItems.sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > 4) return yDiff;
    return a.x - b.x;
  });

  const groupedBlocks: TextBlock[] = [];
  let currentGroup: typeof processedItems = [];

  for (const item of processedItems) {
    if (currentGroup.length === 0) {
      currentGroup.push(item);
      continue;
    }

    const prev = currentGroup[currentGroup.length - 1];
    const isSameLine = Math.abs(item.y - prev.y) <= Math.max(4, prev.fontSize * 0.35);
    const isCloseHorizontally = item.x - (prev.x + prev.width) <= prev.fontSize * 1.2;

    if (isSameLine && isCloseHorizontally) {
      currentGroup.push(item);
    } else {
      groupedBlocks.push(createMergedTextBlock(currentGroup, pageIndex));
      currentGroup = [item];
    }
  }

  if (currentGroup.length > 0) {
    groupedBlocks.push(createMergedTextBlock(currentGroup, pageIndex));
  }

  return groupedBlocks;
}

function createMergedTextBlock(
  items: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    str: string;
    fontSize: number;
    fontName: string;
  }>,
  pageIndex: number
): TextBlock {
  const first = items[0];
  const last = items[items.length - 1];
  const fullText = items.map((i) => i.str).join(' ');

  const minX = Math.min(...items.map((i) => i.x));
  const minY = Math.min(...items.map((i) => i.y));
  const maxX = Math.max(...items.map((i) => i.x + i.width));
  const maxY = Math.max(...items.map((i) => i.y + i.height));

  const totalX = Math.round(minX);
  const totalY = Math.round(minY);
  const totalWidth = Math.round(Math.max(maxX - minX, 10));
  const totalHeight = Math.round(Math.max(maxY - minY, 10));

  // Approximate font characteristics
  const isBold = /bold|black|heavy/i.test(first.fontName);
  const isItalic = /italic|oblique/i.test(first.fontName);

  let fontFamily = 'sans-serif';
  if (/serif|times|georgia/i.test(first.fontName)) {
    fontFamily = 'serif';
  } else if (/mono|courier|code/i.test(first.fontName)) {
    fontFamily = 'monospace';
  }

  return {
    id: `block-${pageIndex}-${first.id}`,
    pageIndex,
    x: totalX,
    y: totalY,
    width: totalWidth,
    height: totalHeight,
    originalX: totalX,
    originalY: totalY,
    originalWidth: totalWidth,
    originalHeight: totalHeight,
    text: fullText,
    originalText: fullText,
    fontSize: first.fontSize,
    fontFamily,
    color: '#000000',
    isBold,
    isItalic,
    align: 'left',
    isModified: false,
    isDeleted: false,
  };
}
