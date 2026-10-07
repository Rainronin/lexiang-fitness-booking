// 预约规则（后台，仅管理员可见）：单行配置
const express = require('express')
const db = require('../db')
const { ok, fail } = require('../utils/response')
const { authSuper } = require('../middleware/auth')

const router = express.Router()

// 公开规则（无需登录）：小程序详情页据此生成可约日期范围（与 advance_days 联动）
router.get('/public', (req, res) => {
  const rules = db.prepare('SELECT * FROM rules WHERE id = 1').get()
  // 兜底：表为空（未执行 seed）时返回默认值，避免 undefined 响应
  ok(res, rules || { id: 1, advance_days: 7, daily_limit: 3 })
})

// 以下接口仅管理员
router.use(authSuper)

// 读取
router.get('/', (req, res) => {
  const rules = db.prepare('SELECT * FROM rules WHERE id = 1').get()
  // 兜底：表为空（未执行 seed）时返回默认值，避免 undefined 响应
  ok(res, rules || { id: 1, advance_days: 7, daily_limit: 3 })
})

// 更新
router.put('/', (req, res) => {
  const { advance_days, daily_limit } = req.body || {}
  if (!Number.isInteger(advance_days) || advance_days < 1 || advance_days > 30) return fail(res, 400, '提前预约天数需为 1~30 的整数')
  if (!Number.isInteger(daily_limit) || daily_limit < 1 || daily_limit > 10) return fail(res, 400, '每日预约上限需为 1~10 的整数')
  // R-M5：检查更新行数，rules 表空（未 seed）时明确报错而非误报成功
  const r = db.prepare('UPDATE rules SET advance_days = ?, daily_limit = ? WHERE id = 1').run(advance_days, daily_limit)
  if (r.changes === 0) return fail(res, 500, '规则配置不存在，请先执行 npm run seed', 500)
  ok(res, null, '规则已更新')
})

module.exports = router
