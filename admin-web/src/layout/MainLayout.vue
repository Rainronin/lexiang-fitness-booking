<!-- 主布局：深色结构侧栏 + 半透明顶栏 + 页面过渡；侧栏 220px / 折叠 72px -->
<template>
  <el-container class="layout">
    <el-aside :width="isCollapse ? '72px' : '220px'" class="aside">
      <div class="brand" :class="{ collapsed: isCollapse }">
        <span class="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <span v-if="!isCollapse" class="brand-text">乐享健身</span>
      </div>

      <el-scrollbar class="menu-scroll">
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          :collapse-transition="false"
          router
          class="side-menu"
        >
          <el-menu-item
            v-for="item in visibleMenus"
            :key="item.path"
            :index="'/' + item.path"
            :aria-label="item.meta.title"
          >
            <el-icon><component :is="item.meta.icon" /></el-icon>
            <template #title>{{ item.meta.title }}</template>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>

      <div v-if="!isCollapse" class="aside-foot">
        <span class="aside-foot__dot" />
        数据实时同步 · 本地运行
      </div>
    </el-aside>

    <el-container class="body">
      <el-header class="header">
        <div class="header-left">
          <button class="collapse-btn" type="button" :aria-label="isCollapse ? '展开侧栏' : '折叠侧栏'" @click="toggleCollapse">
            <span />
            <span />
            <span />
          </button>

          <div class="header-title">
            <el-breadcrumb v-if="isSchedulePage" separator="/" class="breadcrumb">
              <el-breadcrumb-item :to="{ path: '/coaches' }">教练管理</el-breadcrumb-item>
              <el-breadcrumb-item>排班设置</el-breadcrumb-item>
            </el-breadcrumb>
            <h1 class="title">{{ currentTitle }}</h1>
          </div>
        </div>

        <div class="header-right">
          <el-dropdown trigger="click" @command="handleUserCommand">
            <button class="user-chip" type="button">
              <span class="user-avatar">{{ avatarText }}</span>
              <span class="user-meta">
                <span class="user-name">{{ userStore.user?.name || userStore.user?.username }}</span>
                <span class="user-role">{{ userStore.isAdmin ? '管理员' : '员工' }}</span>
              </span>
              <span class="user-arrow">⌄</span>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <span class="drop-id">当前账号：{{ userStore.user?.username }}</span>
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>
<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useUserStore } from '../stores/user'
import { menuRoutes } from '../router'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isCollapse = ref(false)
let mql = null

const visibleMenus = computed(() =>
  menuRoutes.filter((r) => !r.meta.hidden && r.meta.roles.includes(userStore.role))
)
const currentTitle = computed(() => route.meta.title || '')
const isSchedulePage = computed(() => /^\/coaches\/\d+\/schedule$/.test(route.path))

const avatarText = computed(() => (userStore.user?.name || userStore.user?.username || '乐')[0])

const activeMenu = computed(() => {
  if (isSchedulePage.value) return '/coaches'
  return visibleMenus.value.some((m) => `/${m.path}` === route.path) ? route.path : '/dashboard'
})

function toggleCollapse() {
  isCollapse.value = !isCollapse.value
}

function applyBreakpoint(e) {
  // 1024–1199px 默认折叠，给数据页留出更多横向空间
  isCollapse.value = e.matches
}

onMounted(() => {
  mql = window.matchMedia('(max-width: 1199px)')
  applyBreakpoint(mql)
  mql.addEventListener('change', applyBreakpoint)
})

onBeforeUnmount(() => {
  mql?.removeEventListener('change', applyBreakpoint)
})

async function handleUserCommand(command) {
  if (command !== 'logout') return
  try {
    await ElMessageBox.confirm('退出后需要重新登录才能继续使用后台。', '退出登录', {
      type: 'warning',
      confirmButtonText: '退出登录',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  userStore.logout()
  router.push('/login')
}
</script>
<style scoped>
.layout { height: 100%; background: var(--lx-bg); }

/* ---------- 侧栏：深色只承担结构导航 ---------- */
.aside {
  background: var(--lx-nav);
  display: flex;
  flex-direction: column;
  transition: width 0.22s var(--lx-ease-out);
  overflow: hidden;
}

.brand {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  flex-shrink: 0;
  color: #fff;
}

.brand.collapsed { padding: 0; justify-content: center; }

.brand-text {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.brand-mark { width: 30px; height: 30px; position: relative; flex-shrink: 0; }

.brand-mark i {
  position: absolute;
  left: 4px;
  height: 2px;
  border-radius: 2px;
  background: #fff;
  transform-origin: left center;
}

.brand-mark i:nth-child(1) { top: 7px; width: 15px; transform: rotate(-16deg); }
.brand-mark i:nth-child(2) { top: 15px; width: 22px; }
.brand-mark i:nth-child(3) { top: 23px; width: 13px; transform: rotate(16deg); }

.brand-mark::after {
  content: '';
  position: absolute;
  right: 2px;
  top: 13px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--lx-coral);
  box-shadow: 0 0 0 3px rgba(255, 107, 74, 0.18);
}

.menu-scroll { flex: 1; min-height: 0; }

.side-menu {
  --el-menu-bg-color: transparent;
  --el-menu-text-color: #9da1a8;
  --el-menu-active-color: #fff;
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.06);
  border-right: none;
  padding: 8px 12px;
}

.side-menu :deep(.el-menu-item) {
  height: 46px;
  border-radius: 12px;
  margin-bottom: 4px;
  position: relative;
  /* 菜单是导航不是内容：禁止选中文本；同时抑制浏览器「使用文本光标浏览页面」(caret browsing) 在标签上显示闪烁光标 */
  user-select: none;
  -webkit-user-select: none;
  transition: background-color 0.18s var(--lx-ease-out), color 0.18s var(--lx-ease-out);
}

.side-menu :deep(.el-menu-item:hover) { background: rgba(255, 255, 255, 0.07); }

.side-menu :deep(.el-menu-item.is-active) {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-weight: 600;
}

/* 选中态只保留浅色圆角底板 + 白色加粗（原「左侧强调线」视觉上被误读为文本光标，已移除） */

.side-menu :deep(.el-icon) { font-size: 18px; }

.aside-foot {
  padding: 14px 20px 18px;
  color: #666a70;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}

.aside-foot__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--lx-success); }
/* ---------- 顶栏：浅色毛玻璃 ---------- */
.body { min-width: 0; }

.header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(245, 245, 247, 0.82);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--lx-line-soft);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .header { background: rgba(245, 245, 247, 0.96); }
}

.header-left { display: flex; align-items: center; gap: 16px; min-width: 0; }

.collapse-btn {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: background-color 0.16s var(--lx-ease-out), transform 0.12s var(--lx-ease-out);
}

.collapse-btn:hover { background: rgba(0, 0, 0, 0.05); }
.collapse-btn:active { transform: scale(0.94); }
.collapse-btn:focus-visible { outline: 2px solid var(--lx-brand); outline-offset: 2px; }

.collapse-btn span {
  display: block;
  width: 16px;
  height: 2px;
  border-radius: 2px;
  background: var(--lx-text-2);
}

.header-title { min-width: 0; }

.title { font-size: 17px; font-weight: 700; line-height: 1.3; color: var(--lx-text); }
.breadcrumb { margin-bottom: 2px; }

.header-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 4px 10px 4px 6px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.18s var(--lx-ease-out), transform 0.12s var(--lx-ease-out);
}

.user-chip:hover { background: rgba(0, 0, 0, 0.05); }
.user-chip:active { transform: scale(0.98); }
.user-chip:focus-visible { outline: 2px solid var(--lx-brand); outline-offset: 2px; }

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lx-brand);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.user-meta { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.2; }
.user-name { color: var(--lx-text); font-size: 13px; font-weight: 600; }
.user-role { color: var(--lx-text-3); font-size: 11px; }
.user-arrow { color: var(--lx-text-3); font-size: 14px; line-height: 1; }
.drop-id { color: var(--lx-text-2); font-size: 12px; }
/* ---------- 主内容 ---------- */
.main { padding: 24px; overflow-x: hidden; }

@media (max-width: 1439px) {
  .main { padding: 20px; }
}

@media (max-width: 1199px) {
  .main { padding: 16px; }
  .header { padding: 0 16px; }
  .user-meta { display: none; }
}
</style>
