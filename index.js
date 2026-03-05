const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-File-Name, X-Chunk-Index, X-Total-Chunks');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());

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

app.post('/upload-chunk', async (req, res) => {
  // 获取分片信息
  const fileName = decodeURIComponent(req.headers['x-file-name']);
  res.json({ message: '分片上传接口已就绪' })
})

const PORT = 3000;
app.listen(PORT, () => console.log(`服务器运行在 http://localhost:${PORT}`))