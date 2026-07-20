const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { companyAuth } = require('../middleware/auth');
const {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  testSearch
} = require('../controllers/knowledgeBaseController');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration — store PDFs temporarily in /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `doc_${timestamp}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB default limit
});

// All KB routes require company authentication
router.post('/upload', companyAuth, upload.single('document'), uploadDocument);
router.get('/documents', companyAuth, listDocuments);
router.get('/document/:docId', companyAuth, getDocument);
router.delete('/document/:docId', companyAuth, deleteDocument);
router.get('/search', companyAuth, testSearch);

module.exports = router;
