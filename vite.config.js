import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 6457,
    strictPort: true,
    allowedHosts: ['haruhitest.vip.cpolar.cn'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:15454',
        changeOrigin: true
      }
    }
  }
})
