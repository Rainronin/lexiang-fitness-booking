// 接口定义：与后端 API 清单一一对应
import request from './request'

export const authApi = {
  login: (data) => request.post('/auth/admin/login', data),
  me: () => request.get('/auth/me')
}

export const memberApi = {
  list: (params) => request.get('/members', { params }),
  create: (data) => request.post('/members', data),
  update: (id, data) => request.put(`/members/${id}`, data),
  updateStatus: (id, status) => request.put(`/members/${id}/status`, { status })
}

export const categoryApi = {
  list: (all = false) => request.get('/categories', { params: { all: all ? 1 : undefined } }),
  create: (data) => request.post('/categories', data),
  update: (id, data) => request.put(`/categories/${id}`, data),
  remove: (id) => request.delete(`/categories/${id}`)
}

export const courseApi = {
  list: (params) => request.get('/courses', { params }),
  detail: (id) => request.get(`/courses/${id}`),
  create: (data) => request.post('/courses', data),
  update: (id, data) => request.put(`/courses/${id}`, data),
  updateStatus: (id, status) => request.put(`/courses/${id}/status`, { status }),
  remove: (id) => request.delete(`/courses/${id}`),
  upload: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return request.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  }
}

export const coachApi = {
  list: (all = false, params = {}) => request.get('/coaches', { params: { all: all ? 1 : undefined, ...params } }),
  create: (data) => request.post('/coaches', data),
  update: (id, data) => request.put(`/coaches/${id}`, data),
  remove: (id) => request.delete(`/coaches/${id}`),
  getSchedule: (id) => request.get(`/coaches/${id}/schedule`),
  saveSchedule: (id, schedules) => request.put(`/coaches/${id}/schedule`, { schedules })
}

export const scheduleApi = {
  list: (params) => request.get('/schedules', { params })
}

export const bookingApi = {
  list: (params) => request.get('/bookings', { params }),
  cancel: (id) => request.put(`/bookings/${id}/cancel`)
}

export const ruleApi = {
  get: () => request.get('/rules'),
  update: (data) => request.put('/rules', data)
}

export const statsApi = {
  dashboard: () => request.get('/stats/dashboard'),
  revenue: (params) => request.get('/stats/revenue', { params }),
  courseHot: () => request.get('/stats/course-hot')
}
