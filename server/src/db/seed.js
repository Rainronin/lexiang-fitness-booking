// 种子数据：账号/分类/课程/教练/排班/会员/预约/签到/规则
// 预约记录覆盖近 30 天 + 未来 3 天，保证看板图表有数据、演示可预约
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')
const db = require('../db')
const { TIME_SLOTS } = require('../utils/constants')

// 确定性伪随机（mulberry32），保证每次 seed 数据一致
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260808)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1))

function dateStr(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// 使用随项目保存的运动插画 PNG，兼容 H5 与微信小程序。
function makeCover(fileName) {
  const source = path.join(__dirname, '..', '..', 'assets', 'demo-art', fileName)
  const target = path.join(__dirname, '..', '..', 'uploads', fileName)
  fs.copyFileSync(source, target)
  return `/uploads/${fileName}`
}

function seed() {
  // 清理 uploads 旧产物（复制插画 PNG）
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads')
  fs.rmSync(uploadsDir, { recursive: true, force: true })
  fs.mkdirSync(uploadsDir, { recursive: true })

  // 1. 后台账号
  const adminPwd = bcrypt.hashSync('123456', 10)
  const adminId = db.prepare('INSERT INTO admin (username,password,name,role) VALUES (?,?,?,?)')
    .run('admin', adminPwd, '系统管理员', 'admin').lastInsertRowid
  const staffId = db.prepare('INSERT INTO admin (username,password,name,role) VALUES (?,?,?,?)')
    .run('staff', adminPwd, '前台员工', 'staff').lastInsertRowid
  console.log(`  账号: admin/123456(管理员), staff/123456(员工)`)

  // 2. 分类
  const categories = [
    { name: '瑜伽' },
    { name: '力量' },
    { name: '有氧' },
    { name: '格斗' }
  ]
  const catInsert = db.prepare('INSERT INTO category (name,sort,status) VALUES (?,?,?)')
  const catIds = {}
  categories.forEach((c, i) => {
    catIds[c.name] = catInsert.run(c.name, i, 'active').lastInsertRowid
  })

  // 3. 课程（每分类 3 门，价格 30~200，封面使用随项目保存的插画 PNG）
  const courseData = [
    ['哈他瑜伽', '瑜伽', 68, 60, '基础瑜伽，适合零基础，改善体态与柔韧性'],
    ['流瑜伽', '瑜伽', 88, 75, '流动串联体式，提升身体协调与核心力量'],
    ['空中瑜伽', '瑜伽', 128, 60, '借助吊床完成倒立与拉伸，趣味减压'],
    ['杠铃操', '力量', 58, 60, '杠铃负重训练，高效增肌塑形'],
    ['壶铃训练', '力量', 78, 60, '壶铃摆动与复合动作，燃脂与力量兼得'],
    ['器械私教', '力量', 198, 60, '一对一器械指导，定制增肌计划'],
    ['动感单车', '有氧', 48, 45, '高强度间歇骑行，暴汗燃脂'],
    ['燃脂搏击操', '有氧', 58, 60, '搏击动作组合，全身燃脂'],
    ['尊巴舞', '有氧', 45, 60, '拉丁舞步与音乐结合，快乐减脂'],
    ['泰拳基础', '格斗', 98, 60, '泰拳基本功：站架、直拳、扫踢'],
    ['巴西柔术', '格斗', 138, 90, '地面缠斗技术，防身实用'],
    ['拳击入门', '格斗', 88, 60, '拳击步伐与组合拳训练']
  ]
  const courseInsert = db.prepare(
    'INSERT INTO course (category_id,name,cover,price,duration,intro,status,created_at) VALUES (?,?,?,?,?,?,?,?)'
  )
  const courseIds = []
  courseData.forEach(([name, cat, price, duration, intro], i) => {
    const cover = makeCover(`course-${i + 1}.png`)
    const id = courseInsert.run(catIds[cat], name, cover, price, duration, intro, i % 6 === 5 ? 'off' : 'on', dateStr(-60)).lastInsertRowid
    courseIds.push(id)
  })
  const onCourseIds = courseIds.filter((_, i) => i % 6 !== 5)

  // 4. 教练
  const coaches = [
    ['林晓彤', '高级瑜伽导师', '10 年瑜伽教学经验，RYT500 认证'],
    ['王大力', '力量训练教练', '国家健美二级运动员，擅长增肌减脂'],
    ['陈飞', '有氧团课教练', '单车/搏击操双认证，课堂氛围活跃'],
    ['李泰', '泰拳教练', '前职业泰拳手，实战经验丰富'],
    ['张柔', '柔术教练', '巴西柔术蓝带，擅长零基础教学']
  ]
  const coachInsert = db.prepare('INSERT INTO coach (name,avatar,title,intro,status,created_at) VALUES (?,?,?,?,?,?)')
  const coachIds = []
  coaches.forEach(([name, title, intro], i) => {
    const avatar = makeCover(`coach-${i + 1}.png`)
    coachIds.push(coachInsert.run(name, avatar, title, intro, 'active', dateStr(-90)).lastInsertRowid)
  })

  // 5. 排班：每教练每周 3~6 个（确定性随机，容量 5~20）
  const scheduleInsert = db.prepare(
    'INSERT INTO schedule (coach_id,course_id,weekday,time_slot,capacity,status) VALUES (?,?,?,?,?,?)'
  )
  const scheduleIds = []
  coachIds.forEach((cid, ci) => {
    const count = randInt(3, 6)
    const used = new Set()
    let n = 0
    while (n < count) {
      const weekday = randInt(0, 6)
      const timeSlot = pick(TIME_SLOTS)
      const key = `${weekday}-${timeSlot}`
      if (used.has(key)) continue
      used.add(key)
      const courseId = onCourseIds[randInt(0, onCourseIds.length - 1)]
      scheduleIds.push(scheduleInsert.run(cid, courseId, weekday, timeSlot, randInt(5, 20), 'active').lastInsertRowid)
      n++
    }
  })

  // 6. 会员 32 个
  const memberInsert = db.prepare('INSERT INTO member (phone,nickname,gender,status,created_at) VALUES (?,?,?,?,?)')
  const memberIds = []
  for (let i = 1; i <= 32; i++) {
    const phone = `138${String(10000000 + i * 137).slice(0, 8)}`
    const id = memberInsert.run(
      phone,
      `会员${String(i).padStart(2, '0')}`,
      i % 2 ? 'male' : 'female',
      i % 9 === 0 ? 'disabled' : 'active',
      dateStr(-randInt(10, 60))
    ).lastInsertRowid
    memberIds.push(id)
  }
  const activeMembers = memberIds.filter((_, i) => i % 9 !== 0)

  // 7. 预约：近 30 天 + 今天 + 未来 3 天，每天随机 2~5 个排班生成 1~4 条预约（不约满，留演示名额）
  const bookingInsert = db.prepare(
    'INSERT INTO booking (member_id,schedule_id,booking_date,status,created_at) VALUES (?,?,?,?,?)'
  )
  let bookingCount = 0
  for (let offset = -30; offset <= 3; offset++) {
    const d = dateStr(offset)
    const weekday = new Date(d).getDay()
    const rows = db.prepare('SELECT id, capacity FROM schedule WHERE weekday = ? AND status = ?').all(weekday, 'active')
    // 随机挑 2~5 个排班生成预约
    rows.sort(() => rand() - 0.5)
    const chosen = rows.slice(0, randInt(2, Math.min(5, rows.length)))
    for (const s of chosen) {
      const count = randInt(1, Math.min(4, s.capacity - 1))
      const members = [...activeMembers].sort(() => rand() - 0.5).slice(0, count)
      for (const mid of members) {
        const cancelled = offset >= -5 && rand() < 0.15
        // R-M1：created_at 统一 ISO 8601（与运行时 new Date().toISOString() 一致，避免前端解析差异）
        bookingInsert.run(mid, s.id, d, cancelled ? 'cancelled' : 'confirmed', new Date(`${dateStr(offset - 1)}T12:00:00`).toISOString())
        bookingCount++
      }
    }
  }
  console.log(`  预约记录: ${bookingCount} 条（近 30 天 ~ 未来 3 天）`)

  // 8. 签到：近 7 天随机 60% 会员签到
  const signinInsert = db.prepare('INSERT INTO signin (member_id,sign_date) VALUES (?,?)')
  for (let offset = -6; offset <= 0; offset++) {
    for (const mid of activeMembers) {
      if (rand() < 0.6) signinInsert.run(mid, dateStr(offset))
    }
  }

  // 9. 规则
  db.prepare('INSERT INTO rules (id,advance_days,daily_limit) VALUES (1,7,3)').run()

  console.log(`  完成: 分类 ${categories.length} / 课程 ${courseIds.length} / 教练 ${coachIds.length} / 排班 ${scheduleIds.length} / 会员 ${memberIds.length}`)
}

module.exports = { seed }
