const express = require('express');
const { upload } = require('../middlewares/uploadMiddleware');

const router = express.Router();

// formData方式上传文件
router.post('/formData/upload', upload.single('file'), (req, res) => {
  res.json({
    message: '上传成功',
    size: req.file.size,
    fileName: req.file.filename
  })
})

module.exports = router;
