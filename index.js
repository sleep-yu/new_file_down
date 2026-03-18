const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

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
  const statusFilePath = path.join(__dirname, 'temp_chunks', fileHash, 'status.json');
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

// 上传分片接口
app.get('/uplpad-chunk', async (req, res) => {
  try {
    // 1.从请求头获取分片信息
    const fileHash = req.headers['x-file-hash'];
    const chunkIndex = parseInt(req.headers['x-chunk-index']);
    const totalChunks = parseInt(req.headers['x-total-chunks']);
    const fileName = decodeURIComponent(req.headers['x-file-name']);
    const fileSize = parseInt(req.headers['x-file-size']);
  } catch (error) {

  }
})

const PORT = 3000;
app.listen(PORT, () => console.log(`服务器运行在 http://localhost:${PORT}`))