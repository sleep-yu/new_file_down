const fs = require('fs');
const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);  // 使用原始文件名
  }
})

const upload = multer({ storage });
// 拿到分片的buffer,memoryStorage会把分片放到req.file.buffer
const chunkUpload = multer({ storage: multer.memoryStorage() });

module.exports = {
  upload,
  chunkUpload
};
