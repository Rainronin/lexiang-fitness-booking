// 乐享健身预约平台 · 后端入口
// Express + better-sqlite3，RESTful 接口，统一响应 { code, data, message }
const path = require('path')
const express = require('express')
const cors = require('cors')
const { notFound, errorHandler } = require('./middleware/error')

const app = express()

// 全局中间件
app.use(cors())            // 允许小程序 H5 端跨域直连
app.use(express.json())    // JSON 请求体解析
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'))) // 图片静态托管

// 路由挂载（统一 /api 前缀）
app.use('/api/auth', require('./routes/auth'))
app.use('/api/members', require('./routes/members'))
app.use('/api/categories', require('./routes/categories'))
app.use('/api/courses', require('./routes/courses'))
app.use('/api/coaches', require('./routes/coaches'))
app.use('/api/schedules', require('./routes/schedules'))
app.use('/api/bookings', require('./routes/bookings'))
app.use('/api/member/bookings', require('./routes/memberBookings'))
app.use('/api/rules', require('./routes/rules'))
app.use('/api/stats', require('./routes/stats'))
app.use('/api/member/signin', require('./routes/signin'))
app.use('/api/upload', require('./routes/upload'))

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 0, data: { status: 'ok' }, message: 'success' })
})

app.use(notFound)
app.use(errorHandler)

const PORT = 3000
app.listen(PORT, () => {
  console.log(`[server] 乐享健身后端已启动: http://localhost:${PORT}`)
})
