// 预约管理（后台）：列表筛选 + 取消
const express = require('express')
const db = require('../db')
const { ok, fail } = require('../utils/response')
const { authAdmin } = require('../middleware/auth')
const { localDateStr, normalizePage } = require('../utils/date')

const router = express.Router()
router.use(authAdmin)

// 列表：date/course_id/status/keyword 筛选 + 分页
// 展示状态：confirmed 且日期已过 → 显示 completed
router.get('/', (req, res) => {
  const { date = '', course_id = '', status = '', keyword = '' } = req.query
  const { page, pageSize } = normalizePage(req.query.page, req.query.pageSize)
  // "今天"统一用 Node 本地日历日（R-C2：不再混用 SQLite date('now','localtime')）
  const today = localDateStr()
  const cond = []
  const params = []
  if (date) { cond.push('b.booking_date = ?'); params.push(date) }
  if (course_id) { cond.push('s.course_id = ?'); params.push(course_id) }
  if (status) {
    if (status === 'completed') {
      cond.push("b.status = 'confirmed' AND b.booking_date < ?")
      params.push(today)
    } else {
      cond.push('b.status = ?')
      params.push(status)
    }
  }
  if (keyword) {
    cond.push('(m.phone LIKE ? OR m.nickname LIKE ? OR co.name LIKE ?)')
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''
  const total = db.prepare(`
    SELECT COUNT(*) c FROM booking b
    JOIN member m ON m.id = b.member_id
    JOIN schedule s ON s.id = b.schedule_id
    JOIN course co ON co.id = s.course_id
    JOIN coach c ON c.id = s.coach_id
    ${where}
  `).get(...params).c
  const list = db.prepare(`
    SELECT b.id, b.booking_date, b.status, b.created_at,
           CASE WHEN b.status = 'confirmed' AND b.booking_date < ? THEN 'completed' ELSE b.status END AS display_status,
           m.id AS member_id, m.phone, m.nickname,
           s.time_slot, s.capacity,
           co.id AS course_id, co.name AS course_name, co.price,
           c.id AS coach_id, c.name AS coach_name
    FROM booking b
    JOIN member m ON m.id = b.member_id
    JOIN schedule s ON s.id = b.schedule_id
    JOIN course co ON co.id = s.course_id
    JOIN coach c ON c.id = s.coach_id
    ${where} ORDER BY b.booking_date DESC, s.time_slot LIMIT ? OFFSET ?
  `).all(today, ...params, Number(pageSize), (Number(page) - 1) * Number(pageSize))
  ok(res, { list, total, page: Number(page), pageSize: Number(pageSize) })
})

// 后台取消预约（仅 confirmed 且未过期，日期按本地日历日判断）
router.put('/:id/cancel', (req, res) => {
  const booking = db.prepare('SELECT * FROM booking WHERE id = ?').get(req.params.id)
  if (!booking) return fail(res, 404, '预约记录不存在', 404)
  if (booking.status !== 'confirmed') return fail(res, 400, '该预约当前状态不可取消')
  if (booking.booking_date < localDateStr()) return fail(res, 400, '已过期的预约不可取消')
  db.prepare('UPDATE booking SET status = ? WHERE id = ?').run('cancelled', booking.id)
  ok(res, null, '已取消该预约，名额已释放')
})

module.exports = router
