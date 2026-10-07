// 会员端接口定义（与后端 API 清单对应）
import { get, post, put } from '../utils/request'

export const courseApi = {
  categories: () => get('/categories'),
  list: (params) => get('/courses', params),
  detail: (id) => get(`/courses/${id}`),
  hot: () => get('/courses/hot/list'),
  // 某课程未来日期范围的可约时段（含剩余名额）
  availSlots: (courseId, start, end) =>
    get('/schedules/member-schedules', { course_id: courseId, start, end })
}

export const authApi = {
  sendCode: (phone) => post('/auth/member/send-code', { phone }, { auth: false }),
  login: (phone, code) => post('/auth/member/login', { phone, code }, { auth: false })
}

export const bookingApi = {
  list: (tab) => get('/member/bookings', { tab }),
  create: (scheduleId, bookingDate) => post('/member/bookings', { schedule_id: scheduleId, booking_date: bookingDate }),
  cancel: (id) => put(`/member/bookings/${id}/cancel`)
}

export const signinApi = {
  sign: () => post('/member/signin'),
  list: () => get('/member/signin')
}

export const ruleApi = {
  // 公开规则：详情页据此生成可约日期范围（与后台 advance_days 联动）
  public: () => get('/rules/public')
}
