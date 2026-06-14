import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

// Cleans up a photographed receipt into a flat, high-contrast "scanned
// document" look: auto-orients, normalizes/whitens the background, and
// sharpens text. Returns a PNG buffer.
export async function enhanceReceiptImage(buffer) {
    return sharp(buffer)
        .rotate()
        .normalize()
        .linear(1.15, -10)
        .sharpen()
        .png()
        .toBuffer();
}

// Wraps an image buffer (PNG/JPEG) into a single-page PDF sized to the
// image's pixel dimensions. Returns a PDF buffer.
export async function imageToPdf(buffer) {
    const { width, height, format } = await sharp(buffer).metadata();

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([width, height]);

    const image =
        format === 'jpeg' || format === 'jpg'
            ? await pdfDoc.embedJpg(buffer)
            : await pdfDoc.embedPng(buffer);

    page.drawImage(image, { x: 0, y: 0, width, height });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}
