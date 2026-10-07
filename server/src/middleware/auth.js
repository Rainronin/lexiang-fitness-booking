// 鉴权中间件：从 Authorization: Bearer <token> 解析并校验 JWT
const { verify } = require('../utils/jwt')
const { fail } = require('../utils/response')

// 通用解析：挂载 req.user，校验失败返回 401
function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return fail(res, 401, '未登录或登录已过期', 401)
  try {
    req.user = verify(token)
    next()
  } catch {
    return fail(res, 401, '登录状态无效，请重新登录', 401)
  }
}

// R-C1：组合式角色链 —— auth 通过后执行角色校验，返回错误描述对象则拒绝，避免回调嵌套
function chain(roleCheck) {
  return (req, res, next) =>
    auth(req, res, () => {
      const err = roleCheck(req)
      if (err) return fail(res, err.status, err.message, err.status)
      next()
    })
}

// 后台接口：必须为后台账号（type=admin，含员工）
const authAdmin = chain((req) =>
  req.user.type !== 'admin' ? { status: 403, message: '无权限访问' } : null
)

// 仅管理员接口：在 authAdmin 基础上要求 role === 'admin'（员工无权限）
const authSuper = chain((req) => {
  if (req.user.type !== 'admin') return { status: 403, message: '无权限访问' }
  if (req.user.role !== 'admin') return { status: 403, message: '仅管理员可操作' }
  return null
})

// 会员端接口：必须为会员（type=member）
const authMember = chain((req) =>
  req.user.type !== 'member' ? { status: 403, message: '无权限访问' } : null
)

module.exports = { auth, authAdmin, authSuper, authMember }
