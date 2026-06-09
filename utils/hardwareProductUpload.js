const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/hardware-products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `hardware-${uniqueSuffix}${ext}`);
  },
});

const hardwareProductUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const mimetype = allowed.test(file.mimetype);
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files (jpg, jpeg, png, webp, gif) are allowed'));
  },
});

module.exports = hardwareProductUpload;
