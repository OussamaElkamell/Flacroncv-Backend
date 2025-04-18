const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

exports.convertToCMYKPDF = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const inputPath = req.file.path;
  const tifPath = `${inputPath}.tif`;
  const outputPath = `${inputPath}.pdf`;

  // Step 1: Convert PNG to CMYK TIFF
  exec(`convert ${inputPath} -colorspace CMYK ${tifPath}`, (err) => {
    if (err) {
      console.error('ImageMagick conversion error:', err);
      return res.status(500).send('ImageMagick error');
    }

    // Step 2: Convert TIFF to PDF using Ghostscript
    exec(`gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=pdfwrite -sProcessColorModel=DeviceCMYK -sOutputFile=${outputPath} -f ${tifPath}`, (err2) => {
      if (err2) {
        console.error('Ghostscript error:', err2);
        return res.status(500).send('Ghostscript error');
      }

      res.download(outputPath, 'document-cmyk.pdf', () => {
        // Cleanup temporary files
        fs.unlinkSync(inputPath);
        fs.unlinkSync(tifPath);
        fs.unlinkSync(outputPath);
      });
    });
  });
};
