import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
  ],
  server: {
    // 4174：原 5174 落入 Windows 端口排除范围（5147-5246，Hyper-V/WSL 保留）致 EACCES，故改用 4174
    port: 4174,
    strictPort: true
  }
})
