import { PDFDocument, PDFFont, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

let regularFontBytes: ArrayBuffer | null = null;
let boldFontBytes: ArrayBuffer | null = null;

export async function loadFontBytes(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  if (regularFontBytes && boldFontBytes) {
    return { regular: regularFontBytes, bold: boldFontBytes };
  }

  const fontCandidates = [
    { reg: './fonts/Roboto-Regular.ttf', bold: './fonts/Roboto-Bold.ttf' },
    { reg: '/fonts/Roboto-Regular.ttf', bold: '/fonts/Roboto-Bold.ttf' },
    { reg: 'fonts/Roboto-Regular.ttf', bold: 'fonts/Roboto-Bold.ttf' },
  ];

  for (const candidate of fontCandidates) {
    try {
      const [regRes, boldRes] = await Promise.all([
        fetch(candidate.reg),
        fetch(candidate.bold),
      ]);

      if (regRes.ok && boldRes.ok) {
        regularFontBytes = await regRes.arrayBuffer();
        boldFontBytes = await boldRes.arrayBuffer();
        return { regular: regularFontBytes, bold: boldFontBytes };
      }
    } catch {
      // try next path
    }
  }

  // Fallback to CDN if local files are blocked by protocol
  try {
    const [regRes, boldRes] = await Promise.all([
      fetch('https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf'),
      fetch('https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Bold.ttf'),
    ]);

    if (regRes.ok && boldRes.ok) {
      regularFontBytes = await regRes.arrayBuffer();
      boldFontBytes = await boldRes.arrayBuffer();
      return { regular: regularFontBytes, bold: boldFontBytes };
    }
  } catch (err) {
    console.warn('Failed to fetch font files from CDN fallback:', err);
  }

  throw new Error('Unable to load Unicode fonts for PDF generation');
}

export async function getDocumentFonts(
  pdfDoc: PDFDocument
): Promise<{
  regularUnicode: PDFFont;
  boldUnicode: PDFFont;
  helvetica: PDFFont;
  helveticaBold: PDFFont;
  timesRoman: PDFFont;
  courier: PDFFont;
}> {
  pdfDoc.registerFontkit(fontkit);

  const { regular, bold } = await loadFontBytes();

  const [regularUnicode, boldUnicode, helvetica, helveticaBold, timesRoman, courier] =
    await Promise.all([
      pdfDoc.embedFont(regular, { subset: true }),
      pdfDoc.embedFont(bold, { subset: true }),
      pdfDoc.embedFont(StandardFonts.Helvetica),
      pdfDoc.embedFont(StandardFonts.HelveticaBold),
      pdfDoc.embedFont(StandardFonts.TimesRoman),
      pdfDoc.embedFont(StandardFonts.Courier),
    ]);

  return {
    regularUnicode,
    boldUnicode,
    helvetica,
    helveticaBold,
    timesRoman,
    courier,
  };
}

/**
 * Checks if a string contains non-ASCII characters (e.g. Ukrainian Cyrillic).
 */
export function hasCyrillicOrUnicode(text: string): boolean {
  return /[^\u0000-\u007F]/.test(text);
}
