const express = require('express');
const fs = require('fs');
const FileDownloader = require('../FileDownloader');

const router = express.Router();

router.post('/postRecord', async function (req, res) {
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

module.exports = router;
