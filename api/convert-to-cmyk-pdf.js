import formidable from 'formidable';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async (req, res) => {
  console.log("Request received");  // Debugging line
  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.log("Error parsing form:", err);  // Debugging line
      return res.status(500).send('Error parsing file');
    }

    console.log("Form parsed successfully");  // Debugging line
    const uploadedFile = files.image ? files.image[0] : null;
    if (!uploadedFile) {
      console.log("No file uploaded");  // Debugging line
      return res.status(400).send('No file uploaded');
    }

    try {
      console.log("Converting image to CMYK");  // Debugging line
      const cmykBuffer = await sharp(uploadedFile.filepath)
        .withMetadata()
        .toColourspace('cmyk')
        .toBuffer();

      console.log("CMYK conversion complete");  // Debugging line

      const pdfDoc = await PDFDocument.create();
      const pngImage = await pdfDoc.embedPng(cmykBuffer);
      const { width, height } = pngImage.scaleToFit(595.28, 841.89);
      const page = pdfDoc.addPage([595.28, 841.89]);
      page.drawImage(pngImage, { x: 0, y: 841.89 - height, width, height });

      const pdfBytes = await pdfDoc.save();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=output-cmyk.pdf');
      return res.status(200).send(Buffer.from(pdfBytes));
    } catch (error) {
      console.log("Error in CMYK PDF generation:", error);  // Debugging line
      return res.status(500).send('Error generating CMYK PDF');
    }
  });
};
