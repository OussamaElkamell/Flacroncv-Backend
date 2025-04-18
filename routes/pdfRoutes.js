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
    const uploadDir = '/tmp';
    const inputPath = path.join(uploadDir, image.name);
    const cmykImagePath = path.join(uploadDir, `cmyk-${Date.now()}.png`);

    fs.mkdirSync(uploadDir, { recursive: true });

    // Save and convert image to CMYK
    await image.mv(inputPath);
    await sharp(inputPath)
      .withMetadata()
      .toColourspace('cmyk')
      .toFile(cmykImagePath);

    const metadata = await sharp(cmykImagePath).metadata();
    const imgWidth = metadata.width;
    const imgHeight = metadata.height;

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const topMargin = 0; // No top margin on the first page
    const bottomMargin = 20; // Bottom margin for every page except the first one

    const scale = pageWidth / imgWidth;
    const usableHeightPt = pageHeight - (bottomMargin); // Subtract bottom margin for all pages
    const visibleHeightInPx = Math.floor(usableHeightPt / scale); // height in image px

    const pdfDoc = await PDFDocument.create();
    const totalPages = Math.ceil(imgHeight / visibleHeightInPx);

    let currentTop = 0; // Initial starting point for top of the image on the first page

    for (let i = 0; i < totalPages; i++) {
      const top = i * visibleHeightInPx;
      const height = Math.min(visibleHeightInPx, imgHeight - top);
      const slicePath = path.join(uploadDir, `slice-${i}-${Date.now()}.png`);

      await sharp(cmykImagePath)
        .extract({
          left: 0,
          top: Math.floor(top),
          width: imgWidth,
          height: Math.floor(height),
        })
        .toFile(slicePath);

      const sliceBytes = fs.readFileSync(slicePath);
      const pdfImage = await pdfDoc.embedPng(sliceBytes);
      const scaledHeight = height * scale;

      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      // Adjust yOffset: the first page has no top or bottom margin, subsequent pages have a bottom margin
      const yOffset = i === 0 ? pageHeight - scaledHeight : pageHeight - bottomMargin - scaledHeight;

      page.drawImage(pdfImage, {
        x: 0,
        y: yOffset,
        width: pageWidth,
        height: scaledHeight,
      });

      fs.unlinkSync(slicePath);
    }

    const pdfBytes = await pdfDoc.save();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=output-cmyk.pdf',
      'Content-Length': pdfBytes.length,
    });
    res.status(200).end(Buffer.from(pdfBytes));

    fs.unlinkSync(inputPath);
    fs.unlinkSync(cmykImagePath);

  } catch (error) {
    console.error('Error generating CMYK PDF:', error);
    res.status(500).send('Error generating CMYK-style PDF');
  }
});

module.exports = router;
