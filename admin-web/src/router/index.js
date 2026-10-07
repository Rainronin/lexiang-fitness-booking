// 路由配置：动态菜单按角色渲染 + 路由守卫权限控制
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'
import { authApi } from '../api'

// 菜单配置集中在此，侧边栏与守卫共用 meta.roles
export const menuRoutes = [
  { path: 'dashboard', name: 'Dashboard', component: () => import('../views/dashboard/DashboardView.vue'), meta: { title: '工作台', icon: 'Odometer', roles: ['admin', 'staff'] } },
  { path: 'members', name: 'Members', component: () => import('../views/members/MembersView.vue'), meta: { title: '会员管理', icon: 'User', roles: ['admin', 'staff'] } },
  { path: 'courses', name: 'Courses', component: () => import('../views/courses/CoursesView.vue'), meta: { title: '课程管理', icon: 'Notebook', roles: ['admin', 'staff'] } },
  { path: 'coaches', name: 'Coaches', component: () => import('../views/coaches/CoachesView.vue'), meta: { title: '教练管理', icon: 'Avatar', roles: ['admin', 'staff'] } },
  { path: 'coaches/:id/schedule', name: 'CoachSchedule', component: () => import('../views/coaches/CoachScheduleView.vue'), meta: { title: '排班设置', hidden: true, roles: ['admin', 'staff'] } },
  { path: 'bookings', name: 'Bookings', component: () => import('../views/bookings/BookingsView.vue'), meta: { title: '预约管理', icon: 'Calendar', roles: ['admin', 'staff'] } },
  { path: 'rules', name: 'Rules', component: () => import('../views/rules/RulesView.vue'), meta: { title: '预约规则', icon: 'SetUp', roles: ['admin'] } },
  { path: 'revenue', name: 'Revenue', component: () => import('../views/revenue/RevenueView.vue'), meta: { title: '营收统计', icon: 'TrendCharts', roles: ['admin'] } }
]

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'Login', component: () => import('../views/login/LoginView.vue'), meta: { public: true } },
    {
      path: '/',
      component: () => import('../layout/MainLayout.vue'),
      redirect: '/dashboard',
      children: menuRoutes
    },
    { path: '/403', name: 'Forbidden', component: () => import('../views/error/ForbiddenView.vue'), meta: { public: true } },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
  ]
})

// 路由守卫：无 token → 登录页；角色不匹配 → 403；已登录访问登录页 → 工作台
router.beforeEach(async (to) => {
  const userStore = useUserStore()
  if (to.meta.public) {
    if (to.path === '/login' && userStore.token) return '/dashboard'
    return true
  }
  if (!userStore.token) return { path: '/login', query: { redirect: to.fullPath } }
  // A-M2：有 token 无用户信息（localStorage 部分丢失/后端 reseed 后用户变化）：调 me() 回填，失败则登出
  if (!userStore.user) {
    try {
      const me = await authApi.me()
      userStore.user = { id: me.id, username: me.username, name: me.name, role: me.role }
    } catch {
      userStore.logout()
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }
  if (to.meta.roles && !to.meta.roles.includes(userStore.role)) return '/403'
  return true
})

export default router
