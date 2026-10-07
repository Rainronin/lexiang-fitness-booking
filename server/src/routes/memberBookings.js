// 会员端预约：我的预约列表 / 提交预约（核心事务）/ 取消
const express = require('express')
const db = require('../db')
const { ok, fail } = require('../utils/response')
const { localDateStr } = require('../utils/date')
const { authMember } = require('../middleware/auth')

const router = express.Router()
router.use(authMember)

// 我的预约：tab = upcoming(待上课) | completed(已完成) | cancelled(已取消)，默认全部
router.get('/', (req, res) => {
  const { tab = '' } = req.query
  // "今天"统一用 Node 本地日历日（R-C2：不再混用 SQLite date('now','localtime')）
  const today = localDateStr()
  let displayCond = ''
  const condParams = []
  if (tab === 'upcoming') { displayCond = "AND (b.status = 'confirmed' AND b.booking_date >= ?)"; condParams.push(today) }
  else if (tab === 'completed') { displayCond = "AND (b.status = 'completed' OR (b.status = 'confirmed' AND b.booking_date < ?))"; condParams.push(today) }
  else if (tab === 'cancelled') displayCond = "AND b.status = 'cancelled'"

  const list = db.prepare(`
    SELECT b.id, b.booking_date, b.created_at,
           CASE WHEN b.status = 'confirmed' AND b.booking_date < ? THEN 'completed' ELSE b.status END AS display_status,
           s.time_slot, s.capacity, s.weekday,
           co.id AS course_id, co.name AS course_name, co.cover, co.price, co.duration,
           c.id AS coach_id, c.name AS coach_name, c.title AS coach_title
    FROM booking b
    JOIN schedule s ON s.id = b.schedule_id
    JOIN course co ON co.id = s.course_id
    JOIN coach c ON c.id = s.coach_id
    WHERE b.member_id = ? ${displayCond}
    ORDER BY b.booking_date DESC, s.time_slot
  `).all(today, req.user.id, ...condParams)
  ok(res, list)
})

// 提交预约：事务内校验（排班/课程/会员状态/日期范围/重复/每日上限/名额），防并发超卖
router.post('/', (req, res) => {
  const { schedule_id, booking_date } = req.body || {}
  if (!schedule_id || !/^\d{4}-\d{2}-\d{2}$/.test(booking_date || '')) {
    return fail(res, 400, '参数不完整或日期格式错误')
  }

  // R-M2：rules 表空时兜底默认值（与 rules.js/schedules.js 的兜底口径一致）
  const rules = db.prepare('SELECT * FROM rules WHERE id = 1').get() || { advance_days: 7, daily_limit: 3 }

  // IMMEDIATE 事务（R-I3）：开始时即获取写锁，名额校验与 INSERT 之间不被其他写事务插入，硬性防并发超卖
  const tx = db.transaction(() => {
    const schedule = db.prepare('SELECT * FROM schedule WHERE id = ?').get(schedule_id)
    if (!schedule || schedule.status !== 'active') throw { code: 400, msg: '该时段已不可预约' }

    const course = db.prepare('SELECT * FROM course WHERE id = ?').get(schedule.course_id)
    if (!course || course.status !== 'on') throw { code: 400, msg: '该课程已下架' }

    const coach = db.prepare('SELECT * FROM coach WHERE id = ?').get(schedule.coach_id)
    if (!coach || coach.status !== 'active') throw { code: 400, msg: '授课教练已停用，无法预约' }

    const member = db.prepare('SELECT * FROM member WHERE id = ?').get(req.user.id)
    if (!member || member.status !== 'active') throw { code: 403, msg: '账号已停用，无法预约' }

    const d = new Date(`${booking_date}T00:00:00`)
    // 回验非法日历日（如 2026-02-31 会被 Date 自动 rollover，需拒绝）
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    if (`${y}-${m}-${day}` !== booking_date) throw { code: 400, msg: '日期格式不正确' }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (d < today) throw { code: 400, msg: '只能预约今天及以后的课程' }
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + rules.advance_days)
    if (d > maxDate) throw { code: 400, msg: `最多只能提前 ${rules.advance_days} 天预约` }
    if (d.getDay() !== schedule.weekday) throw { code: 400, msg: '该日期没有此课程排班' }

    // 已过时段校验：只能预约"今天尚未开始"的时段（如 22:00 不可约今天 15:00-16:00）
    const slotStart = new Date(`${booking_date}T${schedule.time_slot.split('-')[0]}:00`)
    if (slotStart.getTime() <= Date.now()) throw { code: 400, msg: '该时段已过，无法预约' }

    // 重复预约校验：仅排除"有效预约"（已取消的记录不阻塞重新预约）
    const dup = db.prepare("SELECT id FROM booking WHERE member_id = ? AND schedule_id = ? AND booking_date = ? AND status != 'cancelled'")
      .get(member.id, schedule_id, booking_date)
    if (dup) throw { code: 409, msg: '你已预约过这节课，请勿重复预约' }

    const daily = db.prepare("SELECT COUNT(*) c FROM booking WHERE member_id = ? AND booking_date = ? AND status = 'confirmed'")
      .get(member.id, booking_date).c
    if (daily >= rules.daily_limit) throw { code: 409, msg: `每天最多预约 ${rules.daily_limit} 节课` }

    const booked = db.prepare("SELECT COUNT(*) c FROM booking WHERE schedule_id = ? AND booking_date = ? AND status = 'confirmed'")
      .get(schedule_id, booking_date).c
    if (booked >= schedule.capacity) throw { code: 409, msg: '该时段名额已满，试试其他时段吧' }

    const id = db.prepare('INSERT INTO booking (member_id, schedule_id, booking_date, status, created_at) VALUES (?,?,?,?,?)')
      .run(member.id, schedule_id, booking_date, 'confirmed', new Date().toISOString()).lastInsertRowid
    return id
  }).immediate

  try {
    const id = tx()
    ok(res, { id }, '预约成功')
  } catch (e) {
    if (e && e.msg) return fail(res, e.code || 400, e.msg)
    if (e && e.code === 'SQLITE_CONSTRAINT_UNIQUE') return fail(res, 409, '你已预约过这节课，请勿重复预约')
    throw e
  }
})

// 会员取消预约：仅本人、confirmed、距开课 > 2 小时（恰好 2 小时整也视为不可取消）
router.put('/:id/cancel', (req, res) => {
  const booking = db.prepare('SELECT * FROM booking WHERE id = ? AND member_id = ?').get(req.params.id, req.user.id)
  if (!booking) return fail(res, 404, '预约记录不存在', 404)
  if (booking.status !== 'confirmed') return fail(res, 400, '当前状态不可取消')
  // 停用会员的敏感操作复查（旧 token 在 7 天有效期内仍会到达这里）
  const member = db.prepare('SELECT status FROM member WHERE id = ?').get(req.user.id)
  if (!member || member.status !== 'active') return fail(res, 403, '账号已停用，请联系场馆', 403)

  const schedule = db.prepare('SELECT * FROM schedule WHERE id = ?').get(booking.schedule_id)
  // R-I4：排班可能已被删除（历史 confirmed 预约的排班删除保护只覆盖未来预约），空值守卫避免 500
  if (!schedule) return fail(res, 400, '该排班已删除，无法操作')
  const startTime = new Date(`${booking.booking_date}T${schedule.time_slot.split('-')[0]}:00`)
  if (startTime - Date.now() <= 2 * 3600 * 1000) {
    return fail(res, 400, '距开课不足 2 小时，无法取消预约')
  }
  db.prepare("UPDATE booking SET status = 'cancelled' WHERE id = ?").run(booking.id)
  ok(res, null, '已取消预约')
})

module.exports = router
