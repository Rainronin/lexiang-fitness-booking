// 统一响应格式：{ code, data, message }，code 0 成功，非 0 失败
function ok(res, data = null, message = 'success') {
  res.json({ code: 0, data, message })
}

function fail(res, code, message, httpStatus = 400) {
  res.status(httpStatus).json({ code, data: null, message })
}

module.exports = { ok, fail }
