<!-- 登录页：浅色空间 + 深色运动轨迹背景面，账号密码登录后淡出进入工作台 -->
<template>
  <div class="login-page" :class="{ leaving }">
    <section class="showcase" aria-label="平台能力">
      <div class="showcase-inner">
        <div class="showcase-brand">
          <span class="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>乐享健身</span>
        </div>
        <h2 class="showcase-title">让每一节课，<br />都有清晰的预约节奏。</h2>
        <div class="showcase-keywords">
          <span>预约</span><i /><span>排班</span><i /><span>营收</span>
        </div>
        <p class="showcase-note">轻盈系统 × 训练节奏 · 本地运行</p>
      </div>
    </section>

    <section class="form-side">
      <div class="login-card">
        <div class="card-head">
          <h1 class="card-title">登录管理后台</h1>
          <p class="card-sub">使用管理员或员工账号继续</p>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large" @keyup.enter="handleLogin">
          <el-form-item label="账号" prop="username">
            <el-input v-model="form.username" placeholder="请输入账号" autocomplete="username" :prefix-icon="User" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              show-password
              autocomplete="current-password"
              :prefix-icon="Lock"
            />
          </el-form-item>
          <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleLogin">
            {{ loading ? '正在登录...' : '登录后台' }}
          </el-button>
        </el-form>

        <div class="demo-area">
          <div class="demo-title">演示账号（点击复制）</div>
          <div class="demo-list">
            <button type="button" class="demo-chip" @click="copyAccount('admin / 123456')">
              <span class="demo-role">管理员</span>
              <code>admin / 123456</code>
            </button>
            <button type="button" class="demo-chip" @click="copyAccount('staff / 123456')">
              <span class="demo-role">员工</span>
              <code>staff / 123456</code>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)
const leaving = ref(false)
const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function copyAccount(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // 非安全上下文回退：用临时输入框复制
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  ElMessage.success(`已复制：${text}`)
}

async function handleLogin() {
  if (loading.value) return // 防重复提交（loading 期间回车可绕过按钮禁用）
  try {
    await formRef.value.validate()
  } catch {
    return // 校验失败
  }
  loading.value = true
  try {
    await userStore.login({ ...form })
    ElMessage.success('登录成功')
    // redirect 仅接受站内字符串路径（防数组/外部地址导致的跳转异常）
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/dashboard'
    // 登录卡轻微淡出后再进入工作台，减少突然跳转感
    leaving.value = true
    setTimeout(() => router.push(redirect), 240)
  } catch {
    /* 错误已由拦截器提示 */
  } finally {
    loading.value = false
  }
}
</script>
<style scoped>
.login-page {
  min-height: 100%;
  display: grid;
  grid-template-columns: minmax(380px, 0.9fr) minmax(480px, 1.1fr);
  background: var(--lx-bg);
  transition: opacity 0.24s var(--lx-ease-in);
}

.login-page.leaving {
  opacity: 0;
  transform: scale(0.995);
}

/* 深色运动轨迹背景面 */
.showcase {
  background:
    radial-gradient(circle at 18% 20%, rgba(255, 107, 74, 0.14), transparent 32%),
    radial-gradient(circle at 82% 76%, rgba(0, 122, 255, 0.18), transparent 34%),
    var(--lx-nav);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  overflow: hidden;
  position: relative;
}

.showcase::before,
.showcase::after {
  content: '';
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.showcase::before { width: 520px; height: 520px; right: -180px; top: -160px; }
.showcase::after { width: 300px; height: 300px; left: -120px; bottom: -110px; }

.showcase-inner {
  position: relative;
  z-index: 1;
  max-width: 430px;
}

.showcase-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.brand-mark {
  width: 34px;
  height: 34px;
  position: relative;
  display: inline-block;
}

.brand-mark i {
  position: absolute;
  left: 5px;
  height: 2px;
  border-radius: 2px;
  background: #fff;
  transform-origin: left center;
}

.brand-mark i:nth-child(1) { top: 8px; width: 16px; transform: rotate(-16deg); }
.brand-mark i:nth-child(2) { top: 17px; width: 24px; }
.brand-mark i:nth-child(3) { top: 26px; width: 14px; transform: rotate(16deg); }

.brand-mark::after {
  content: '';
  position: absolute;
  right: 0;
  top: 15px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--lx-coral);
  box-shadow: 0 0 0 4px rgba(255, 107, 74, 0.16);
}

.showcase-title {
  margin-top: 44px;
  font-size: 40px;
  line-height: 1.22;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.showcase-keywords {
  margin-top: 40px;
  display: flex;
  align-items: center;
  gap: 14px;
  color: rgba(255, 255, 255, 0.88);
  font-size: 15px;
  font-weight: 600;
}

.showcase-keywords i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--lx-coral);
}

.showcase-note {
  margin-top: 26px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
}

/* 登录卡 */
.form-side {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.login-card {
  width: 420px;
  max-width: 100%;
  background: var(--lx-surface);
  border: 1px solid var(--lx-line-soft);
  border-radius: var(--lx-radius-xl);
  padding: 36px 36px 28px;
  box-shadow: var(--lx-shadow-1);
}

.card-head { margin-bottom: 26px; }

.card-title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.card-sub {
  margin-top: 6px;
  color: var(--lx-text-2);
  font-size: 13px;
}

.login-btn {
  width: 100%;
  height: 48px;
  margin-top: 8px;
  border-radius: var(--lx-radius-md);
  font-size: 15px;
}

.demo-area {
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px solid var(--lx-line-soft);
}

.demo-title {
  font-size: 12px;
  color: var(--lx-text-3);
  margin-bottom: 10px;
}

.demo-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.demo-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 9px 10px;
  border: 1px solid var(--lx-line-soft);
  border-radius: var(--lx-radius-sm);
  background: var(--lx-bg);
  color: var(--lx-text);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s var(--lx-ease-out), background-color 0.16s var(--lx-ease-out),
    transform 0.12s var(--lx-ease-out);
}

.demo-chip:hover { border-color: rgba(0, 122, 255, 0.35); background: var(--lx-brand-soft); }
.demo-chip:active { transform: scale(0.98); }
.demo-chip:focus-visible { outline: 2px solid var(--lx-brand); outline-offset: 2px; }

.demo-role { font-size: 11px; color: var(--lx-text-2); }
.demo-chip code { font-size: 12px; color: var(--lx-brand-deep); }

@media (max-width: 960px) {
  .login-page { grid-template-columns: 1fr; }
  .showcase { display: none; }
}
</style>
