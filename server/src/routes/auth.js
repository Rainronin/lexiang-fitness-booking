// 认证接口：后台登录、会员验证码登录、当前用户
const express = require('express')
const bcrypt = require('bcryptjs')
const db = require('../db')
const { ok, fail } = require('../utils/response')
const { sign } = require('../utils/jwt')
const { auth } = require('../middleware/auth')

const router = express.Router()

const MOCK_CODE = '123456' // 模拟短信验证码（固定）

// 后台账号密码登录
router.post('/admin/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return fail(res, 400, '请输入账号和密码')
  const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username)
  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return fail(res, 401, '账号或密码错误', 401)
  }
  const token = sign({ id: admin.id, type: 'admin', role: admin.role })
  ok(res, { token, user: { id: admin.id, username: admin.username, name: admin.name, role: admin.role } })
})

// 发送验证码（模拟：固定 123456）
router.post('/member/send-code', (req, res) => {
  const { phone } = req.body || {}
  if (!/^1\d{10}$/.test(phone || '')) return fail(res, 400, '手机号格式不正确')
  ok(res, { mockCode: MOCK_CODE }, `验证码已发送（模拟：${MOCK_CODE}）`)
})

// 会员手机号 + 验证码登录（未注册自动注册）
router.post('/member/login', (req, res) => {
  const { phone, code } = req.body || {}
  if (!/^1\d{10}$/.test(phone || '')) return fail(res, 400, '手机号格式不正确')
  if (code !== MOCK_CODE) return fail(res, 400, '验证码错误（模拟验证码：123456）')

  let member = db.prepare('SELECT * FROM member WHERE phone = ?').get(phone)
  if (!member) {
    const now = new Date().toISOString()
    const id = db.prepare('INSERT INTO member (phone, nickname, status, created_at) VALUES (?,?,?,?)')
      .run(phone, `会员${phone.slice(-4)}`, 'active', now).lastInsertRowid
    member = db.prepare('SELECT * FROM member WHERE id = ?').get(id)
  }
  if (member.status === 'disabled') return fail(res, 403, '该账号已被停用，请联系场馆', 403)

  const token = sign({ id: member.id, type: 'member' })
  ok(res, { token, user: { id: member.id, phone: member.phone, nickname: member.nickname, avatar: member.avatar, gender: member.gender } })
})

// 当前登录用户（后台 / 会员按 type 分发）
router.get('/me', auth, (req, res) => {
  if (req.user.type === 'admin') {
    const admin = db.prepare('SELECT id, username, name, role FROM admin WHERE id = ?').get(req.user.id)
    if (!admin) return fail(res, 401, '账号不存在', 401)
    return ok(res, { type: 'admin', ...admin })
  }
  const member = db.prepare('SELECT id, phone, nickname, avatar, gender FROM member WHERE id = ?').get(req.user.id)
  if (!member) return fail(res, 401, '账号不存在', 401)
  ok(res, { type: 'member', ...member })
})

module.exports = router
