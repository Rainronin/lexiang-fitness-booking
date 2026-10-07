// 图片 URL 补全：后端返回相对路径 /uploads/xxx，静态资源挂在根路径（非 /api 下）
import { UPLOAD_BASE } from '../config'

export function imgUrl(u) {
  if (!u) return ''
  if (u.startsWith('http')) return u
  return `${UPLOAD_BASE}${u}`
}
