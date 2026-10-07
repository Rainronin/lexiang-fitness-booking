// 会员管理（后台）：列表/新增/编辑/状态
const express = require('express')
const db = require('../db')
const { ok, fail } = require('../utils/response')
const { authAdmin } = require('../middleware/auth')
const { normalizePage, cleanStr } = require('../utils/date')

const router = express.Router()
router.use(authAdmin)

// 列表：keyword(手机号/昵称) + status 筛选 + 分页（参数归一化防非法值 500）
router.get('/', (req, res) => {
  const { keyword = '', status = '' } = req.query
  const { page, pageSize } = normalizePage(req.query.page, req.query.pageSize)
  const cond = []
  const params = []
  if (keyword) {
    cond.push('(m.phone LIKE ? OR m.nickname LIKE ?)')
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  if (status) {
    cond.push('m.status = ?')
    params.push(status)
  }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''
  const total = db.prepare(`SELECT COUNT(*) c FROM member m ${where}`).get(...params).c
  const list = db.prepare(`
    SELECT m.id, m.phone, m.nickname, m.avatar, m.gender, m.status, m.created_at,
           (SELECT COUNT(*) FROM booking b WHERE b.member_id = m.id AND b.status = 'confirmed') AS booking_count
    FROM member m ${where}
    ORDER BY m.id DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), (Number(page) - 1) * Number(pageSize))
  ok(res, { list, total, page: Number(page), pageSize: Number(pageSize) })
})

// 新增
router.post('/', (req, res) => {
  const { phone, nickname, gender } = req.body || {}
  if (!/^1\d{10}$/.test(phone || '')) return fail(res, 400, '手机号格式不正确')
  if (gender != null && gender !== '' && !['male', 'female'].includes(gender)) return fail(res, 400, '性别参数不正确')
  if (db.prepare('SELECT id FROM member WHERE phone = ?').get(phone)) return fail(res, 409, '该手机号已注册')
  const id = db.prepare('INSERT INTO member (phone, nickname, gender, status, created_at) VALUES (?,?,?,?,?)')
    .run(phone, nickname || `会员${phone.slice(-4)}`, gender || null, 'active', new Date().toISOString()).lastInsertRowid
  ok(res, { id }, '新增成功')
})

// 编辑（支持修改手机号：带格式与唯一性校验）
router.put('/:id', (req, res) => {
  const member = db.prepare('SELECT * FROM member WHERE id = ?').get(req.params.id)
  if (!member) return fail(res, 404, '会员不存在', 404)
  const { nickname, gender, phone } = req.body || {}
  // R-I2：显式拒绝非空非法值（空串会绕过 falsy 判断，且 ?? 只拦 null/undefined，导致 '' 入库触发 CHECK 500）
  if (gender != null && gender !== '' && !['male', 'female'].includes(gender)) return fail(res, 400, '性别参数不正确')
  if (phone && phone !== member.phone) {
    if (!/^1\d{10}$/.test(phone)) return fail(res, 400, '手机号格式不正确')
    if (db.prepare('SELECT id FROM member WHERE phone = ? AND id != ?').get(phone, member.id)) return fail(res, 409, '该手机号已注册')
  }
  db.prepare('UPDATE member SET nickname = ?, gender = ?, phone = ? WHERE id = ?')
    .run(cleanStr(nickname, member.nickname), gender || member.gender, cleanStr(phone, member.phone), member.id)
  ok(res, null, '保存成功')
})

// 状态切换（启用/停用）
router.put('/:id/status', (req, res) => {
  const { status } = req.body || {}
  if (!['active', 'disabled'].includes(status)) return fail(res, 400, '状态参数不正确')
  const r = db.prepare('UPDATE member SET status = ? WHERE id = ?').run(status, req.params.id)
  if (r.changes === 0) return fail(res, 404, '会员不存在', 404)
  ok(res, null, status === 'active' ? '已启用' : '已停用（该会员不可再预约）')
})

module.exports = router
