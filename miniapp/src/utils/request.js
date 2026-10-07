// uni.request 封装：token 注入、401 统一跳登录（防并发重复跳转）、响应解构、错误提示
// 注意：后端接口统一 /api 前缀，BASE_URL 已包含
import { BASE_URL } from '../config'
import { useUserStore } from '../stores/user'

// 401 跳转标志：多个请求同时过期时只跳转一次，防止登录页栈叠加
let redirecting = false

function redirectToLogin() {
  if (redirecting) return
  redirecting = true
  // 已在登录页则不重复跳转
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  if (current && current.route === 'pages/login/index') {
    redirecting = false
    return
  }
  uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
  setTimeout(() => {
    // navigateTo 保留页面栈：登录成功后 navigateBack 回到原页面，不丢预约上下文
    uni.navigateTo({ url: '/pages/login/index' })
    redirecting = false
  }, 500)
}

function request({ url, method = 'GET', data = {}, auth = true }) {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('lexiang_token')
    uni.request({
      url: BASE_URL + url,
      method,
      timeout: 10000,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {})
      },
      success: (res) => {
        const body = res.data
        if (body && body.code === 0) {
          resolve(body.data)
        } else if (res.statusCode === 401) {
          // 契约：后端 401 返回 HTTP 401 + { code:401, message }（见 server/src/middleware/auth.js）
          // MP-M1：统一走 store.logout() 清 state + storage（与 admin-web 口径一致，避免内存态残留）
          useUserStore().logout()
          redirectToLogin()
          reject(new Error(body?.message || '未登录'))
        } else {
          uni.showToast({ title: body?.message || '请求失败', icon: 'none' })
          reject(new Error(body?.message || 'request error'))
        }
      },
      fail: () => {
        uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        reject(new Error('network error'))
      }
    })
  })
}

export const get = (url, data, opts) => request({ url, data, ...opts })
export const post = (url, data, opts) => request({ url, method: 'POST', data, ...opts })
export const put = (url, data, opts) => request({ url, method: 'PUT', data, ...opts })
