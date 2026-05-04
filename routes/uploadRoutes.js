const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// 普通文件上传接口
router.post('/upload', async (req, res) => {
  const fileName = decodeURIComponent(req.headers['x-file-name']);
  console.log(fileName, 'fileName')
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  console.log(`收到数据大小：${buffer.length}`);

  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, buffer);
  res.json({ message: '上传成功', size: buffer.length });
})

module.exports = router;
