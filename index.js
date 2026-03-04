const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
const chunksDir = path.join(__dirname, 'chunks');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(chunksDir)) fs.mkdirSync(chunksDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

// 普通文件上传接口
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });
  res.json({
    message: '上传成功',
    filename: req.file.filename,
    path: req.file.path
  });
});

// 分片上传接口
app.post('/upload-chunk', upload.single('chunk'), (req, res) => {
  const { filename, chunkIndex } = req.body;
  if (!req.file || !filename || chunkIndex === undefined) {
    return res.status(400).json({ error: '参数不完整' });
  }

  const fileChunkDir = path.join(chunksDir, filename);
  if (!fs.existsSync(fileChunkDir)) fs.mkdirSync(fileChunkDir);

  const chunkPath = path.join(fileChunkDir, chunkIndex);
  fs.renameSync(req.file.path, chunkPath);

  res.json({ message: '分片上传成功', chunkIndex });
});

// 合并分片接口
app.post('/merge-chunks', (req, res) => {
  const { filename, totalChunks } = req.body;
  if (!filename || !totalChunks) {
    return res.status(400).json({ error: '参数不完整' });
  }

  const fileChunkDir = path.join(chunksDir, filename);
  const filePath = path.join(uploadDir, filename);

  const writeStream = fs.createWriteStream(filePath);

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(fileChunkDir, String(i));
    const data = fs.readFileSync(chunkPath);
    writeStream.write(data);
  }

  writeStream.end();
  writeStream.on('finish', () => {
    fs.rmSync(fileChunkDir, { recursive: true });
    res.json({ message: '文件合并成功', path: filePath });
  });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`服务器运行在 http://localhost:${PORT}`));
