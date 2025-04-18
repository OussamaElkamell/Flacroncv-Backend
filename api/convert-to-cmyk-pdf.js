import formidable from 'formidable';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

// Configure formidable to handle file uploads
const form = new formidable.IncomingForm();
form.uploadDir = './uploads'; // Temporary directory
form.keepExtensions = true;

// This will process the file and convert it to a CMYK PDF
export const config = {
  api: {
    bodyParser: false, // Disable default body parsing as we are using formidable
  },
};

export default async (req, res) => {
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(500).send('Error processing file.');
    }

    try {
      if (!files.image) {
        return res.status(400).send('No image file uploaded.');
      }

      const uploadedImage = files.image[0];
      
      // Convert the image to CMYK using sharp
      const cmykImageBuffer = await sharp(uploadedImage.filepath)
        .withMetadata()
        .toColourspace('cmyk') // sharp supports this
        .toBuffer();

      // Generate PDF using pdf-lib
      const pdfDoc = await PDFDocument.create();
      const pngImage = await pdfDoc.embedPng(cmykImageBuffer);
      const { width, height } = pngImage.scaleToFit(595.28, 841.89);
      const page = pdfDoc.addPage([595.28, 841.89]);
      page.drawImage(pngImage, {
        x: 0,
        y: 841.89 - height,
        width,
        height,
      });
      const pdfBytes = await pdfDoc.save();

      // Send the PDF response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=output-cmyk.pdf');
      res.status(200).send(Buffer.from(pdfBytes)); // Send the PDF content as response
    } catch (error) {
      console.error('Error generating CMYK PDF:', error);
      res.status(500).send('Error generating CMYK-style PDF');
    }
  });
};
