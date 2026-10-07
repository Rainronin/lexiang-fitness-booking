// 本地日期工具：统一本地日历日（禁止 toISOString 的 UTC 日期）
export function localDateStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 解析 YYYY-MM-DD 为本地日期（MP-M4：避免 new Date('YYYY-MM-DD') 按 UTC 解析，极端时区下 getDay 跨天错一天）
export function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}
