// 会员签到：每日一次（UNIQUE 约束），记录近 30 天
const express = require('express')
const db = require('../db')
const { ok, fail } = require('../utils/response')
const { authMember } = require('../middleware/auth')
const { localDateStr, offsetDateStr } = require('../utils/date')

const router = express.Router()
router.use(authMember)

// 签到
router.post('/', (req, res) => {
  const today = localDateStr()
  const r = db.prepare('INSERT OR IGNORE INTO signin (member_id, sign_date) VALUES (?,?)').run(req.user.id, today)
  if (r.changes === 0) return ok(res, { signed: true, sign_date: today }, '今天已经签到过啦')
  ok(res, { signed: true, sign_date: today }, '签到成功')
})

// 签到记录（近 30 天，R-C2：日期边界统一 Node 本地日历日）
router.get('/', (req, res) => {
  const list = db.prepare('SELECT sign_date FROM signin WHERE member_id = ? AND sign_date >= ? ORDER BY sign_date DESC')
    .all(req.user.id, offsetDateStr(-30))
    .map(r => r.sign_date)
  ok(res, list)
})

module.exports = router
