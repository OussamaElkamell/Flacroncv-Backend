import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import nextConnect from 'next-connect';
import multer from 'multer';

const upload = multer({ dest: '/tmp/uploads/' }); // Using a temporary directory for file upload

const handler = nextConnect();

// Middleware to handle file upload
handler.use(upload.single('image'));  // Handle a single file upload with the field name 'image'

handler.post(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No image file uploaded.');
    }

    const uploadedImagePath = req.file.path;  // Path to the uploaded image
    const uploadDir = path.join('/tmp/uploads'); // Temporary upload directory
    const cmykImagePath = path.join(uploadDir, 'cmyk_image.png');

    // Convert image to CMYK using sharp
    await sharp(uploadedImagePath)
      .withMetadata()
      .toColourspace('cmyk') // sharp supports this for CMYK conversion
      .toFile(cmykImagePath);

    // Generate PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const pngBytes = fs.readFileSync(cmykImagePath);
    const pngImage = await pdfDoc.embedPng(pngBytes);
    const { width, height } = pngImage.scaleToFit(595.28, 841.89); // Size for A4 paper
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawImage(pngImage, {
      x: 0,
      y: 841.89 - height, // Align the image to the bottom of the page
      width,
      height,
    });
    const pdfBytes = await pdfDoc.save();

    // Return the generated PDF as a response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=output-cmyk.pdf');
    res.status(200).end(Buffer.from(pdfBytes));

    // Cleanup: Delete the uploaded and converted image files
    fs.unlinkSync(uploadedImagePath);
    fs.unlinkSync(cmykImagePath);
  } catch (err) {
    console.error('Error in CMYK PDF generation:', err);
    res.status(500).send('Error generating CMYK-style PDF');
  }
});

export default handler;
