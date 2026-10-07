// 教练管理：列表公开（仅 active），写操作与排班设置需后台登录
const express = require('express')
const db = require('../db')
const { ok, fail } = require('../utils/response')
const { authAdmin } = require('../middleware/auth')
const { TIME_SLOTS } = require('../utils/constants')
const { normalizePage, cleanStr, localDateStr } = require('../utils/date')

const router = express.Router()

// 列表：后台 ?all=1 返回全部（分页）；公开默认仅 active（返回数组）
router.get('/', (req, res) => {
  const all = req.query.all === '1'
  if (all) {
    const { page, pageSize } = normalizePage(req.query.page, req.query.pageSize)
    const total = db.prepare('SELECT COUNT(*) c FROM coach').get().c
    const list = db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM schedule s WHERE s.coach_id = c.id AND s.status = 'active') AS schedule_count
      FROM coach c ORDER BY c.id LIMIT ? OFFSET ?
    `).all(pageSize, (page - 1) * pageSize)
    return ok(res, { list, total, page, pageSize })
  }
  const list = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM schedule s WHERE s.coach_id = c.id AND s.status = 'active') AS schedule_count
    FROM coach c WHERE c.status = 'active' ORDER BY c.id
  `).all()
  ok(res, list)
})

// 新增
router.post('/', authAdmin, (req, res) => {
  const { name, title, intro, avatar } = req.body || {}
  if (!name) return fail(res, 400, '请输入教练姓名')
  const id = db.prepare('INSERT INTO coach (name, avatar, title, intro, status, created_at) VALUES (?,?,?,?,?,?)')
    .run(name, avatar || null, title || null, intro || null, 'active', new Date().toISOString()).lastInsertRowid
  ok(res, { id }, '新增成功')
})

// 编辑
router.put('/:id', authAdmin, (req, res) => {
  const coach = db.prepare('SELECT * FROM coach WHERE id = ?').get(req.params.id)
  if (!coach) return fail(res, 404, '教练不存在', 404)
  const { name, title, intro, avatar, status } = req.body || {}
  // status 校验（R-I1）：非法值（含空串）拦截为 400，避免触发 DB CHECK 约束变 500
  if (status != null && status !== '' && !['active', 'inactive'].includes(status)) return fail(res, 400, '状态参数不正确')
  db.prepare('UPDATE coach SET name = ?, title = ?, intro = ?, avatar = ?, status = ? WHERE id = ?')
    .run(cleanStr(name, coach.name), cleanStr(title, coach.title), cleanStr(intro, coach.intro),
      avatar !== undefined ? avatar : coach.avatar, status || coach.status, coach.id)
  ok(res, null, '保存成功')
})

// 删除（有排班时禁止）
router.delete('/:id', authAdmin, (req, res) => {
  const coach = db.prepare('SELECT * FROM coach WHERE id = ?').get(req.params.id)
  if (!coach) return fail(res, 404, '教练不存在', 404)
  const n = db.prepare('SELECT COUNT(*) c FROM schedule WHERE coach_id = ?').get(coach.id).c
  if (n > 0) return fail(res, 409, `该教练还有 ${n} 个排班，无法删除`)
  db.prepare('DELETE FROM coach WHERE id = ?').run(coach.id)
  ok(res, null, '删除成功')
})

// 获取某教练每周排班（含课程信息与未来预约数）
router.get('/:id/schedule', authAdmin, (req, res) => {
  const coach = db.prepare('SELECT * FROM coach WHERE id = ?').get(req.params.id)
  if (!coach) return fail(res, 404, '教练不存在', 404)
  const list = db.prepare(`
    SELECT s.id, s.weekday, s.time_slot, s.capacity, s.status,
           co.id AS course_id, co.name AS course_name, co.price
    FROM schedule s JOIN course co ON co.id = s.course_id
    WHERE s.coach_id = ? ORDER BY s.weekday, s.time_slot
  `).all(coach.id)
  ok(res, { coach: { id: coach.id, name: coach.name }, list })
})

// 保存每周排班（全量覆盖）：新增 + 更新 + 删除，含冲突与已预约保护
router.put('/:id/schedule', authAdmin, (req, res) => {
  const coach = db.prepare('SELECT * FROM coach WHERE id = ?').get(req.params.id)
  if (!coach) return fail(res, 404, '教练不存在', 404)
  const items = Array.isArray(req.body?.schedules) ? req.body.schedules : []
  if (items.length > 7 * TIME_SLOTS.length) return fail(res, 400, '排班数量超出限制')

  for (const it of items) {
    if (!Number.isInteger(it.weekday) || it.weekday < 0 || it.weekday > 6) return fail(res, 400, 'weekday 不合法')
    if (!TIME_SLOTS.includes(it.time_slot)) return fail(res, 400, `时段不合法: ${it.time_slot}`)
    const relCourse = db.prepare('SELECT id, status FROM course WHERE id = ?').get(it.course_id)
    if (!relCourse) return fail(res, 400, `课程不存在: ${it.course_id}`)
    // R-I5：禁止给下架课程安排排班（与 member-schedules 的过滤口径一致）
    if (relCourse.status !== 'on') return fail(res, 400, `课程已下架，不能安排排班: ${it.course_id}`)
    if (!Number.isInteger(it.capacity) || it.capacity < 1 || it.capacity > 100) return fail(res, 400, '容量需为 1~100 的整数')
  }
  // 新列表内同教练同时段去重校验
  const seen = new Set()
  for (const it of items) {
    const key = `${it.weekday}-${it.time_slot}`
    if (seen.has(key)) return fail(res, 409, `同一时段重复排班: 周${it.weekday} ${it.time_slot}`)
    seen.add(key)
  }

  const oldList = db.prepare('SELECT * FROM schedule WHERE coach_id = ?').all(coach.id)
  const newMap = new Map(items.map(it => [`${it.weekday}-${it.time_slot}`, it]))

  const today = localDateStr()
  const futureBookingCount = db.prepare("SELECT COUNT(*) c FROM booking WHERE schedule_id = ? AND status = 'confirmed' AND booking_date >= ?")
  // IMMEDIATE 事务（R-I3）：开始时即获取写锁，校验与写入之间不被其他写事务插入
  const tx = db.transaction(() => {
    for (const old of oldList) {
      const key = `${old.weekday}-${old.time_slot}`
      const next = newMap.get(key)
      if (!next) {
        // 删除：有未来 confirmed 预约时保护（throw 使事务整体回滚，避免部分提交）
        const n = futureBookingCount.get(old.id, today).c
        if (n > 0) throw { code: 409, msg: `周${old.weekday} ${old.time_slot} 已有 ${n} 条预约，无法删除，请先处理预约` }
        db.prepare('DELETE FROM schedule WHERE id = ?').run(old.id)
      } else if (next.course_id !== old.course_id || next.capacity !== old.capacity) {
        // 变更：同样保护
        const n = futureBookingCount.get(old.id, today).c
        if (n > 0) throw { code: 409, msg: `周${old.weekday} ${old.time_slot} 已有 ${n} 条预约，无法修改，请先处理预约` }
        db.prepare('UPDATE schedule SET course_id = ?, capacity = ? WHERE id = ?').run(next.course_id, next.capacity, old.id)
      }
      newMap.delete(key)
    }
    // 新增剩余排班
    const insert = db.prepare('INSERT INTO schedule (coach_id, course_id, weekday, time_slot, capacity, status) VALUES (?,?,?,?,?,?)')
    for (const it of newMap.values()) {
      insert.run(coach.id, it.course_id, it.weekday, it.time_slot, it.capacity, 'active')
    }
    return null
  }).immediate

  try {
    tx()
  } catch (e) {
    if (e && e.msg) return fail(res, e.code || 409, e.msg)
    throw e
  }
  const final = db.prepare('SELECT s.id, s.weekday, s.time_slot, s.capacity, co.name AS course_name FROM schedule s JOIN course co ON co.id = s.course_id WHERE s.coach_id = ? ORDER BY s.weekday, s.time_slot').all(coach.id)
  ok(res, { list: final }, '排班已保存')
})

module.exports = router
