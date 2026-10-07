// 用户状态：token + 用户信息，持久化到 localStorage（刷新不丢登录态）
import { defineStore } from 'pinia'
import { authApi } from '../api'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    user: null
  }),
  getters: {
    role: (state) => state.user?.role || '',
    isAdmin: (state) => state.user?.role === 'admin'
  },
  actions: {
    async login(form) {
      const data = await authApi.login(form)
      this.token = data.token
      this.user = data.user
      return data.user
    },
    logout() {
      this.token = ''
      this.user = null
    }
  },
  persist: { key: 'lexiang_admin_store' }
})
