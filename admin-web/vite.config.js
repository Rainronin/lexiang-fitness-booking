import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rolldownOptions: {
      output: {
        // 图表仍按路由懒加载；单独拆出渲染内核，避免一个超大分包
        manualChunks(id) {
          if (id.includes('/node_modules/zrender/')) return 'zrender'
        }
      }
    }
  },
  server: {
    // 4180：原 5180 落入 Windows 端口排除范围（5147-5246，Hyper-V/WSL 保留）致 EACCES，故改用 4180
    port: 4180,
    strictPort: true,
    // 开发环境代理：/api 请求转发到 Express 后端，解决跨域；/uploads 图片同源转发
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
