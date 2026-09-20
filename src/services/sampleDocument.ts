import { PDFDocument, rgb, PageSizes } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { loadFontBytes } from './fontManager';

export async function createSamplePdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const { regular, bold } = await loadFontBytes();
  const fontRegular = await pdfDoc.embedFont(regular, { subset: true });
  const fontBold = await pdfDoc.embedFont(bold, { subset: true });

  const page = pdfDoc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();

  // Top header bar (dark blue)
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width: width,
    height: 80,
    color: rgb(0.08, 0.22, 0.45),
  });

  // Top header text
  page.drawText('PDF PRO • ДЕМОНСТРАЦІЙНИЙ ДОКУМЕНТ', {
    x: 40,
    y: height - 48,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('Система електронного документообігу та редагування', {
    x: 40,
    y: height - 68,
    size: 11,
    font: fontRegular,
    color: rgb(0.85, 0.9, 1),
  });

  // Document title
  page.drawText('КОМЕРЦІЙНА ПРОПОЗИЦІЯ № КП-2026/09', {
    x: 40,
    y: height - 125,
    size: 16,
    font: fontBold,
    color: rgb(0.12, 0.15, 0.2),
  });

  page.drawText('Дата складання: 20 вересня 2026 року', {
    x: 40,
    y: height - 145,
    size: 11,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5),
  });

  // Client info card (light background)
  page.drawRectangle({
    x: 40,
    y: height - 230,
    width: width - 80,
    height: 70,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.85, 0.88, 0.94),
    borderWidth: 1,
  });

  page.drawText('ЗАМОВНИК: ТОВ "ІННОВАЦІЙНІ ТЕХНОЛОГІЇ"', {
    x: 55,
    y: height - 180,
    size: 12,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.3),
  });

  page.drawText('Контактна особа: Коваленко Олександр Володимирович | Тел: +380 44 123-45-67', {
    x: 55,
    y: height - 200,
    size: 10,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.45),
  });

  page.drawText('Адреса: м. Київ, вул. Хрещатик, буд. 22, оф. 405', {
    x: 55,
    y: height - 218,
    size: 10,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.45),
  });

  // Section: Description of services
  page.drawText('Специфікація робіт та послуг:', {
    x: 40,
    y: height - 265,
    size: 13,
    font: fontBold,
    color: rgb(0.12, 0.15, 0.2),
  });

  // Table header
  const tableY = height - 295;
  page.drawRectangle({
    x: 40,
    y: tableY,
    width: width - 80,
    height: 25,
    color: rgb(0.9, 0.93, 0.98),
  });

  page.drawText('№', { x: 50, y: tableY + 7, size: 10, font: fontBold, color: rgb(0.1, 0.2, 0.35) });
  page.drawText('Найменування послуги / робіт', { x: 80, y: tableY + 7, size: 10, font: fontBold, color: rgb(0.1, 0.2, 0.35) });
  page.drawText('К-сть', { x: 360, y: tableY + 7, size: 10, font: fontBold, color: rgb(0.1, 0.2, 0.35) });
  page.drawText('Ціна (грн)', { x: 420, y: tableY + 7, size: 10, font: fontBold, color: rgb(0.1, 0.2, 0.35) });
  page.drawText('Сума (грн)', { x: 490, y: tableY + 7, size: 10, font: fontBold, color: rgb(0.1, 0.2, 0.35) });

  // Table rows
  const rows = [
    { n: '1', name: 'Проектування та розробка веб-платформи', qty: '1 комплекс', price: '75 000,00', sum: '75 000,00' },
    { n: '2', name: 'Дизайн інтерфейсу користувача (UI/UX)', qty: '1 проект', price: '30 000,00', sum: '30 000,00' },
    { n: '3', name: 'Модуль обробки та редагування PDF документів', qty: '1 модуль', price: '25 000,00', sum: '25 000,00' },
    { n: '4', name: 'Тестування, налагодження та впровадження', qty: '40 годин', price: '1 250,00', sum: '50 000,00' },
  ];

  let currentY = tableY;
  rows.forEach((r, idx) => {
    currentY -= 26;
    if (idx % 2 === 1) {
      page.drawRectangle({
        x: 40,
        y: currentY,
        width: width - 80,
        height: 26,
        color: rgb(0.98, 0.98, 0.99),
      });
    }

    page.drawLine({
      start: { x: 40, y: currentY },
      end: { x: width - 40, y: currentY },
      thickness: 0.5,
      color: rgb(0.88, 0.9, 0.94),
    });

    page.drawText(r.n, { x: 50, y: currentY + 7, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.25) });
    page.drawText(r.name, { x: 80, y: currentY + 7, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.25) });
    page.drawText(r.qty, { x: 360, y: currentY + 7, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.25) });
    page.drawText(r.price, { x: 420, y: currentY + 7, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.25) });
    page.drawText(r.sum, { x: 490, y: currentY + 7, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.25) });
  });

  // Total amount row
  currentY -= 32;
  page.drawRectangle({
    x: 320,
    y: currentY,
    width: width - 360,
    height: 30,
    color: rgb(0.92, 0.95, 1),
    borderColor: rgb(0.7, 0.8, 0.95),
    borderWidth: 1,
  });

  page.drawText('РАЗОМ ДО СПЛАТИ:', {
    x: 335,
    y: currentY + 9,
    size: 11,
    font: fontBold,
    color: rgb(0.08, 0.22, 0.45),
  });

  page.drawText('180 000,00 грн', {
    x: 460,
    y: currentY + 9,
    size: 12,
    font: fontBold,
    color: rgb(0.08, 0.45, 0.2),
  });

  // Hint box for the user
  const hintY = currentY - 70;
  page.drawRectangle({
    x: 40,
    y: hintY,
    width: width - 80,
    height: 52,
    color: rgb(1, 0.98, 0.9),
    borderColor: rgb(0.95, 0.85, 0.6),
    borderWidth: 1,
  });

  page.drawText('💡 ПІДКАЗКА РЕДАКТОРА PDF PRO:', {
    x: 55,
    y: hintY + 34,
    size: 10,
    font: fontBold,
    color: rgb(0.65, 0.45, 0.05),
  });

  page.drawText('Клікніть на будь-який рядок тексту у цьому документі (наприклад, суму чи замовника),', {
    x: 55,
    y: hintY + 20,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.4, 0.3, 0.05),
  });

  page.drawText('щоб змінити його прямо на місці! Ви також можете вставити картинку (Cmd+V), додати підпис або штамп.', {
    x: 55,
    y: hintY + 8,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.4, 0.3, 0.05),
  });

  // Signatures section
  const sigY = hintY - 80;
  page.drawText('Виконавець:', { x: 50, y: sigY + 25, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.3) });
  page.drawText('ТОВ "Професійні Рішення"', { x: 50, y: sigY + 10, size: 9.5, font: fontRegular, color: rgb(0.3, 0.35, 0.4) });
  page.drawLine({ start: { x: 50, y: sigY - 15 }, end: { x: 230, y: sigY - 15 }, thickness: 1, color: rgb(0.6, 0.65, 0.7) });
  page.drawText('(підпис, М.П.)', { x: 105, y: sigY - 27, size: 8, font: fontRegular, color: rgb(0.5, 0.55, 0.6) });

  page.drawText('Замовник:', { x: 340, y: sigY + 25, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.3) });
  page.drawText('ТОВ "Інноваційні Технології"', { x: 340, y: sigY + 10, size: 9.5, font: fontRegular, color: rgb(0.3, 0.35, 0.4) });
  page.drawLine({ start: { x: 340, y: sigY - 15 }, end: { x: 520, y: sigY - 15 }, thickness: 1, color: rgb(0.6, 0.65, 0.7) });
  page.drawText('(підпис, М.П.)', { x: 395, y: sigY - 27, size: 8, font: fontRegular, color: rgb(0.5, 0.55, 0.6) });

  // Footer
  page.drawText('Документ згенеровано за допомогою PDF PRO • Сторінка 1 з 1', {
    x: (width - 270) / 2,
    y: 25,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.6, 0.65, 0.7),
  });

  return await pdfDoc.save();
}
