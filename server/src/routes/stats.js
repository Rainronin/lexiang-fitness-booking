// 统计接口（后台，仅管理员可见）：看板 / 营收 / 课程热度
const express = require('express')
const db = require('../db')
const { ok, fail } = require('../utils/response')
const { authAdmin, authSuper } = require('../middleware/auth')
const { localDateStr, offsetDateStr } = require('../utils/date')

const router = express.Router()

// 工作台看板：今日预约数、今日上座率、本月营收、近 7 日趋势、热门课程 TOP5
// 注意：员工可见（authAdmin），营收统计/课程热度仍仅管理员（authSuper）
router.get('/dashboard', authAdmin, (req, res) => {
  const today = localDateStr()
  const weekday = new Date().getDay()
  const monthPrefix = today.slice(0, 7)

  const todayBookings = db.prepare("SELECT COUNT(*) c FROM booking WHERE booking_date = ? AND status = 'confirmed'").get(today).c

  // 今日上座率：今日 weekday 的 active 排班容量 vs 已约数
  const capRow = db.prepare("SELECT COALESCE(SUM(capacity),0) c FROM schedule WHERE weekday = ? AND status = 'active'").get(weekday)
  const todayBookedRow = db.prepare(`
    SELECT COUNT(*) c FROM booking b JOIN schedule s ON s.id = b.schedule_id
    WHERE b.booking_date = ? AND b.status = 'confirmed' AND s.weekday = ? AND s.status = 'active'
  `).get(today, weekday)
  const occupancy = capRow.c > 0 ? Math.round((todayBookedRow.c / capRow.c) * 100) : 0

  // 口径说明（R-M4）：completed 状态不落库（查询时按 booking_date < 今天 && confirmed 动态判定），
  // SQL 中的 'completed' 分支为兼容未来直接落库而保留，当前实际只命中 confirmed
  const monthRevenue = db.prepare(`
    SELECT COALESCE(SUM(co.price), 0) s FROM booking b
    JOIN schedule s ON s.id = b.schedule_id JOIN course co ON co.id = s.course_id
    WHERE b.booking_date LIKE ? AND b.status IN ('confirmed','completed')
  `).get(`${monthPrefix}%`).s

  // 近 7 日预约趋势（R-C2：日期边界统一 Node 本地日历日）
  const trend = db.prepare(`
    SELECT b.booking_date AS date, COUNT(*) AS count, COALESCE(SUM(co.price),0) AS revenue
    FROM booking b JOIN schedule s ON s.id = b.schedule_id JOIN course co ON co.id = s.course_id
    WHERE b.booking_date BETWEEN ? AND ?
      AND b.status = 'confirmed'
    GROUP BY b.booking_date ORDER BY b.booking_date
  `).all(offsetDateStr(-6), today)

  // 热门课程 TOP5（近 30 天预约数）
  const hotCourses = db.prepare(`
    SELECT co.id AS course_id, co.name AS course_name, co.price, COUNT(*) AS booking_count
    FROM booking b JOIN schedule s ON s.id = b.schedule_id JOIN course co ON co.id = s.course_id
    WHERE b.status = 'confirmed' AND b.booking_date >= ?
    GROUP BY co.id ORDER BY booking_count DESC LIMIT 5
  `).all(offsetDateStr(-30))

  // 今日课程数：今天 weekday 有 active 排班的课程数（去重），供看板 KPI 展示
  const todayCourses = db.prepare(`
    SELECT COUNT(DISTINCT s.course_id) c FROM schedule s
    JOIN course co ON co.id = s.course_id
    WHERE s.weekday = ? AND s.status = 'active' AND co.status = 'on'
  `).get(weekday).c

  // 本月每日营收（A-C1）：dashboard 一并返回，员工工作台无需再调 authSuper 的 /stats/revenue
  const monthDaily = db.prepare(`
    SELECT b.booking_date AS date, COALESCE(SUM(co.price),0) AS revenue
    FROM booking b JOIN schedule s ON s.id = b.schedule_id JOIN course co ON co.id = s.course_id
    WHERE b.booking_date LIKE ? AND b.status IN ('confirmed','completed')
    GROUP BY b.booking_date ORDER BY b.booking_date
  `).all(`${monthPrefix}%`)

  ok(res, {
    today_bookings: todayBookings,
    today_occupancy: occupancy,
    month_revenue: monthRevenue,
    today_courses: todayCourses,
    trend,
    hot_courses: hotCourses,
    month_daily: monthDaily
  })
})

// 营收统计：type = day(按日) | month(按月)，范围 start~end
router.get('/revenue', authSuper, (req, res) => {
  const { type = 'day', start, end } = req.query
  const startDate = start || '2026-01-01'
  const endDate = end || '2099-12-31'
  const groupExpr = type === 'month' ? "substr(b.booking_date, 1, 7)" : 'b.booking_date'
  const list = db.prepare(`
    SELECT ${groupExpr} AS period, COUNT(*) AS order_count, COALESCE(SUM(co.price),0) AS revenue
    FROM booking b JOIN schedule s ON s.id = b.schedule_id JOIN course co ON co.id = s.course_id
    WHERE b.booking_date BETWEEN ? AND ? AND b.status IN ('confirmed','completed')
    GROUP BY ${groupExpr} ORDER BY period
  `).all(startDate, endDate)
  const summary = db.prepare(`
    SELECT COUNT(*) AS order_count, COALESCE(SUM(co.price),0) AS revenue
    FROM booking b JOIN schedule s ON s.id = b.schedule_id JOIN course co ON co.id = s.course_id
    WHERE b.booking_date BETWEEN ? AND ? AND b.status IN ('confirmed','completed')
  `).get(startDate, endDate)
  ok(res, { list, summary: { ...summary, avg: summary.order_count ? Math.round(summary.revenue / summary.order_count) : 0 } })
})

// 课程热度排行（全部时间，按预约数降序）
router.get('/course-hot', authSuper, (req, res) => {
  const list = db.prepare(`
    SELECT co.id AS course_id, co.name AS course_name, co.price,
           COUNT(*) AS booking_count, COALESCE(SUM(co.price),0) AS revenue
    FROM booking b JOIN schedule s ON s.id = b.schedule_id JOIN course co ON co.id = s.course_id
    WHERE b.status IN ('confirmed','completed')
    GROUP BY co.id ORDER BY booking_count DESC
  `).all()
  ok(res, list)
})

module.exports = router
