// Axios 请求层封装：Token 注入、401 统一处理、响应解构（code=0 直接返回 data）
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'

// A-M3：不静态 import router（router → store → api → request 会形成循环依赖）；
// 401 跳转时动态 import，运行时 router 模块早已初始化完成，无环
async function pushLogin(redirectPath) {
  try {
    const { default: router } = await import('../router')
    await router.push({ path: '/login', query: { redirect: redirectPath } })
  } catch {
    window.location.href = '/login'
  }
}

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 401 跳转标志：多个请求同时过期时只跳转一次，防止重复跳转/重复弹错
let redirectingToLogin = false

// 请求拦截：注入 Authorization
request.interceptors.request.use((config) => {
  const userStore = useUserStore()
  if (userStore.token) {
    config.headers.Authorization = `Bearer ${userStore.token}`
  }
  return config
})

// 响应拦截：解构 { code, data, message }，业务错误统一提示，401 跳登录
request.interceptors.response.use(
  (res) => {
    const { code, data, message } = res.data
    if (code !== 0) {
      ElMessage.error(message || '请求失败')
      return Promise.reject(new Error(message || '请求失败'))
    }
    return data
  },
  (err) => {
    const status = err.response?.status
    const message = err.response?.data?.message
    if (status === 401) {
      const userStore = useUserStore()
      const onLoginPage = window.location.pathname === '/login'
      if (onLoginPage && err.config?.url === '/auth/admin/login') {
        // 登录失败每次都提示；已跳到登录页的旧业务请求只向调用方返回错误。
        userStore.logout()
        ElMessage.error(message || '账号或密码错误')
      } else if (!onLoginPage && !redirectingToLogin) {
        redirectingToLogin = true
        userStore.logout()
        ElMessage.error(message || '登录已过期，请重新登录')
        pushLogin(window.location.pathname + window.location.search)
          .finally(() => {
            redirectingToLogin = false
          })
      }
    } else {
      ElMessage.error(message || '网络异常，请稍后重试')
    }
    // 把后端中文 message 作为错误信息抛出，页面 catch 后展示中文（原为 axios 英文错误文案）
    return Promise.reject(new Error(message || err.message))
  }
)

export default request
