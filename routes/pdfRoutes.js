const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const { convertToCMYKPDF } = require('../controllers/pdfController');

router.post('/convert-to-cmyk-pdf', upload.single('image'), convertToCMYKPDF);

module.exports = router;
