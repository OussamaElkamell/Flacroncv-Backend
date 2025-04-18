const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

// POST /api/pdf/convert-cmyk
router.post('/convert-to-cmyk-pdf', async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).send('No image file uploaded.');
    }

    const image = req.files.image;
    const uploadDir = '/tmp';
    const inputPath = path.join(uploadDir, image.name);
    const cmykImagePath = path.join(uploadDir, `cmyk-${Date.now()}.png`);

    // Ensure the upload directory exists
    fs.mkdirSync(uploadDir, { recursive: true });

    // Save image to disk
    await image.mv(inputPath);

    // Convert to CMYK
    await sharp(inputPath)
      .withMetadata()
      .toColourspace('cmyk')
      .toFile(cmykImagePath);

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const pngBytes = fs.readFileSync(cmykImagePath);
    const pngImage = await pdfDoc.embedPng(pngBytes);
    const { width, height } = pngImage.scaleToFit(595.28, 841.89); // A4 size

    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawImage(pngImage, {
      x: 0,
      y: 841.89 - height,
      width,
      height,
    });

    const pdfBytes = await pdfDoc.save();
    console.log(pdfBytes.slice(0, 100));
    // Send PDF response
    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=output-cmyk.pdf',
        'Content-Length': pdfBytes.length, // 💡 VERY important for binary download
      });
      res.status(200).end(Buffer.from(pdfBytes)); // instead of res.send()

    // Cleanup
    fs.unlinkSync(inputPath);
    fs.unlinkSync(cmykImagePath);

  } catch (error) {
    console.error('Error converting to CMYK PDF:', error);
    res.status(500).send('Error generating CMYK-style PDF');
  }
});

module.exports = router;
