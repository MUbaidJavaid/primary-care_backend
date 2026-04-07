const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { uploadGuideline, getGuidelines, deleteGuideline, reingest } = require('../controllers/guideline.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and DOCX files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/upload', protect, adminOnly, upload.single('file'), uploadGuideline);
router.get('/', protect, getGuidelines);
router.delete('/:id', protect, adminOnly, deleteGuideline);
router.post('/ingest', protect, adminOnly, reingest);

module.exports = router;
