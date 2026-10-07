// 课程管理：列表公开（默认仅上架），写操作需后台登录
const express = require('express')
const db = require('../db')
const { ok, fail } = require('../utils/response')
const { authAdmin } = require('../middleware/auth')
const { normalizePage, cleanStr, offsetDateStr } = require('../utils/date')

const router = express.Router()

// 列表：category_id/keyword/status 筛选 + 分页（status: on|off|all，默认 on）
router.get('/', (req, res) => {
  const { category_id = '', keyword = '', status = 'on' } = req.query
  const { page, pageSize } = normalizePage(req.query.page, req.query.pageSize)
  const cond = []
  const params = []
  if (category_id) {
    cond.push('co.category_id = ?')
    params.push(category_id)
  }
  if (keyword) {
    cond.push('co.name LIKE ?')
    params.push(`%${keyword}%`)
  }
  if (status && status !== 'all') {
    cond.push('co.status = ?')
    params.push(status)
  }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''
  const total = db.prepare(`SELECT COUNT(*) c FROM course co ${where}`).get(...params).c
  const list = db.prepare(`
    SELECT co.*, ca.name AS category_name, c.coach_name
    FROM course co
    LEFT JOIN category ca ON ca.id = co.category_id
    LEFT JOIN (
      SELECT s.course_id, GROUP_CONCAT(DISTINCT c.name) AS coach_name
      FROM schedule s JOIN coach c ON c.id = s.coach_id
      GROUP BY s.course_id
    ) c ON c.course_id = co.id
    ${where} ORDER BY co.id DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), (Number(page) - 1) * Number(pageSize))
  ok(res, { list, total, page: Number(page), pageSize: Number(pageSize) })
})

// 热门推荐（公开）：近 30 天预约数 TOP3 的上架课程，小程序首页使用
router.get('/hot/list', (req, res) => {
  const list = db.prepare(`
    SELECT co.id, co.name, co.cover, co.price, co.duration, co.intro,
           ca.name AS category_name, COUNT(*) AS booking_count
    FROM booking b
    JOIN schedule s ON s.id = b.schedule_id
    JOIN course co ON co.id = s.course_id
    JOIN category ca ON ca.id = co.category_id
    WHERE b.status = 'confirmed' AND b.booking_date >= ? AND co.status = 'on'
    GROUP BY co.id ORDER BY booking_count DESC LIMIT 3
  `).all(offsetDateStr(-30))
  ok(res, list)
})

// 详情：课程 + 分类 + 关联排班（小程序端据此查可约时段）
router.get('/:id', (req, res) => {
  const course = db.prepare(`
    SELECT co.*, ca.name AS category_name
    FROM course co LEFT JOIN category ca ON ca.id = co.category_id
    WHERE co.id = ?
  `).get(req.params.id)
  if (!course) return fail(res, 404, '课程不存在', 404)
  const schedules = db.prepare(`
    SELECT s.id, s.weekday, s.time_slot, s.capacity, s.status AS schedule_status,
           c.id AS coach_id, c.name AS coach_name, c.title AS coach_title, c.avatar AS coach_avatar
    FROM schedule s JOIN coach c ON c.id = s.coach_id
    WHERE s.course_id = ? AND s.status = 'active' ORDER BY s.weekday, s.time_slot
  `).all(course.id)
  ok(res, { ...course, schedules })
})

// 新增
router.post('/', authAdmin, (req, res) => {
  const { category_id, name, price, duration = 60, intro, cover } = req.body || {}
  if (!category_id || !name || price == null) return fail(res, 400, '请填写课程分类、名称和价格')
  if (!Number.isFinite(Number(price)) || Number(price) <= 0) return fail(res, 400, '价格需为大于 0 的数字')
  if (!Number.isInteger(Number(duration)) || Number(duration) <= 0) return fail(res, 400, '时长需为大于 0 的整数')
  if (!db.prepare('SELECT id FROM category WHERE id = ?').get(category_id)) return fail(res, 400, '课程分类不存在')
  const id = db.prepare('INSERT INTO course (category_id, name, cover, price, duration, intro, status, created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(category_id, name, cover || null, Number(price), Number(duration), intro || null, 'on', new Date().toISOString()).lastInsertRowid
  ok(res, { id }, '新增成功')
})

// 编辑
router.put('/:id', authAdmin, (req, res) => {
  const course = db.prepare('SELECT * FROM course WHERE id = ?').get(req.params.id)
  if (!course) return fail(res, 404, '课程不存在', 404)
  const { category_id, name, price, duration, intro, cover } = req.body || {}
  if (category_id && !db.prepare('SELECT id FROM category WHERE id = ?').get(category_id)) return fail(res, 400, '课程分类不存在')
  if (price !== undefined && (!Number.isFinite(Number(price)) || Number(price) <= 0)) return fail(res, 400, '价格需为大于 0 的数字')
  if (duration !== undefined && (!Number.isInteger(Number(duration)) || Number(duration) <= 0)) return fail(res, 400, '时长需为大于 0 的整数')
  db.prepare('UPDATE course SET category_id = ?, name = ?, price = ?, duration = ?, intro = ?, cover = ? WHERE id = ?')
    .run(category_id ?? course.category_id, cleanStr(name, course.name), price ?? course.price, duration ?? course.duration,
      cleanStr(intro, course.intro), cover !== undefined ? cover : course.cover, course.id)
  ok(res, null, '保存成功')
})

// 上架/下架
router.put('/:id/status', authAdmin, (req, res) => {
  const { status } = req.body || {}
  if (!['on', 'off'].includes(status)) return fail(res, 400, '状态参数不正确')
  const r = db.prepare('UPDATE course SET status = ? WHERE id = ?').run(status, req.params.id)
  if (r.changes === 0) return fail(res, 404, '课程不存在', 404)
  ok(res, null, status === 'on' ? '已上架' : '已下架')
})

// 删除（有排班时禁止）
router.delete('/:id', authAdmin, (req, res) => {
  const course = db.prepare('SELECT * FROM course WHERE id = ?').get(req.params.id)
  if (!course) return fail(res, 404, '课程不存在', 404)
  const n = db.prepare('SELECT COUNT(*) c FROM schedule WHERE course_id = ?').get(course.id).c
  if (n > 0) return fail(res, 409, `该课程已有 ${n} 个排班，无法删除`)
  db.prepare('DELETE FROM course WHERE id = ?').run(course.id)
  ok(res, null, '删除成功')
})

module.exports = router
