import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    proxy: {
      // 以/api开头的请求走代理
      '/api': {
        target: 'http://localhost:5000', // 后端地址
        changeOrigin: true
      }
    },
  }
})
