const express = require('express');
const fs = require('fs');
const path = require('path');
const { chunkUpload } = require('../middlewares/uploadMiddleware');

const router = express.Router();
const CHUNK_DIR = path.join(__dirname, '..', 'chunks');
const CHUNK_EXPIRE_TIME = 24 * 60 * 60 * 1000;

const cleanupExpiredChunks = () => {
  if (!fs.existsSync(CHUNK_DIR)) return;
  const chunkFolders = fs.readdirSync(CHUNK_DIR);
  for (const item of chunkFolders) {
    const chunkPath = path.join(CHUNK_DIR, item);
    if (!fs.statSync(chunkPath).isDirectory()) continue;
    const statusFilePath = path.join(chunkPath, 'status.json');
    if (!fs.existsSync(statusFilePath)) continue;
    const status = JSON.parse(fs.readFileSync(statusFilePath, 'utf-8'));
    const isExpired = Date.now() - status.updatedAt > CHUNK_EXPIRE_TIME;
    if (isExpired) {
      fs.rmSync(chunkPath, { recursive: true, force: true });
    }
  }
}

// 查询文件分片上传状态
router.get('/upload-status', async (req, res) => {
  cleanupExpiredChunks();
  const fileHash = req.query.fileHash;
  if (!fileHash) {
    return res.status(400).json({ error: '缺少 fileHash 参数' })
  }
  console.log(`查询文件状态：${fileHash}`)

  // 读取状态文件 - 修改路径
  const statusFilePath = path.join(__dirname, '..', 'chunks', fileHash, 'status.json');
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
router.post('/upload-chunk', chunkUpload.single('chunk'), async (req, res) => {
  try {
    cleanupExpiredChunks();
    const { fileHash, chunkIndex } = req.body;
    const chunkDir = path.join(__dirname, '..', 'chunks', fileHash);
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
      isComplete: uploadedChunks.length === Number(req.body.totalChunks),
      updatedAt: Date.now()
    }
    fs.writeFileSync(
      path.join(chunkDir, 'status.json'),
      JSON.stringify(status, null, 2)
    )
    res.json({ message: '收到分片了', chunkIndex })
  } catch (error) {
    console.error('上传分片失败：', error)
  }
})

// 合并分片
router.post('/merge-chunks', async (req, res) => {
  try {
    cleanupExpiredChunks();
    const { fileHash, fileName } = req.body;

    const chunkDir = path.join(__dirname, '..', 'chunks', fileHash);
    // 读取所有的chunk文件
    const chunkFiles = fs.readdirSync(chunkDir)
      .filter(name => name !== 'status.json')
      .sort((a, b) => Number(a) - Number(b))

    const uploadDir = path.join(__dirname, '..', 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    const buffers = chunkFiles.map(chunkFile => {
      const chunkPath = path.join(chunkDir, chunkFile);
      return fs.readFileSync(chunkPath)
    })
    const fileBuffer = Buffer.concat(buffers);
    fs.writeFileSync(filePath, fileBuffer);
    // 删除chunk  recursive: true-把目录里面内容一起删掉 force: true - 即使有些小问题也尽量删
    fs.rmSync(chunkDir, { recursive: true, force: true })

    res.json({ message: '合并成功', fileName })
  } catch (error) {
    console.error('合并分片失败：', error);
  }
})

module.exports = router;
