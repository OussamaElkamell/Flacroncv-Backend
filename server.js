require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const authRoutes = require('./routes/auth.routes');
const resumeRoutes = require('./routes/resume.routes');
const coverLetterRoutes = require('./routes/coverLetter.routes');
const paymentRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');
const pdfRoutes = require('./routes/pdfRoutes');
const fileUpload = require('express-fileupload');
const potrace = require('potrace');
const { exec } = require('child_process');
// Initialize Firebase Admin
require('./services/firebase-admin');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware

app.use(cors(corsOptions));
app.use(fileUpload());
// Add the raw body parser for Stripe webhook before json parser
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// Other middleware - IMPORTANT: This comes AFTER the webhook middleware
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/cover-letter', coverLetterRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
// Endpoint to convert image to CMYK PDF
app.post('/api/convert-to-cmyk-pdf', async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).send('No image file uploaded.');
    }

    const image = req.files.image;
    const uploadDir = path.join(__dirname, 'uploads');
    const inputPath = path.join(uploadDir, image.name);
    const cmykImagePath = path.join(uploadDir, 'cmyk_image.png');

    // Save uploaded image
    fs.writeFileSync(inputPath, image.data);

    // Convert image to CMYK using ICC profile
    await sharp(inputPath)
      .withMetadata()
      .toColourspace('cmyk') // sharp supports this
      .toFile(cmykImagePath);

    // Generate PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const pngBytes = fs.readFileSync(cmykImagePath);
    const pngImage = await pdfDoc.embedPng(pngBytes);
    const { width, height } = pngImage.scaleToFit(595.28, 841.89);
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawImage(pngImage, {
      x: 0,
      y: 841.89 - height,
      width,
      height,
    });
    const pdfBytes = await pdfDoc.save();

    // Return PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=output-cmyk.pdf',
      'Content-Length': pdfBytes.length, // 💡 VERY important for binary download
    });
    res.status(200).end(Buffer.from(pdfBytes)); // instead of res.send()
    

    // Cleanup
    fs.unlinkSync(inputPath);
    fs.unlinkSync(cmykImagePath);
  } catch (err) {
    console.error('Error in CMYK PDF generation:', err);
    res.status(500).send('Error generating CMYK-style PDF');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : null
  });
});

// // Start the server
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
//   console.log(`API URL: http://localhost:${PORT}/api`);
// });
module.exports = app;
