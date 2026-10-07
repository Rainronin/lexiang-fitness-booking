// 本地日期工具：统一用本地日历日（禁止 toISOString 的 UTC 日期，避免 UTC+8 边界错位）
function localDateStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 分页参数归一化：非法值回落默认，防 500
function normalizePage(page, pageSize) {
  return {
    page: Math.max(1, Number(page) || 1),
    pageSize: Math.min(100, Math.max(1, Number(pageSize) || 10))
  }
}

// 相对今天的偏移日期（负数=过去），本地日历日（R-C2：统一"今天/近 N 天"的判定来源）
function offsetDateStr(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return localDateStr(d)
}

// 字符串字段安全更新：空串/纯空白视为未提供，防止覆盖原值
function cleanStr(v, fallback) {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback
}

module.exports = { localDateStr, offsetDateStr, normalizePage, cleanStr }
