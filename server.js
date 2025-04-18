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
app.options('*', cors(corsOptions));
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
app.use('/api', pdfRoutes);

// Endpoint to convert image to CMYK PDF

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : null
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}/api`);
});

