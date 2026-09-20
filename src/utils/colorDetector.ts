import { TextBlock } from '../types/pdf';

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function isColorDark(hex: string): boolean {
  if (!hex || hex === 'transparent') return false;
  const clean = hex.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  }
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < 140;
}

/**
 * Samples the rendered PDF canvas behind and outside a text block.
 * Uses a statistical MODE (histogram frequency) of outer perimeter pixels
 * to find the 100% exact background color without any text antialiasing contamination.
 */
export function sampleColorsForTextBlock(
  canvas: HTMLCanvasElement,
  block: TextBlock,
  scale: number
): { backgroundColor: string; color: string } {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { backgroundColor: '#FFFFFF', color: '#000000' };

    const pixelRatio = window.devicePixelRatio || 1;
    const cx = Math.max(0, Math.floor(block.x * scale * pixelRatio));
    const cy = Math.max(0, Math.floor(block.y * scale * pixelRatio));
    const cw = Math.min(canvas.width - cx, Math.ceil(block.width * scale * pixelRatio));
    const ch = Math.min(canvas.height - cy, Math.ceil(block.height * scale * pixelRatio));

    if (cw <= 2 || ch <= 2) {
      return { backgroundColor: '#FFFFFF', color: '#000000' };
    }

    // 1. Collect pixels around the perimeter (with margins outside the text glyphs)
    // To avoid antialiasing contamination from text strokes, we sample slightly outside the box
    const margin = Math.max(2, Math.round(3 * pixelRatio));
    const sampleXMin = Math.max(0, cx - margin);
    const sampleYMin = Math.max(0, cy - margin);
    const sampleXMax = Math.min(canvas.width - 1, cx + cw + margin);
    const sampleYMax = Math.min(canvas.height - 1, cy + ch + margin);

    const fullSampleW = sampleXMax - sampleXMin + 1;
    const fullSampleH = sampleYMax - sampleYMin + 1;

    const imgData = ctx.getImageData(sampleXMin, sampleYMin, fullSampleW, fullSampleH);
    const data = imgData.data;

    // Build color frequency histogram from the outer boundary
    const bgHistogram = new Map<number, { count: number; sumR: number; sumG: number; sumB: number }>();

    const addPixelToBgHistogram = (px: number, py: number) => {
      const idx = (py * fullSampleW + px) * 4;
      const a = data[idx + 3];
      if (a < 20) return; // Skip transparent
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Quantize to bucket of 4
      const qr = Math.round(r / 4) * 4;
      const qg = Math.round(g / 4) * 4;
      const qb = Math.round(b / 4) * 4;
      const key = (qr << 16) | (qg << 8) | qb;

      const existing = bgHistogram.get(key);
      if (existing) {
        existing.count++;
        existing.sumR += r;
        existing.sumG += g;
        existing.sumB += b;
      } else {
        bgHistogram.set(key, { count: 1, sumR: r, sumG: g, sumB: b });
      }
    };

    // Sample top margin strip (outside text)
    const topLimit = Math.min(margin, fullSampleH);
    for (let py = 0; py < topLimit; py++) {
      for (let px = 0; px < fullSampleW; px += 2) {
        addPixelToBgHistogram(px, py);
      }
    }

    // Sample bottom margin strip (outside text)
    const btmStart = Math.max(0, fullSampleH - margin);
    for (let py = btmStart; py < fullSampleH; py++) {
      for (let px = 0; px < fullSampleW; px += 2) {
        addPixelToBgHistogram(px, py);
      }
    }

    // Sample left margin strip
    const leftLimit = Math.min(margin, fullSampleW);
    for (let px = 0; px < leftLimit; px++) {
      for (let py = 0; py < fullSampleH; py += 2) {
        addPixelToBgHistogram(px, py);
      }
    }

    // Sample right margin strip
    const rightStart = Math.max(0, fullSampleW - margin);
    for (let px = rightStart; px < fullSampleW; px++) {
      for (let py = 0; py < fullSampleH; py += 2) {
        addPixelToBgHistogram(px, py);
      }
    }

    // Find the MODE (most frequent background color)
    let bestCount = 0;
    let bestBg = { r: 255, g: 255, b: 255 };

    for (const item of bgHistogram.values()) {
      if (item.count > bestCount) {
        bestCount = item.count;
        bestBg = {
          r: Math.round(item.sumR / item.count),
          g: Math.round(item.sumG / item.count),
          b: Math.round(item.sumB / item.count),
        };
      }
    }

    // Snap clean near-white and near-black
    if (bestBg.r >= 248 && bestBg.g >= 248 && bestBg.b >= 248) {
      bestBg = { r: 255, g: 255, b: 255 };
    } else if (bestBg.r <= 8 && bestBg.g <= 8 && bestBg.b <= 8) {
      bestBg = { r: 0, g: 0, b: 0 };
    }

    const bgHex = rgbToHex(bestBg.r, bestBg.g, bestBg.b);
    const bgLum = 0.299 * bestBg.r + 0.587 * bestBg.g + 0.114 * bestBg.b;

    // 2. Sample interior pixels that contrast with the detected background to find TEXT color
    const textHistogram = new Map<number, { count: number; r: number; g: number; b: number }>();

    // Search specifically in the inner text zone (offset by margin)
    const innerXMin = margin;
    const innerXMax = Math.max(innerXMin + 1, fullSampleW - margin);
    const innerYMin = margin;
    const innerYMax = Math.max(innerYMin + 1, fullSampleH - margin);

    for (let py = innerYMin; py < innerYMax; py += 2) {
      for (let px = innerXMin; px < innerXMax; px += 2) {
        const idx = (py * fullSampleW + px) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Euclidean color difference from background
        const diff = Math.sqrt(
          (r - bestBg.r) ** 2 + (g - bestBg.g) ** 2 + (b - bestBg.b) ** 2
        );

        // Text glyph pixels have strong contrast from background
        if (diff > 50) {
          const qr = Math.round(r / 8) * 8;
          const qg = Math.round(g / 8) * 8;
          const qb = Math.round(b / 8) * 8;
          const key = (qr << 16) | (qg << 8) | qb;

          const existing = textHistogram.get(key);
          if (existing) {
            existing.count++;
          } else {
            textHistogram.set(key, { count: 1, r, g, b });
          }
        }
      }
    }

    let textHex: string;
    let maxTextCount = 0;
    let bestText = { r: 0, g: 0, b: 0 };

    for (const item of textHistogram.values()) {
      if (item.count > maxTextCount) {
        maxTextCount = item.count;
        bestText = { r: item.r, g: item.g, b: item.b };
      }
    }

    if (maxTextCount > 3) {
      textHex = rgbToHex(bestText.r, bestText.g, bestText.b);
    } else {
      // If no contrasting text pixels found, choose black or white based on background luminance
      textHex = bgLum < 140 ? '#FFFFFF' : '#000000';
    }

    return { backgroundColor: bgHex, color: textHex };
  } catch (err) {
    console.warn('Could not sample colors from canvas:', err);
    return { backgroundColor: '#FFFFFF', color: '#000000' };
  }
}
