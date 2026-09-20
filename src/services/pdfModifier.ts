import {
  PDFDocument,
  rgb,
  degrees,
  PageSizes,
  PDFFont,
} from 'pdf-lib';
import {
  DocumentState,
  TextBlock,
  ImageElement,
  DrawingElement,
  ShapeElement,
  WhiteoutElement,
  StampElement,
  SignatureElement,
} from '../types/pdf';
import { getDocumentFonts } from './fontManager';

export function parseColor(colorStr?: string | null): { r: number; g: number; b: number } {
  if (!colorStr || typeof colorStr !== 'string') return { r: 0, g: 0, b: 0 };
  const str = colorStr.trim().toLowerCase();

  if (str === 'transparent') return { r: 1, g: 1, b: 1 };
  if (str === 'white') return { r: 1, g: 1, b: 1 };
  if (str === 'black') return { r: 0, g: 0, b: 0 };

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (rgbMatch) {
    const r = Math.max(0, Math.min(255, parseFloat(rgbMatch[1]))) / 255;
    const g = Math.max(0, Math.min(255, parseFloat(rgbMatch[2]))) / 255;
    const b = Math.max(0, Math.min(255, parseFloat(rgbMatch[3]))) / 255;
    return { r, g, b };
  }

  // Hex: #rgb, #rgba, #rrggbb, #rrggbbaa
  const cleanHex = str.replace(/^#/, '');
  if (cleanHex.length === 3 || cleanHex.length === 4) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255 || 0;
    const g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255 || 0;
    const b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255 || 0;
    return { r, g, b };
  }
  if (cleanHex.length >= 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0;
    return { r, g, b };
  }

  return { r: 0, g: 0, b: 0 };
}

async function convertDataUrlToPngBytes(dataUrl: string): Promise<Uint8Array> {
  // If already PNG or JPEG, strip header and convert base64
  if (dataUrl.startsWith('data:image/png;base64,') || dataUrl.startsWith('data:image/jpeg;base64,')) {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Otherwise, draw onto an offscreen canvas to get clean PNG bytes
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2d context for image conversion'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to export canvas to PNG blob'));
          return;
        }
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      }, 'image/png');
    };
    img.onerror = (e) => reject(e);
    img.src = dataUrl;
  });
}

export async function createNewBlankPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage(PageSizes.A4);
  return await pdfDoc.save();
}

export async function saveModifiedPdf(
  originalPdfBytes: Uint8Array | null,
  state: DocumentState
): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;

  if (originalPdfBytes && originalPdfBytes.length > 0) {
    pdfDoc = await PDFDocument.load(originalPdfBytes.slice(), { ignoreEncryption: true });
  } else {
    pdfDoc = await PDFDocument.create();
    for (let i = 0; i < state.totalPages; i++) {
      pdfDoc.addPage(PageSizes.A4);
    }
  }

  // 1. Reorder, rotate, or remove pages
  const newDoc = await PDFDocument.create();
  newDoc.registerFontkit((await import('@pdf-lib/fontkit')).default);

  // Copy pages in desired order (excluding deleted ones)
  const validPageIndexes = state.pageOrder.filter((idx) => !state.deletedPages.includes(idx));
  const origPageCount = pdfDoc.getPageCount();

  if (validPageIndexes.length > 0) {
    for (let i = 0; i < validPageIndexes.length; i++) {
      const origIndex = validPageIndexes[i];
      if (origIndex < origPageCount) {
        const [copiedPage] = await newDoc.copyPages(pdfDoc, [origIndex]);
        const extraRotation = state.pageRotations[origIndex] || 0;
        if (extraRotation !== 0) {
          const currentRot = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees((currentRot + extraRotation) % 360));
        }
        newDoc.addPage(copiedPage);
      } else {
        // Newly added blank page
        newDoc.addPage(PageSizes.A4);
      }
    }
  } else {
    // If all pages deleted, add one blank A4
    newDoc.addPage(PageSizes.A4);
  }

  // We will now write changes onto the pages of newDoc
  const targetPages = newDoc.getPages();
  const targetFonts = await getDocumentFonts(newDoc);

  for (let displayIndex = 0; displayIndex < targetPages.length; displayIndex++) {
    const origIndex = validPageIndexes[displayIndex] !== undefined ? validPageIndexes[displayIndex] : displayIndex;
    const page = targetPages[displayIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // A. Text Blocks
    const pageTextBlocks = state.textBlocks.filter((tb) => tb.pageIndex === origIndex);

    // First: mask original text that was modified or deleted
    for (const block of pageTextBlocks) {
      if ((block.isModified || block.isDeleted) && !block.isNew) {
        // Minimal precise padding: 1pt X, 0.8pt Y - tightest fit covering Cyrillic descenders without touching neighboring lines
        const padX = 1;
        const padY = 0.8;

        const origX = block.originalX !== undefined ? block.originalX : block.x;
        const origY = block.originalY !== undefined ? block.originalY : block.y;
        const origW = block.originalWidth !== undefined ? block.originalWidth : block.width;
        const origH = block.originalHeight !== undefined ? block.originalHeight : block.height;

        // Mask covers original text location and any expanded block bounds
        const maskX = origX - padX;
        const maskTop = origY - padY;
        const maskW = Math.max(origW, block.width) + padX * 2;
        const maskH = Math.max(origH, block.height) + padY * 2;
        const pdfY = pageHeight - maskTop - maskH;

        if (block.backgroundColor && block.backgroundColor !== 'transparent') {
          const bg = parseColor(block.backgroundColor || '#FFFFFF');

          page.drawRectangle({
            x: maskX,
            y: pdfY,
            width: maskW,
            height: maskH,
            color: rgb(bg.r, bg.g, bg.b),
            opacity: 1,
          });
        }
      }
    }

    // Unified render queue sorted by zIndex for exact matching with screen overlay
    type RenderAction =
      | { type: 'text'; zIndex: number; block: TextBlock }
      | { type: 'whiteout'; zIndex: number; whiteout: WhiteoutElement }
      | { type: 'shape'; zIndex: number; shape: ShapeElement }
      | { type: 'drawing'; zIndex: number; drawing: DrawingElement }
      | { type: 'image'; zIndex: number; image: ImageElement }
      | { type: 'stamp'; zIndex: number; stamp: StampElement }
      | { type: 'signature'; zIndex: number; signature: SignatureElement };

    const renderActions: RenderAction[] = [];

    // 1. Text Blocks
    for (const block of pageTextBlocks) {
      if (!block.isDeleted && block.text.trim() && (block.isModified || block.isNew)) {
        renderActions.push({ type: 'text', zIndex: block.zIndex ?? 10, block });
      }
    }

    // 2. Whiteouts / Redactions
    const pageWhiteouts = state.whiteouts.filter((w) => w.pageIndex === origIndex);
    for (const whiteout of pageWhiteouts) {
      renderActions.push({ type: 'whiteout', zIndex: whiteout.zIndex ?? 20, whiteout });
    }

    // 3. Shapes (rectangles, circles, lines, arrows)
    const pageShapes = state.shapes.filter((s) => s.pageIndex === origIndex);
    for (const shape of pageShapes) {
      renderActions.push({ type: 'shape', zIndex: shape.zIndex ?? 15, shape });
    }

    // 4. Drawings (Pen & Highlighter)
    const pageDrawings = state.drawings.filter((d) => d.pageIndex === origIndex);
    for (const drawing of pageDrawings) {
      renderActions.push({ type: 'drawing', zIndex: drawing.zIndex ?? 6, drawing });
    }

    // 5. Images
    const pageImages = state.images.filter((img) => img.pageIndex === origIndex);
    for (const image of pageImages) {
      renderActions.push({ type: 'image', zIndex: image.zIndex ?? 8, image });
    }

    // 6. Stamps
    const pageStamps = state.stamps.filter((s) => s.pageIndex === origIndex);
    for (const stamp of pageStamps) {
      renderActions.push({ type: 'stamp', zIndex: stamp.zIndex ?? 15, stamp });
    }

    // 7. Signatures
    const pageSignatures = state.signatures.filter((s) => s.pageIndex === origIndex);
    for (const signature of pageSignatures) {
      renderActions.push({ type: 'signature', zIndex: signature.zIndex ?? 15, signature });
    }

    // Sort render actions so lowest zIndex is drawn first (bottom), highest zIndex drawn last (top)
    renderActions.sort((a, b) => a.zIndex - b.zIndex);

    for (const action of renderActions) {
      if (action.type === 'text') {
        const block = action.block;
        const font: PDFFont = block.isBold ? targetFonts.boldUnicode : targetFonts.regularUnicode;
        const textColor = parseColor(block.color || '#000000');
        const lines = block.text.split('\n');
        const lineHeight = block.fontSize * 1.25;

        lines.forEach((line, lineIdx) => {
          let textX = block.x;
          let textWidth = 0;
          try {
            textWidth = font.widthOfTextAtSize(line, block.fontSize);
          } catch {
            textWidth = line.length * (block.fontSize * 0.55);
          }

          if (block.align === 'center') {
            textX = block.x + Math.max(0, (block.width - textWidth) / 2);
          } else if (block.align === 'right') {
            textX = block.x + Math.max(0, block.width - textWidth);
          }

          // PDF text baseline is at the bottom of the glyph (ascent ~0.82)
          const pdfY = pageHeight - block.y - (lineIdx * lineHeight) - (block.fontSize * 0.82);

          try {
            page.drawText(line, {
              x: textX,
              y: pdfY,
              size: block.fontSize,
              font: font,
              color: rgb(textColor.r, textColor.g, textColor.b),
            });
          } catch (err) {
            console.warn('Failed to draw text line, attempting fallback:', err);
            try {
              const sanitized = line.replace(/[^\u0020-\u007E\u0400-\u04FF]/g, '?');
              page.drawText(sanitized, {
                x: textX,
                y: pdfY,
                size: block.fontSize,
                font: targetFonts.helvetica,
                color: rgb(textColor.r, textColor.g, textColor.b),
              });
            } catch {}
          }

          // Underline
          if (block.isUnderline) {
            page.drawLine({
              start: { x: textX, y: pdfY - 2 },
              end: { x: textX + textWidth, y: pdfY - 2 },
              thickness: Math.max(1, block.fontSize / 14),
              color: rgb(textColor.r, textColor.g, textColor.b),
            });
          }

          // Strikethrough
          if (block.isStrikethrough) {
            page.drawLine({
              start: { x: textX, y: pdfY + (block.fontSize * 0.3) },
              end: { x: textX + textWidth, y: pdfY + (block.fontSize * 0.3) },
              thickness: Math.max(1, block.fontSize / 14),
              color: rgb(textColor.r, textColor.g, textColor.b),
            });
          }
        });
      } else if (action.type === 'whiteout') {
        const w = action.whiteout;
        const pdfY = pageHeight - w.y - w.height;
        const c = parseColor(w.color || '#FFFFFF');
        page.drawRectangle({
          x: w.x,
          y: pdfY,
          width: w.width,
          height: w.height,
          color: rgb(c.r, c.g, c.b),
          opacity: 1,
        });
      } else if (action.type === 'shape') {
        const shape = action.shape;
        const pdfY = pageHeight - shape.y - shape.height;
        const stroke = parseColor(shape.strokeColor);
        const fill = shape.fillColor !== 'transparent' ? parseColor(shape.fillColor) : undefined;

        if (shape.type === 'rectangle') {
          page.drawRectangle({
            x: shape.x,
            y: pdfY,
            width: shape.width,
            height: shape.height,
            borderColor: rgb(stroke.r, stroke.g, stroke.b),
            borderWidth: shape.strokeWidth,
            color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
            opacity: shape.opacity ?? 1,
          });
        } else if (shape.type === 'circle') {
          page.drawEllipse({
            x: shape.x + shape.width / 2,
            y: pdfY + shape.height / 2,
            xScale: Math.abs(shape.width / 2),
            yScale: Math.abs(shape.height / 2),
            borderColor: rgb(stroke.r, stroke.g, stroke.b),
            borderWidth: shape.strokeWidth,
            color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
            opacity: shape.opacity ?? 1,
          });
        } else if (shape.type === 'line' || shape.type === 'arrow') {
          page.drawLine({
            start: { x: shape.x, y: pageHeight - shape.y },
            end: { x: shape.x + shape.width, y: pageHeight - (shape.y + shape.height) },
            thickness: shape.strokeWidth,
            color: rgb(stroke.r, stroke.g, stroke.b),
            opacity: shape.opacity ?? 1,
          });

          if (shape.type === 'arrow') {
            const startX = shape.x;
            const startY = pageHeight - shape.y;
            const endX = shape.x + shape.width;
            const endY = pageHeight - (shape.y + shape.height);
            const angle = Math.atan2(endY - startY, endX - startX);
            const headLength = Math.max(10, shape.strokeWidth * 3);

            page.drawLine({
              start: { x: endX, y: endY },
              end: {
                x: endX - headLength * Math.cos(angle - Math.PI / 6),
                y: endY - headLength * Math.sin(angle - Math.PI / 6),
              },
              thickness: shape.strokeWidth,
              color: rgb(stroke.r, stroke.g, stroke.b),
            });
            page.drawLine({
              start: { x: endX, y: endY },
              end: {
                x: endX - headLength * Math.cos(angle + Math.PI / 6),
                y: endY - headLength * Math.sin(angle + Math.PI / 6),
              },
              thickness: shape.strokeWidth,
              color: rgb(stroke.r, stroke.g, stroke.b),
            });
          }
        }
      } else if (action.type === 'drawing') {
        const drawing = action.drawing;
        if (drawing.points.length >= 2) {
          const stroke = parseColor(drawing.color);
          const opacity = drawing.isHighlighter ? 0.35 : (drawing.opacity || 1);

          for (let i = 0; i < drawing.points.length - 1; i++) {
            const p1 = drawing.points[i];
            const p2 = drawing.points[i + 1];
            page.drawLine({
              start: { x: p1.x, y: pageHeight - p1.y },
              end: { x: p2.x, y: pageHeight - p2.y },
              thickness: drawing.strokeWidth,
              color: rgb(stroke.r, stroke.g, stroke.b),
              opacity: opacity,
            });
          }
        }
      } else if (action.type === 'image') {
        const imgEl = action.image;
        try {
          const imgBytes = await convertDataUrlToPngBytes(imgEl.dataUrl);
          const embeddedImg = await newDoc.embedPng(imgBytes);
          const pdfY = pageHeight - imgEl.y - imgEl.height;
          page.drawImage(embeddedImg, {
            x: imgEl.x,
            y: pdfY,
            width: imgEl.width,
            height: imgEl.height,
            opacity: imgEl.opacity ?? 1,
            rotate: degrees(imgEl.rotation || 0),
          });
        } catch (err) {
          console.error('Failed to embed image element:', err);
        }
      } else if (action.type === 'stamp') {
        const stamp = action.stamp;
        const pdfY = pageHeight - stamp.y - stamp.height;
        const stampColor = parseColor(stamp.color || '#E02424');

        page.drawRectangle({
          x: stamp.x,
          y: pdfY,
          width: stamp.width,
          height: stamp.height,
          borderColor: rgb(stampColor.r, stampColor.g, stampColor.b),
          borderWidth: 3,
          opacity: 0.9,
        });

        page.drawRectangle({
          x: stamp.x + 3,
          y: pdfY + 3,
          width: stamp.width - 6,
          height: stamp.height - 6,
          borderColor: rgb(stampColor.r, stampColor.g, stampColor.b),
          borderWidth: 1,
          opacity: 0.9,
        });

        const stampFontSize = Math.max(12, Math.round(stamp.height * 0.35));
        const font = targetFonts.boldUnicode;
        let textWidth = 0;
        try {
          textWidth = font.widthOfTextAtSize(stamp.text, stampFontSize);
        } catch {
          textWidth = stamp.text.length * (stampFontSize * 0.6);
        }

        const textX = stamp.x + Math.max(4, (stamp.width - textWidth) / 2);
        const textY = pdfY + (stamp.height / 2) - (stampFontSize * 0.35);

        page.drawText(stamp.text, {
          x: textX,
          y: textY,
          size: stampFontSize,
          font: font,
          color: rgb(stampColor.r, stampColor.g, stampColor.b),
        });

        if (stamp.date) {
          const dateFontSize = Math.max(8, Math.round(stampFontSize * 0.5));
          const dateY = textY - dateFontSize - 4;
          page.drawText(stamp.date, {
            x: stamp.x + Math.max(4, (stamp.width - stamp.date.length * dateFontSize * 0.5) / 2),
            y: dateY,
            size: dateFontSize,
            font: targetFonts.regularUnicode,
            color: rgb(stampColor.r, stampColor.g, stampColor.b),
          });
        }
      } else if (action.type === 'signature') {
        const sig = action.signature;
        try {
          const sigBytes = await convertDataUrlToPngBytes(sig.dataUrl);
          const embeddedSig = await newDoc.embedPng(sigBytes);
          const pdfY = pageHeight - sig.y - sig.height;

          page.drawImage(embeddedSig, {
            x: sig.x,
            y: pdfY,
            width: sig.width,
            height: sig.height,
            opacity: sig.opacity ?? 1,
          });
        } catch (err) {
          console.error('Failed to embed signature:', err);
        }
      }
    }
  }

  return await newDoc.save();
}

export function downloadPdfBlob(bytes: Uint8Array, filename: string = 'document_edited.pdf') {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function printPdfBlob(bytes: Uint8Array) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = url;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 60000);
  };
}

export async function mergePdfs(pdf1Bytes: Uint8Array, pdf2Bytes: Uint8Array): Promise<Uint8Array> {
  const doc1 = await PDFDocument.load(pdf1Bytes.slice(), { ignoreEncryption: true });
  const doc2 = await PDFDocument.load(pdf2Bytes.slice(), { ignoreEncryption: true });

  const copiedPages = await doc1.copyPages(doc2, doc2.getPageIndices());
  copiedPages.forEach((page) => doc1.addPage(page));

  return await doc1.save();
}
