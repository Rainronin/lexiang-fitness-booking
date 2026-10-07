// 全局错误处理：统一返回 { code, data, message }
const { fail } = require('../utils/response')

function notFound(req, res) {
  fail(res, 404, `接口不存在: ${req.method} ${req.path}`, 404)
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // multer 文件类型/大小错误
  if (err && err.code === 'LIMIT_FILE_SIZE') return fail(res, 400, '文件大小超出限制（最大 2MB）')
  if (err && err.message === 'INVALID_FILE_TYPE') return fail(res, 400, '仅支持 jpg/png/webp 图片')
  if (err && err.name === 'SyntaxError') return fail(res, 400, '请求体格式错误')
  // express.json 默认 100kb 限制
  if (err && err.type === 'entity.too.large') return fail(res, 413, '请求体超出大小限制', 413)
  console.error('[error]', err)
  // 生产环境不向客户端泄露内部错误细节（本地开发可打印，见上方 console.error）
  fail(res, 500, '服务器内部错误', 500)
}

module.exports = { notFound, errorHandler }
