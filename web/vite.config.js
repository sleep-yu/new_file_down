import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // 以/api开头的请求走代理
      '/api': {
        target: 'http://localhost:5000', // 后端地址
        changeOrigin: true
      }
    }
  }
})
