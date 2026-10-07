// 格式化工具
export const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function formatDateTime(str) {
  if (!str) return '-'
  const d = new Date(str)
  if (Number.isNaN(d.getTime())) return String(str).replace('T', ' ').slice(0, 16)
  // 后端存的是 UTC ISO 串，需转本地时区展示（否则差 8 小时）
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function formatPrice(v) {
  return `¥${Number(v || 0).toFixed(0)}`
}

export function weekdayName(n) {
  return WEEKDAYS[Number(n)] || '-'
}

// 本地日历日（禁止 toISOString 的 UTC 日期，避免 UTC+8 边界错位）
export function localDateStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function localMonthPrefix() {
  return localDateStr().slice(0, 7)
}
