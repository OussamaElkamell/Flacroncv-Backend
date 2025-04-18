import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Vercel serverless function handler
export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      if (!req.body || !req.body.files || !req.body.files.image) {
        return res.status(400).send('No image file uploaded.');
      }

      const image = req.body.files.image;
      const uploadDir = path.join('/tmp', 'uploads'); // Use '/tmp' for Vercel's serverless temp storage
      const inputPath = path.join(uploadDir, image.name);
      const cmykImagePath = path.join(uploadDir, 'cmyk_image.png');

      // Ensure upload directory exists
      fs.mkdirSync(uploadDir, { recursive: true });

      // Save uploaded image to temp directory
      fs.writeFileSync(inputPath, Buffer.from(image.data, 'base64'));

      // Convert the image to CMYK using sharp
      await sharp(inputPath)
        .withMetadata()
        .toColourspace('cmyk') // Convert to CMYK color space
        .toFile(cmykImagePath);

      // Generate PDF using pdf-lib
      const pdfDoc = await PDFDocument.create();
      const pngBytes = fs.readFileSync(cmykImagePath);
      const pngImage = await pdfDoc.embedPng(pngBytes);
      const { width, height } = pngImage.scaleToFit(595.28, 841.89); // A4 paper size
      const page = pdfDoc.addPage([595.28, 841.89]);
      page.drawImage(pngImage, {
        x: 0,
        y: 841.89 - height, // Align image to the bottom of the page
        width,
        height,
      });
      const pdfBytes = await pdfDoc.save();

      // Return the generated PDF as a response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=output-cmyk.pdf');
      res.status(200).end(Buffer.from(pdfBytes));

      // Cleanup: Delete the uploaded and converted image files
      fs.unlinkSync(inputPath);
      fs.unlinkSync(cmykImagePath);

    } catch (err) {
      console.error('Error in CMYK PDF generation:', err);
      res.status(500).send('Error generating CMYK-style PDF');
    }
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
