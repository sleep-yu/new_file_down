const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');

const router = express.Router();

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

router.post('/download', async (req, res) => {
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
    const downloadDir = path.join(__dirname, '..', 'downloads');
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

module.exports = router;
