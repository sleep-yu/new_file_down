import { useState } from 'react'
import './App.css'
import SparkMD5 from 'spark-md5'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState(null);
  const chunkSize = 5 * 1024 * 1024 // 5MB

  // 处理文件选择
  const handleFile = (file) => {
    if (!file) return
    setSelectedFile(file)
    setUploadProgress(0)
    setResult(null)
  }

  // 计算文件 Hash
  const calculateHash = (file) => {
    return new Promise((resolve, reject) => {
      const spark = new SparkMD5.ArrayBuffer()
      const fileReader = new FileReader()
      // 根据当前文件，每5M进行拆分，看分成多少个chunk
      const totalChunks = Math.ceil(file.size / chunkSize);
      let currentChunk = 0

      // 这个函数会在 readAsArrayBuffer 时触发
      fileReader.onload = (e) => {
        // 拿到这个区间的分片数据存储
        spark.append(e.target.result)
        currentChunk++
        if (currentChunk < totalChunks) {
          loadNext()
        } else {
          // 结束当前md5计算，并输出最终hash
          const hash = spark.end()
          resolve(hash)
        }
      }

      fileReader.onerror = () => {
        reject(new Error('Hash 计算失败'))
      }

      function loadNext() {
        const start = currentChunk * chunkSize
        const end = Math.min(start + chunkSize, file.size)
        fileReader.readAsArrayBuffer(file.slice(start, end))
      }

      loadNext()
    })
  }

  // 查询上传状态
  const getUploadStatus = async (fileHash) => {
    try {
      const response = await fetch(`http://localhost:3000/upload-status?fileHash=${fileHash}`)
      if (!response.ok) {
        throw new Error('查询状态失败')
      }
      const data = await response.json();
      console.log('上传状态：', data);
      return data;
    } catch (error) {
      console.error('查询状态错误：', error)
      throw error;
    }
  }

  // 设置并发池
  const runPool = async (tasks, limit = 4) => {
    let index = 0;

    const runOneWorker = async () => {
      while (index < tasks.length) {
        const currentTask = tasks[index];
        index++;
        await currentTask()
      }
    }

    const workers = []
    for (let i = 0; i < limit; i++) {
      workers.push(runOneWorker());
    }
    await Promise.all(workers);
  }

  // 失败自动重试
  const retryFetch = async (formData, times = 3) => {
    for (let i = 0; i < times; i++) {
      try {
        const res = await fetch("http://localhost:3000/upload-chunk", {
          method: "POST",
          body: formData
        });
        if (!res.ok) throw new Error("upload fail");
        return await res.json();
      } catch (error) {
        // 已经失败三次
        if (i === times - 1) throw error;
      }
    }
  }

  const uploadChunks = async (fileHash, status) => {
    const totalChunks = Math.ceil(selectedFile.size / chunkSize);
    const uploadedChunks = new Set(status.uploadedChunks || []);
    let uploadedCount = uploadedChunks.size; // 计数器
    setUploadProgress(Math.round((uploadedCount / totalChunks) * 100));

    const tasks = [];

    for (let i = 0; i < totalChunks; i++) {
      if (uploadedChunks.has(i)) continue;
      tasks.push(async () => {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, selectedFile.size);
        const chunk = selectedFile.slice(start, end);
        const formData = new FormData();
        formData.append('chunk', chunk, selectedFile.name);
        formData.append('fileHash', fileHash);
        formData.append('chunkIndex', String(i));
        formData.append('totalChunks', String(totalChunks));
        formData.append('fileName', selectedFile.name);
        formData.append('fileSize', String(selectedFile.size));
        await retryFetch(formData)
        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalChunks) * 100));
      })
    }
    // 设置最大并发4
    await runPool(tasks, 4)
  }


  const mergeChunks = async (fileHash) => {
    const response = await fetch('http://localhost:3000/merge-chunks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileHash,
        fileName: selectedFile.name
      })
    })
    const data = await response.json();
    console.log(data, 'merge')
  }

  // 开始上传
  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(0)
    setResult({ type: 'info', message: '正在计算文件 Hash...' })

    try {
      // 步骤1：计算 Hash
      const hash = await calculateHash(selectedFile)
      setResult({ type: 'info', message: `Hash: ${hash.substring(0, 16)}...，正在查询上传状态...` })

      // TODO: 步骤2：查询后端上传状态
      const status = await getUploadStatus(hash)

      // TODO: 步骤3：上传分片
      await uploadChunks(hash, status)

      // TODO: 步骤4：合并分片
      await mergeChunks(hash)

      // 暂时模拟完成
      setResult({ type: 'success', message: '上传成功' })

    } catch (error) {
      setResult({ type: 'error', message: error.message })
    } finally {
      setIsUploading(false)
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="container">
      <h1>文件上传（分片上传）</h1>

      {/* 上传区域 */}
      <div
        className="upload-area"
        onClick={() => document.getElementById('fileInput').click()}
        onDragOver={(e) => {
          e.preventDefault()
          e.currentTarget.classList.add('dragover')
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('dragover')
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.currentTarget.classList.remove('dragover')
          handleFile(e.dataTransfer.files[0])
        }}
      >
        <div className="icon">📁</div>
        <p>点击选择文件或拖拽文件到这里</p>
        <p className="hint">支持任意类型文件</p>
      </div>

      <input
        id="fileInput"
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {/* 文件信息 */}
      {selectedFile && (
        <div className="file-info">
          <div className="name">{selectedFile.name}</div>
          <div className="size">{formatFileSize(selectedFile.size)}</div>
        </div>
      )}

      {/* 上传进度 */}
      {uploadProgress > 0 && (
        <div className="progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
          </div>
          <div className="progress-text">{uploadProgress}%</div>
        </div>
      )}

      {/* 结果提示 */}
      {result && (
        <div className={`result ${result.type}`}>
          {result.message}
        </div>
      )}

      {/* 上传按钮 */}
      {selectedFile && (
        <button className="btn" onClick={handleUpload} disabled={isUploading}>
          {isUploading ? '上传中...' : '上传文件'}
        </button>
      )}
    </div>
  )
}

export default App
