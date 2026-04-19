const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
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

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-File-Name, X-Chunk-Index, X-Total-Chunks, X-File-Size');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());

// formData方式上传文件
app.post('/formData/upload', upload.single('file'), (req, res) => {
  res.json({
    message: '上传成功',
    size: req.file.size,
    fileName: req.file.filename
  })
})

// 普通文件上传接口
app.post('/upload', async (req, res) => {
  const fileName = decodeURIComponent(req.headers['x-file-name']);
  console.log(fileName, 'fileName')
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  console.log(`收到数据大小：${buffer.length}`);

  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, buffer);
  res.json({ message: '上传成功', size: buffer.length })
})

// 查询文件分片上传状态
app.get('/upload-status', async (req, res) => {
  const fileHash = req.query.fileHash;
  if (!fileHash) {
    return res.status(400).json({ error: '缺少 fileHash 参数' })
  }
  console.log(`查询文件状态：${fileHash}`)

  // 读取状态文件 - 修改路径
  const statusFilePath = path.join(__dirname, 'chunks', fileHash, 'status.json');
  console.log(statusFilePath, 'statusFilePath')
  if (!fs.existsSync(statusFilePath)) {
    // 文件是否存在
    return res.json({
      fileHash,
      uploadedChunks: [],
      totalChunks: 0,
      isComplete: false
    })
  }
  // 读取文件状态
  const status = JSON.parse(fs.readFileSync(statusFilePath, 'utf-8'));
  res.json(status);
})

// 上传分片接口，single这里的chunk需要跟前端对其
app.post('/upload-chunk', chunkUpload.single('chunk'), async (req, res) => {
  try {
    const { fileHash, chunkIndex } = req.body;
    const chunkDir = path.join(__dirname, 'chunks', fileHash);
    fs.mkdirSync(chunkDir, { recursive: true });
    const chunkPath = path.join(chunkDir, String(chunkIndex));
    fs.writeFileSync(chunkPath, req.file.buffer);
    const uploadedChunks = fs.readdirSync(chunkDir)
      .filter(name => name !== 'status.json')
      .map(name => Number(name))
      .sort((a, b) => a - b);
    const status = {
      fileHash,
      uploadedChunks,
      totalChunks: Number(req.body.totalChunks),
      isComplete: uploadedChunks.length === Number(req.body.totalChunks)
    }
    fs.writeFileSync(
      path.join(chunkDir, 'status.json'),
      JSON.stringify(status, null, 2)
    )
    res.json({ message: '收到分片了', chunkIndex })
  } catch (error) {

  }
})

const PORT = 3000;
app.listen(PORT, () => console.log(`服务器运行在 http://localhost:${PORT}`))