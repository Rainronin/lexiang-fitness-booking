// 排班查询：后台通用列表 + 会员端"课程可约时段"（含剩余名额）
const express = require('express')
const db = require('../db')
const { ok, fail } = require('../utils/response')
const { authAdmin } = require('../middleware/auth')
const { localDateStr } = require('../utils/date')

const router = express.Router()

// 后台排班列表（筛选）
router.get('/', authAdmin, (req, res) => {
  const { weekday = '', course_id = '', coach_id = '' } = req.query
  const cond = []
  const params = []
  if (weekday !== '') { cond.push('s.weekday = ?'); params.push(Number(weekday)) }
  if (course_id) { cond.push('s.course_id = ?'); params.push(course_id) }
  if (coach_id) { cond.push('s.coach_id = ?'); params.push(coach_id) }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''
  const list = db.prepare(`
    SELECT s.*, co.name AS course_name, c.name AS coach_name
    FROM schedule s JOIN course co ON co.id = s.course_id JOIN coach c ON c.id = s.coach_id
    ${where} ORDER BY s.weekday, s.time_slot
  `).all(...params)
  ok(res, list)
})

// 会员端：某课程在未来日期范围内的可约时段（每排班每日实例 + 剩余名额）
// 参数: course_id, start(YYYY-MM-DD), end(YYYY-MM-DD)，范围 ≤ 31 天
// 规则：① 范围自动截断到"今天 + advance_days"（防前端请求超出规则范围）；
//       ② 今天的已过时段直接过滤（不可预约当天已结束的课）
router.get('/member-schedules', (req, res) => {
  const { course_id, start, end } = req.query
  if (!course_id) return fail(res, 400, '缺少 course_id')
  if (!start || !end) return fail(res, 400, '缺少日期范围')
  // R-M3：日期格式校验 + 非法日历日回验（如 2026-02-31），非法值返回 400 而非静默空数组
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  const isValidDate = (s) => {
    if (!DATE_RE.test(s)) return false
    const d = new Date(`${s}T00:00:00`)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === s
  }
  if (!isValidDate(start) || !isValidDate(end)) return fail(res, 400, '日期格式不正确')
  const daySpan = (new Date(end) - new Date(start)) / 86400000
  if (daySpan < 0 || daySpan > 31) return fail(res, 400, '日期范围需在 0~31 天内')

  // 预约规则截断：最多展示到"今天 + advance_days"
  const rules = db.prepare('SELECT * FROM rules WHERE id = 1').get()
  const advanceDays = rules?.advance_days ?? 7
  const todayStart = new Date(`${localDateStr()}T00:00:00`)
  const ruleMax = new Date(todayStart)
  ruleMax.setDate(ruleMax.getDate() + advanceDays)
  const effectiveEnd = new Date(Math.min(new Date(`${end}T00:00:00`).getTime(), ruleMax.getTime()))
  const now = Date.now()

  const schedules = db.prepare(`
    SELECT s.id, s.weekday, s.time_slot, s.capacity,
           c.id AS coach_id, c.name AS coach_name, c.title AS coach_title
    FROM schedule s
    JOIN coach c ON c.id = s.coach_id
    JOIN course co ON co.id = s.course_id
    WHERE s.course_id = ? AND s.status = 'active' AND c.status = 'active' AND co.status = 'on'
    ORDER BY s.weekday, s.time_slot
  `).all(course_id)
  if (schedules.length === 0) return ok(res, [])

  const result = []
  const countStmt = db.prepare("SELECT COUNT(*) c FROM booking WHERE schedule_id = ? AND booking_date = ? AND status = 'confirmed'")
  const cur = new Date(`${start}T00:00:00`)
  while (cur <= effectiveEnd) {
    const dateStr = localDateStr(cur)
    const weekday = cur.getDay()
    const isToday = dateStr === localDateStr()
    for (const s of schedules) {
      if (s.weekday !== weekday) continue
      // 今天的已过时段过滤
      if (isToday) {
        const slotStart = new Date(`${dateStr}T${s.time_slot.split('-')[0]}:00`).getTime()
        if (slotStart <= now) continue
      }
      const booked = countStmt.get(s.id, dateStr).c
      result.push({
        schedule_id: s.id,
        date: dateStr,
        weekday,
        time_slot: s.time_slot,
        capacity: s.capacity,
        booked,
        remain: Math.max(0, s.capacity - booked)
      })
    }
    cur.setDate(cur.getDate() + 1)
  }
  ok(res, result)
})

module.exports = router
