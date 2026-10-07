// 冒烟测试：一键验证后端全部接口（M1 验收标准）
// 用法：先启动后端（npm run dev），再执行 node scripts/smoke-test.js
// 覆盖：认证/权限/CRUD/预约事务(重复·名额满·超范围)/取消/统计/签到/上传
const db = require('../src/db')

const BASE = 'http://localhost:3000'
let pass = 0
let failCount = 0

function check(name, cond, extra = '') {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    failCount++
    console.log(`  ✗ ${name} ${extra}`)
  }
}

async function api(method, path, { token, body } = {}) {
  if (process.env.DEBUG_API) console.error(`[api] ${method} ${path} token=${token ? token.slice(0, 20) + '...' : 'NONE'}`)
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, ...json }
}

const today = new Date().toISOString().slice(0, 10)
const futureDate = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

async function main() {
  console.log('== 1. 健康检查 ==')
  const health = await api('GET', '/api/health')
  check('GET /api/health', health.code === 0)

  console.log('== 2. 后台登录与权限 ==')
  const adminLogin = await api('POST', '/api/auth/admin/login', { body: { username: 'admin', password: '123456' } })
  check('admin 登录成功', adminLogin.code === 0 && !!adminLogin.data.token, JSON.stringify(adminLogin))
  const adminToken = adminLogin.data.token

  const staffLogin = await api('POST', '/api/auth/admin/login', { body: { username: 'staff', password: '123456' } })
  check('staff 登录成功', staffLogin.code === 0)
  const staffToken = staffLogin.data.token

  const badLogin = await api('POST', '/api/auth/admin/login', { body: { username: 'admin', password: 'wrong' } })
  check('错误密码被拒', badLogin.code !== 0)

  const noToken = await api('GET', '/api/members')
  check('无 token 访问受限接口返回 401', noToken.status === 401, String(noToken.status))

  const staffDash = await api('GET', '/api/stats/dashboard', { token: staffToken })
  check('员工访问工作台看板成功(员工可见)', staffDash.code === 0, JSON.stringify(staffDash))
  check('员工看板含本月每日营收(month_daily, A-C1)', staffDash.code === 0 && Array.isArray(staffDash.data.month_daily))
  const staffStats = await api('GET', '/api/stats/revenue?type=day', { token: staffToken })
  check('员工访问营收统计被拒(403)', staffStats.status === 403, String(staffStats.status))

  const me = await api('GET', '/api/auth/me', { token: adminToken })
  check('GET /api/auth/me', me.code === 0 && me.data.role === 'admin')

  console.log('== 3. 分类 CRUD ==')
  const cats = await api('GET', '/api/categories')
  check('分类列表', cats.code === 0 && cats.data.length >= 4)
  const catName = `测试分类${Date.now()}`
  const newCat = await api('POST', '/api/categories', { token: adminToken, body: { name: catName, sort: 99 } })
  check('新增分类', newCat.code === 0, JSON.stringify(newCat))
  const catId = newCat.data.id
  const dupCat = await api('POST', '/api/categories', { token: adminToken, body: { name: catName } })
  check('重复分类名被拒(409)', dupCat.code !== 0)
  const updCat = await api('PUT', `/api/categories/${catId}`, { token: adminToken, body: { name: '测试分类改' } })
  check('编辑分类', updCat.code === 0)
  const badCatStatus = await api('PUT', `/api/categories/${catId}`, { token: adminToken, body: { status: 'hacked' } })
  check('非法分类状态被拒(400, R-I1)', badCatStatus.code !== 0 && badCatStatus.status === 400, JSON.stringify(badCatStatus))
  const delCat = await api('DELETE', `/api/categories/${catId}`, { token: adminToken })
  check('删除分类', delCat.code === 0)

  console.log('== 4. 课程 CRUD 与上传 ==')
  const courses = await api('GET', '/api/courses?pageSize=5')
  check('课程列表(公开仅上架)', courses.code === 0 && courses.data.list.length > 0)
  check('课程列表不重复展示同一教练', courses.data.list.every(course => {
    const names = course.coach_name ? course.coach_name.split(',') : []
    return new Set(names).size === names.length
  }))
  const courseId = courses.data.list[0].id
  const courseDetail = await api('GET', `/api/courses/${courseId}`)
  check('课程详情含排班', courseDetail.code === 0 && Array.isArray(courseDetail.data.schedules))

  const fd = new FormData()
  // 最小合法 PNG 文件头（8 字节签名），通过服务端 magic bytes 校验
  fd.append('file', new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])], { type: 'image/png' }), 'test.png')
  const uploadRes = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: fd
  })
  const uploadJson = await uploadRes.json()
  check('图片上传', uploadJson.code === 0 && uploadJson.data.url.startsWith('/uploads/'), JSON.stringify(uploadJson))

  const newCourse = await api('POST', '/api/courses', { token: adminToken, body: { category_id: 1, name: `测试课程${Date.now()}`, price: 50 } })
  check('新增课程', newCourse.code === 0)
  const newCourseId = newCourse.data.id
  const updCourse = await api('PUT', `/api/courses/${newCourseId}`, { token: adminToken, body: { price: 66 } })
  check('编辑课程', updCourse.code === 0)
  const offCourse = await api('PUT', `/api/courses/${newCourseId}/status`, { token: adminToken, body: { status: 'off' } })
  check('课程下架', offCourse.code === 0)
  const offList = await api('GET', `/api/courses?pageSize=20`)
  check('下架课程不出现在公开列表', !offList.data.list.some(c => c.id === newCourseId))
  const delCourse = await api('DELETE', `/api/courses/${newCourseId}`, { token: adminToken })
  check('删除课程(无排班)', delCourse.code === 0)

  console.log('== 5. 教练 CRUD 与排班 ==')
  const coaches = await api('GET', '/api/coaches?all=1&pageSize=20')
  check('教练列表', coaches.code === 0 && coaches.data.list.length >= 5, JSON.stringify(coaches).slice(0, 120))
  const coachId = coaches.data.list[0].id
  const sch = await api('GET', `/api/coaches/${coachId}/schedule`, { token: adminToken })
  check('获取教练排班', sch.code === 0 && Array.isArray(sch.data.list))

  const newCoach = await api('POST', '/api/coaches', { token: adminToken, body: { name: `测试教练${Date.now()}` } })
  check('新增教练', newCoach.code === 0)
  const newCoachId = newCoach.data.id
  const badCoachStatus = await api('PUT', `/api/coaches/${newCoachId}`, { token: adminToken, body: { status: 'hacked' } })
  check('非法教练状态被拒(400, R-I1)', badCoachStatus.code !== 0 && badCoachStatus.status === 400, JSON.stringify(badCoachStatus))
  const emptySch = await api('PUT', `/api/coaches/${newCoachId}/schedule`, {
    token: adminToken,
    body: { schedules: [{ course_id: courseId, weekday: 1, time_slot: '09:00-10:00', capacity: 8 }] }
  })
  check('保存排班', emptySch.code === 0, JSON.stringify(emptySch))
  const conflictSch = await api('PUT', `/api/coaches/${newCoachId}/schedule`, {
    token: adminToken,
    body: { schedules: [
      { course_id: courseId, weekday: 1, time_slot: '09:00-10:00', capacity: 8 },
      { course_id: courseId, weekday: 1, time_slot: '09:00-10:00', capacity: 10 }
    ] }
  })
  check('同时段重复排班被拒(409)', conflictSch.code !== 0, JSON.stringify(conflictSch))
  // R-I5：给下架课程安排排班应被拒（400），且不影响该教练现有排班
  const offCourseForSch = await api('POST', '/api/courses', { token: adminToken, body: { category_id: 1, name: `下架测试${Date.now()}`, price: 30 } })
  const offCourseForSchId = offCourseForSch.data.id
  await api('PUT', `/api/courses/${offCourseForSchId}/status`, { token: adminToken, body: { status: 'off' } })
  const offSch = await api('PUT', `/api/coaches/${newCoachId}/schedule`, {
    token: adminToken,
    body: { schedules: [{ course_id: offCourseForSchId, weekday: 2, time_slot: '10:00-11:00', capacity: 8 }] }
  })
  check('下架课程排班被拒(400, R-I5)', offSch.code !== 0 && offSch.status === 400, JSON.stringify(offSch))
  await api('DELETE', `/api/courses/${offCourseForSchId}`, { token: adminToken })
  const delCoach = await api('DELETE', `/api/coaches/${newCoachId}`, { token: adminToken })
  if (delCoach.code !== 0) {
    // 先清空排班再删（保护规则生效则提示，属预期路径）
    await api('PUT', `/api/coaches/${newCoachId}/schedule`, { token: adminToken, body: { schedules: [] } })
    const delCoach2 = await api('DELETE', `/api/coaches/${newCoachId}`, { token: adminToken })
    check('删除教练(清空排班后)', delCoach2.code === 0, JSON.stringify(delCoach2))
  } else {
    check('删除教练(无排班)', true)
  }

  console.log('== 6. 会员 CRUD ==')
  const testPhone = `188${String(Date.now()).slice(-8)}`
  const newMember = await api('POST', '/api/members', { token: adminToken, body: { phone: testPhone, nickname: '测试会员' } })
  check('新增会员', newMember.code === 0, JSON.stringify(newMember))
  const members = await api('GET', `/api/members?keyword=${testPhone}`, { token: adminToken })
  check('会员搜索', members.code === 0 && members.data.total >= 1, JSON.stringify(members))
  const memberId = members.data.list[0].id
  const updMember = await api('PUT', `/api/members/${memberId}`, { token: adminToken, body: { nickname: '测试会员改' } })
  check('编辑会员', updMember.code === 0)
  const blankGender = await api('PUT', `/api/members/${memberId}`, { token: adminToken, body: { gender: '' } })
  check('空串性别不触发 500（回退原值, R-I2）', blankGender.code === 0, JSON.stringify(blankGender))
  const badGender = await api('PUT', `/api/members/${memberId}`, { token: adminToken, body: { gender: 'hacked' } })
  check('非法性别被拒(400, R-I2)', badGender.code !== 0 && badGender.status === 400, JSON.stringify(badGender))

  console.log('== 7. 会员端认证与预约事务 ==')
  const sendCode = await api('POST', '/api/auth/member/send-code', { body: { phone: testPhone } })
  check('发送验证码', sendCode.code === 0)
  const mLogin = await api('POST', '/api/auth/member/login', { body: { phone: testPhone, code: '123456' } })
  check('会员登录(验证码正确)', mLogin.code === 0, JSON.stringify(mLogin))
  const mToken = mLogin.data.token
  const badCode = await api('POST', '/api/auth/member/login', { body: { phone: testPhone, code: '000000' } })
  check('错误验证码被拒', badCode.code !== 0)

  // 停用会员不可预约
  await api('PUT', `/api/members/${memberId}/status`, { token: adminToken, body: { status: 'disabled' } })
  const disLogin = await api('POST', '/api/auth/member/login', { body: { phone: testPhone, code: '123456' } })
  check('停用会员登录被拒', disLogin.code !== 0)
  await api('PUT', `/api/members/${memberId}/status`, { token: adminToken, body: { status: 'active' } })

  // R-M3：非法日期范围应返回 400 而非静默空数组
  const badDates = await api('GET', `/api/schedules/member-schedules?course_id=1&start=abc&end=2026-02-31`)
  check('非法日期范围被拒(400, R-M3)', badDates.code !== 0 && badDates.status === 400, JSON.stringify(badDates))

  // 找一个未来 3 天内可约的排班
  const availCourses = await api('GET', '/api/courses?pageSize=20')
  let target = null
  for (const c of availCourses.data.list) {
    const slots = await api('GET', `/api/schedules/member-schedules?course_id=${c.id}&start=${futureDate(1)}&end=${futureDate(3)}`)
    if (slots.data.length > 0) { target = { course: c, slots: slots.data }; break }
  }
  check('课程可约时段查询', !!target && target.slots.length > 0, '没有可约排班')
  if (target) {
    const slot = target.slots[0]
    const bk = await api('POST', '/api/member/bookings', { token: mToken, body: { schedule_id: slot.schedule_id, booking_date: slot.date } })
    check('提交预约成功', bk.code === 0, JSON.stringify(bk))
    const bookingId = bk.data.id

    const dup = await api('POST', '/api/member/bookings', { token: mToken, body: { schedule_id: slot.schedule_id, booking_date: slot.date } })
    check('重复预约被拒(409)', dup.code !== 0, JSON.stringify(dup))

    const far = await api('POST', '/api/member/bookings', { token: mToken, body: { schedule_id: slot.schedule_id, booking_date: futureDate(9) } })
    check('超出提前预约天数被拒', far.code !== 0)

    const wrongDay = await api('POST', '/api/member/bookings', { token: mToken, body: { schedule_id: slot.schedule_id, booking_date: futureDate(2) } })
    const wrongDayExpect = wrongDay.code !== 0 // weekday 不匹配时被拒
    check('weekday 不匹配被拒', wrongDayExpect, JSON.stringify(wrongDay))

    // 名额满：把该排班容量改为 1，用另一会员预约应被拒
    db.prepare('UPDATE schedule SET capacity = 1 WHERE id = ?').run(slot.schedule_id)
    const m2 = await api('POST', '/api/auth/member/login', { body: { phone: `189${String(Date.now()).slice(-8)}`, code: '123456' } })
    const full = await api('POST', '/api/member/bookings', { token: m2.data.token, body: { schedule_id: slot.schedule_id, booking_date: slot.date } })
    check('名额已满被拒(409)', full.code !== 0, JSON.stringify(full))
    db.prepare('UPDATE schedule SET capacity = ? WHERE id = ?').run(slot.capacity, slot.schedule_id)

    const myList = await api('GET', '/api/member/bookings?tab=upcoming', { token: mToken })
    check('我的预约列表包含新预约', myList.code === 0 && myList.data.some(b => b.id === bookingId))

    const cancel = await api('PUT', `/api/member/bookings/${bookingId}/cancel`, { token: mToken })
    check('会员取消预约', cancel.code === 0, JSON.stringify(cancel))
    const cancelAgain = await api('PUT', `/api/member/bookings/${bookingId}/cancel`, { token: mToken })
    check('重复取消被拒', cancelAgain.code !== 0)

    // 后台取消
    const bk2 = await api('POST', '/api/member/bookings', { token: mToken, body: { schedule_id: slot.schedule_id, booking_date: slot.date } })
    const adminCancel = await api('PUT', `/api/bookings/${bk2.data.id}/cancel`, { token: adminToken })
    check('后台取消预约', adminCancel.code === 0, JSON.stringify(adminCancel))
  }

  console.log('== 8. 后台预约列表 ==')
  const bkList = await api('GET', '/api/bookings?pageSize=5', { token: adminToken })
  check('预约列表', bkList.code === 0 && bkList.data.total > 0)
  const bkListCompleted = await api('GET', '/api/bookings?status=completed&pageSize=5', { token: adminToken })
  check('已完成筛选', bkListCompleted.code === 0)
  const sampleBooking = bkList.data.list[0]
  const byCourse = await api('GET', `/api/bookings?course_id=${sampleBooking.course_id}&pageSize=100`, { token: adminToken })
  check('按课程筛选预约', byCourse.code === 0 && byCourse.data.total >= 1 && byCourse.data.list.every(b => b.course_id === sampleBooking.course_id), JSON.stringify(byCourse))
  const byKeyword = await api('GET', `/api/bookings?keyword=${sampleBooking.phone}&pageSize=100`, { token: adminToken })
  check('按关键词筛选预约', byKeyword.code === 0 && byKeyword.data.total >= 1 && byKeyword.data.list.some(b => b.id === sampleBooking.id), JSON.stringify(byKeyword))

  console.log('== 9. 规则 ==')
  const rules = await api('GET', '/api/rules', { token: adminToken })
  check('读取规则', rules.code === 0 && rules.data.advance_days >= 1)
  const updRules = await api('PUT', '/api/rules', { token: adminToken, body: { advance_days: 7, daily_limit: 3 } })
  check('更新规则', updRules.code === 0)
  const badRules = await api('PUT', '/api/rules', { token: adminToken, body: { advance_days: 99, daily_limit: 3 } })
  check('非法规则被拒', badRules.code !== 0)

  console.log('== 10. 统计 ==')
  const dash = await api('GET', '/api/stats/dashboard', { token: adminToken })
  check('看板统计(含趋势/热度)', dash.code === 0 && Array.isArray(dash.data.trend) && Array.isArray(dash.data.hot_courses))
  const rev = await api('GET', '/api/stats/revenue?type=day', { token: adminToken })
  check('营收统计(按日)', rev.code === 0 && Array.isArray(rev.data.list))
  const revMonth = await api('GET', '/api/stats/revenue?type=month', { token: adminToken })
  check('营收统计(按月)', revMonth.code === 0)
  const hot = await api('GET', '/api/stats/course-hot', { token: adminToken })
  check('课程热度排行', hot.code === 0 && hot.data.length > 0)

  console.log('== 11. 签到 ==')
  const sign = await api('POST', '/api/member/signin', { token: mToken })
  check('签到成功', sign.code === 0, JSON.stringify(sign))
  const signAgain = await api('POST', '/api/member/signin', { token: mToken })
  check('重复签到提示已签到', signAgain.code === 0)
  const signList = await api('GET', '/api/member/signin', { token: mToken })
  check('签到记录', signList.code === 0 && Array.isArray(signList.data))

  console.log(`\n结果: ${pass} 通过 / ${failCount} 失败`)
  process.exit(failCount === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('smoke-test 异常:', e.message)
  process.exit(1)
})
