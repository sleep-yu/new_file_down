const fs = require('fs');
const https = require('https');
const path = require('path')

class FileDownloader {
  async downloadFile(record) {
    try {
      const { downloadUrl } = record;
      const apkPath = this.getFileName(downloadUrl);
      await this.downloadResource(downloadUrl, apkPath)
      return { apkPath }
    } catch (error) {

    }
  }

  async downloadResource(url, filePath) {
    return new Promise((resolve, reject) => {
      const fileWriteStream = fs.createWriteStream(filePath);
      https.get(url, (response) => {
        // 把二进制数据写入本地文件
        response.pipe(fileWriteStream)
        fileWriteStream.on('finish', () => {
          fileWriteStream.close();
          resolve();
        })

        response.on('error', (error) => {
          console.log(error)
        })
      })
    })
  }

  getFileName(downloadUrl) {
    const urlParts = downloadUrl.split('/');
    return urlParts[urlParts.length - 1];
  }
}

module.exports = FileDownloader;