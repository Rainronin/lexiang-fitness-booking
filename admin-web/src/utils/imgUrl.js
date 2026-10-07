// 图片 URL 补全：后端返回相对路径 /uploads/xxx，默认同源（经 Vite proxy /uploads 转发）
// 生产部署时可设置环境变量 VITE_UPLOAD_BASE 指向独立静态资源域名
const UPLOAD_BASE = import.meta.env.VITE_UPLOAD_BASE || ''

export function imgUrl(u) {
  if (!u) return ''
  return u.startsWith('http') ? u : `${UPLOAD_BASE}${u}`
}
