import formidable from 'formidable';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

export const config = {
  api: {
    bodyParser: false,  // Disable body parsing, as we need to parse the form manually
  },
};

export default async (req, res) => {
  console.log("Request received");

  const form = new formidable.Form();  // Corrected: Use `new formidable.Form()`

  // Parse the form data (handling file upload)
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.log("Error parsing form:", err);
      return res.status(500).send('Error parsing file');
    }

    console.log("Form parsed successfully");
    const uploadedFile = files.image ? files.image[0] : null;  // Check the uploaded file
    if (!uploadedFile) {
      console.log("No file uploaded");
      return res.status(400).send('No file uploaded');
    }

    try {
      console.log("Converting image to CMYK");
      // Convert the image to CMYK using sharp
      const cmykBuffer = await sharp(uploadedFile.filepath)
        .withMetadata()
        .toColourspace('cmyk')
        .toBuffer();

      console.log("CMYK conversion complete");

      // Create PDF and embed the image
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
      console.log("Error in CMYK PDF generation:", error);
      return res.status(500).send('Error generating CMYK PDF');
    }
  });
};
