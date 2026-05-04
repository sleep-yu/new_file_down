const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { pipeline } = require('stream/promises');
const app = express();
const multer = require('multer');
const FileDownloader = require('./FileDownloader')

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

app.post('/postRecord', async function (req, res) {
  try {
    const record = req.body;
    // 下载文件
    const downloader = new FileDownloader();
    const { apkPath } = await downloader.downloadFile(record);
    if (fs.existsSync(apkPath)) {
      fs.unlinkSync(apkPath);
    }
  } catch (error) {
    console.log(error)
  }
})

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

const CHUNK_DIR = path.join(__dirname, 'chunks');
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

const isPrivateHostname = (hostname) => {
  const lowerHostname = hostname.toLowerCase();
  if (lowerHostname === 'localhost' || lowerHostname === '::1') return true;

  const ipv4Match = lowerHostname.match(/^(\d{1,3}\.){3}\d{1,3}$/);
  if (!ipv4Match) return false;

  const parts = lowerHostname.split('.').map(Number);
  if (parts.some(part => Number.isNaN(part) || part < 0 || part > 255)) return true;

  return parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || (parts[0] === 169 && parts[1] === 254);
}

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
  res.json({ message: '上传成功', size: buffer.length });
})

// 查询文件分片上传状态
app.get('/upload-status', async (req, res) => {
  cleanupExpiredChunks();
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
    cleanupExpiredChunks();
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
app.post('/merge-chunks', async (req, res) => {
  try {
    cleanupExpiredChunks();
    const { fileHash, fileName } = req.body;

    const chunkDir = path.join(__dirname, 'chunks', fileHash);
    // 读取所有的chunk文件
    const chunkFiles = fs.readdirSync(chunkDir)
      .filter(name => name !== 'status.json')
      .sort((a, b) => Number(a) - Number(b))

    const uploadDir = path.join(__dirname, 'uploads');
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

app.post('/download', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: '缺少 url 参数' });
    }

    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: '只支持 http 或 https 链接' });
    }

    if (isPrivateHostname(parsedUrl.hostname)) {
      return res.status(400).json({ error: '不允许下载内网地址' });
    }

    const fileName = path.basename(decodeURIComponent(parsedUrl.pathname)) || `download_${Date.now()}`;
    const downloadDir = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

    const filePath = path.join(downloadDir, fileName);
    await downloadFile(url, filePath);

    res.json({
      message: '下载成功',
      fileName,
      filePath
    });
  } catch (error) {
    console.error('下载文件失败:', error);
    res.status(500).json({ error: error.message || '下载失败' });
  }
});

const downloadFile = (url, filePath) => {
  return new Promise((resolve, reject) => {
    const fileWriteStream = fs.createWriteStream(filePath);
    https.get(url, (response) => {
      response.pipe(fileWriteStream);

      fileWriteStream.on('finish', () => {
        fileWriteStream.close();
        resolve();
      });

      response.on('error', (error) => {
        fs.unlink(filePath, (err) => {
          if (err) {
            this.logger.error(`Error deleting file: ${err.message}`);
          }
        });
        reject(`Error downloading resource: ${error.message}`);
      });
    });
  })
}

const PORT = 3000;
app.listen(PORT, () => console.log(`服务器运行在 http://localhost:${PORT}`))