// 登录态：token + 用户信息，uni storage 持久化（刷新不丢）
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: uni.getStorageSync('lexiang_token') || '',
    user: uni.getStorageSync('lexiang_user') || null
  }),
  getters: {
    // 以 state.token 为响应式依赖，并回退 storage：登录后立即更新，过期清除后也能同步感知
    isLogin: (state) => !!state.token || !!uni.getStorageSync('lexiang_token')
  },
  actions: {
    setLogin(token, user) {
      this.token = token
      this.user = user
      uni.setStorageSync('lexiang_token', token)
      uni.setStorageSync('lexiang_user', user)
    },
    logout() {
      this.token = ''
      this.user = null
      uni.removeStorageSync('lexiang_token')
      uni.removeStorageSync('lexiang_user')
    }
  }
})
