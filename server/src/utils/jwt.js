// JWT 签发与校验：两端（后台 admin / 会员 member）共用同一 secret，按 type 区分
const jwt = require('jsonwebtoken')

// 密钥优先从环境变量读取（部署可覆盖），开发环境使用默认值
const SECRET = process.env.JWT_SECRET || 'lexiang-fitness-secret-2026'
const EXPIRES_IN = '7d'

function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN })
}

function verify(token) {
  return jwt.verify(token, SECRET)
}

module.exports = { sign, verify, SECRET }
