const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

router.post('/convert-to-cmyk-pdf', async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).send('No image file uploaded.');
    }

    const image = req.files.image;
    const uploadDir = path.join(__dirname, 'tmp'); // Ensure it's inside your project directory
    const inputPath = path.join(uploadDir, image.name);
    const cmykImagePath = path.join(uploadDir, `cmyk-${Date.now()}.png`);

    // Ensure upload directory exists
    await fs.promises.mkdir(uploadDir, { recursive: true });

    // Save and convert image to CMYK
    await image.mv(inputPath);
    await sharp(inputPath)
      .withMetadata()
      .toFile(cmykImagePath);

    const metadata = await sharp(cmykImagePath).metadata();
    const imgWidth = metadata.width;
    const imgHeight = metadata.height;

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const bottomMargin =0;

    const scaleX = pageWidth / imgWidth;
    const scaleY = pageHeight / imgHeight;
    const scale = Math.min(scaleX, scaleY);

    const pdfDoc = await PDFDocument.create();
    const usableHeightPt = pageHeight - bottomMargin;
    const visibleHeightInPx = Math.floor(usableHeightPt / scale);

    const totalPages = Math.ceil(imgHeight / visibleHeightInPx);

    for (let i = 0; i < totalPages; i++) {
      const top = i * visibleHeightInPx;
      const height = Math.min(visibleHeightInPx, imgHeight - top);
      const slicePath = path.join(uploadDir, `slice-${i}-${Date.now()}.png`);

      // Extract image slice
      await sharp(cmykImagePath)
        .extract({
          left: 0,
          top: Math.floor(top),
          width: imgWidth,
          height: Math.floor(height),
        })
        .toFile(slicePath);

      const sliceBytes = await fs.promises.readFile(slicePath);
      const pdfImage = await pdfDoc.embedPng(sliceBytes);
      const scaledHeight = height * scale;

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const yOffset = i === 0 ? pageHeight - scaledHeight : pageHeight - bottomMargin - scaledHeight;
      const scaledWidth = imgWidth * scale;
      page.drawImage(pdfImage, {
   
        y: yOffset,
        width: scaledWidth,
        x: (pageWidth - scaledWidth) / 2,
        height: scaledHeight,
      });

      // Clean up slice file after use
      await fs.promises.unlink(slicePath);
    }

    const pdfBytes = await pdfDoc.save();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=output-cmyk.pdf',
      'Content-Length': pdfBytes.length,
    });

    res.status(200).end(Buffer.from(pdfBytes));

    // Clean up uploaded files
    await fs.promises.unlink(inputPath);
    await fs.promises.unlink(cmykImagePath);

  } catch (error) {
    console.error('Error generating CMYK PDF:', error);
    res.status(500).send('Error generating CMYK-style PDF');
  }
});

module.exports = router;
