// 运行：node scripts/check-401.js（Node.js 24）；真实 Axios 拦截器 + 可控响应和导航。
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { setImmediate as nextTurn } from 'node:timers/promises'
import axios from 'axios'

const messages = []
const navigations = []
let finishNavigation
let logoutCount = 0
const user = { token: '过期令牌', logout() { this.token = ''; logoutCount++ } }
globalThis.window = { location: { pathname: '/dashboard', search: '?range=week', href: '' } }
// 仅替换依赖浏览器的提示、状态容器和路由；执行原始请求模块及 Axios 请求链。
globalThis.__check401 = {
  ElMessage: { error: (message) => messages.push(message) },
  useUserStore: () => user,
  router: { push: (target) => {
    navigations.push(target)
    return new Promise((resolve, reject) => {
      finishNavigation = (error) => {
        if (error) reject(error)
        else { window.location.pathname = '/login'; resolve() }
      }
    })
  } }
}
const replacements = {
  'element-plus': 'export const ElMessage = globalThis.__check401.ElMessage',
  '../stores/user': 'export const useUserStore = globalThis.__check401.useUserStore',
  '../router': 'export default globalThis.__check401.router'
}
registerHooks({ resolve(specifier, context, nextResolve) {
  if (context.parentURL === new URL('../src/api/request.js', import.meta.url).href && replacements[specifier]) {
    return { url: `data:text/javascript,${encodeURIComponent(replacements[specifier])}`, shortCircuit: true }
  }
  return nextResolve(specifier, context)
} })
const { default: request } = await import('../src/api/request.js')
request.defaults.adapter = (config) => {
  const status = config.url === '/forbidden' ? 403 : 401
  const message = config.url === '/auth/admin/login' ? '账号或密码错误' : status === 403 ? '仅管理员可操作' : '登录已过期'
  return Promise.reject(new axios.AxiosError(message, 'ERR_BAD_REQUEST', config, null, {
    status, data: { code: status, message }, config, headers: {}, statusText: ''
  }))
}

const results = await Promise.allSettled([
  request.get('/members'), request.get('/courses'), request.get('/stats/dashboard')
])
await nextTurn()
assert.equal(results.filter((r) => r.status === 'rejected').length, 3, '每个失败请求都应拒绝')
assert.equal(messages.length, 1, '并发 401 应只提示一次')
assert.equal(logoutCount, 1, '并发 401 应只登出一次')
assert.deepEqual(navigations, [{ path: '/login', query: { redirect: '/dashboard?range=week' } }], '只跳转一次并保留原地址')
assert.equal(user.token, '', '失效令牌应被清除')

await assert.rejects(request.get('/coaches'), /登录已过期/)
await nextTurn()
assert.equal(navigations.length, 1, '导航未完成时不得提前解除防重')
assert.equal(messages.length, 1, '导航期间迟到的 401 不得重复提示')
finishNavigation()
await nextTurn()
await assert.rejects(request.get('/rules'), /登录已过期/)
assert.equal(messages.length, 1, '到达登录页后的旧请求不得重复提示')

for (let i = 0; i < 2; i++) {
  await assert.rejects(request.post('/auth/admin/login', { username: 'admin', password: 'wrong' }), /账号或密码错误/)
}
assert.deepEqual(messages.slice(1), ['账号或密码错误', '账号或密码错误'], '每次登录失败仍应提示')
assert.equal(navigations.length, 1, '登录失败不应再次跳转')

user.token = '重新登录后的令牌'
window.location.pathname = '/members'
await assert.rejects(request.get('/members'), /登录已过期/)
await nextTurn()
assert.equal(navigations.length, 2, '重新登录后再次过期应能触发新一轮处理')
assert.equal(messages.length, 4, '新一轮过期应重新提示')
finishNavigation(new Error('导航失败'))
await nextTurn()
assert.equal(window.location.href, '/login', '导航拒绝时应回退到登录页')
await assert.rejects(request.get('/forbidden'), /仅管理员可操作/)
assert.equal(messages.at(-1), '仅管理员可操作', '非 401 错误提示应保持正常')
console.log('401 回归通过：并发防重、导航等待、迟到响应、登录重试、再次过期、导航失败回退、非 401 提示')
