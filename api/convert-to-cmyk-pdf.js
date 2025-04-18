import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';

export const config = {
  api: {
    bodyParser: false, // Important: disables default body parsing
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const form = new IncomingForm({ uploadDir: '/tmp', keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err || !files.image) {
      console.error('Form parsing error or no file:', err);
      return res.status(400).send('Invalid image upload');
    }

    try {
      const uploadedPath = files.image[0]?.filepath || files.image.filepath || files.image.path;
      const cmykImagePath = path.join('/tmp', `cmyk-${Date.now()}.png`);

      // Convert image to CMYK
      await sharp(uploadedPath)
        .withMetadata()
        .toColourspace('cmyk')
        .toFile(cmykImagePath);

      // Create PDF
      const pdfDoc = await PDFDocument.create();
      const pngBytes = fs.readFileSync(cmykImagePath);
      const pngImage = await pdfDoc.embedPng(pngBytes);
      const { width, height } = pngImage.scaleToFit(595.28, 841.89); // A4

      const page = pdfDoc.addPage([595.28, 841.89]);
      page.drawImage(pngImage, {
        x: 0,
        y: 841.89 - height,
        width,
        height,
      });

      const pdfBytes = await pdfDoc.save();

      // Send PDF response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=output-cmyk.pdf');
      res.status(200).end(Buffer.from(pdfBytes));

      // Cleanup
      fs.unlinkSync(uploadedPath);
      fs.unlinkSync(cmykImagePath);

    } catch (error) {
      console.error('Processing error:', error);
      res.status(500).send('Failed to process image and generate PDF.');
    }
  });
}
