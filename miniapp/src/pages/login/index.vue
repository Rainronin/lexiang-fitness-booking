<!-- 登录：简洁品牌字标 + 抽象训练轨迹 + 固定标签字段 + 演示验证码说明 -->
<template>
  <view class="lx-page login-page">
    <view class="brand-area">
      <view class="brand-mark" aria-hidden="true">
        <view class="track track-1" />
        <view class="track track-2" />
        <view class="track track-3" />
        <view class="track-dot" />
      </view>
      <text class="brand-name">乐享健身</text>
      <text class="brand-slogan">轻盈系统 × 训练节奏</text>
    </view>

    <view class="login-card">
      <view class="card-title">登录会员端</view>
      <view class="card-sub">登录后可预约课程、查看订单并每日签到</view>

      <view class="field" :class="{ focused: phoneFocus }">
        <text class="field-label">手机号</text>
        <input
          ref="phoneInput"
          v-model="phone"
          type="text"
          inputmode="numeric"
          maxlength="11"
          aria-label="手机号"
          :focus="phoneFocus"
          placeholder="请输入 11 位手机号"
          class="input num"
          @focus="phoneFocus = true"
          @blur="phoneFocus = false"
        />
      </view>

      <view class="field code-field" :class="{ focused: codeFocus }">
        <view class="code-input">
          <text class="field-label">验证码</text>
          <input
            ref="codeInput"
            v-model="code"
            type="text"
            inputmode="numeric"
            maxlength="6"
            aria-label="验证码"
            :focus="codeFocus"
            placeholder="请输入 6 位验证码"
            class="input num"
            @focus="codeFocus = true"
            @blur="codeFocus = false"
          />
        </view>
        <button class="code-btn" :class="{ disabled: counting > 0 }" :disabled="counting > 0" @click="handleSendCode">
          {{ counting > 0 ? `${counting}s 后重发` : '获取验证码' }}
        </button>
      </view>

      <view class="demo-code">
        <text class="demo-code__mark">演示</text>
        <text>模拟验证码固定为 123456</text>
      </view>

      <button class="login-btn" :class="{ disabled: loading }" :loading="loading" :disabled="loading" @click="handleLogin">
        {{ loading ? '正在登录...' : '登录' }}
      </button>
      <view class="tip">首次登录将自动注册会员账号，无需额外注册</view>
    </view>
  </view>
</template>
<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import { authApi } from '../../api'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const phone = ref('')
const code = ref('')
const counting = ref(0)
const loading = ref(false)
const phoneFocus = ref(false)
const codeFocus = ref(false)
const phoneInput = ref()
const codeInput = ref()
let timer = null

// uni-app H5 会把 aria-label 放在 uni-input 外层；同步到真实 input，确保读屏焦点有名称
onMounted(async () => {
  await nextTick()
  phoneInput.value?.$el?.querySelector?.('input')?.setAttribute('aria-label', '手机号')
  codeInput.value?.$el?.querySelector?.('input')?.setAttribute('aria-label', '验证码')
})

// 页面卸载时清理倒计时定时器，防止泄漏
onUnload(() => {
  if (timer) clearInterval(timer)
})

async function handleSendCode() {
  if (!/^1\d{10}$/.test(phone.value)) {
    phoneFocus.value = true
    uni.showToast({ title: '请输入 11 位手机号', icon: 'none' })
    return
  }
  try {
    await authApi.sendCode(phone.value)
    counting.value = 60
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
      counting.value -= 1
      if (counting.value <= 0) {
        clearInterval(timer)
        timer = null
      }
    }, 1000)
  } catch {
    // 错误提示已由 request 封装处理
  }
}

async function handleLogin() {
  if (!/^1\d{10}$/.test(phone.value)) {
    phoneFocus.value = true
    uni.showToast({ title: '请输入 11 位手机号', icon: 'none' })
    return
  }
  if (!/^\d{6}$/.test(code.value)) {
    codeFocus.value = true
    uni.showToast({ title: '请输入 6 位验证码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const data = await authApi.login(phone.value, code.value)
    userStore.setLogin(data.token, data.user)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      // 从详情/确认页进入时返回原页；直接打开登录页则回首页
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.switchTab({ url: '/pages/index/index' })
      }
    }, 600)
  } catch {
    // 错误提示已由 request 封装处理
  } finally {
    loading.value = false
  }
}
</script>
<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: $lx-bg;
  padding: 72rpx 40rpx calc(48rpx + env(safe-area-inset-bottom));
}

/* 品牌区 + 抽象训练轨迹 */
.brand-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0 48rpx;
}

.brand-mark {
  width: 72rpx;
  height: 72rpx;
  position: relative;
}

.brand-mark .track {
  position: absolute;
  left: 6rpx;
  height: 5rpx;
  border-radius: 5rpx;
  background: $lx-brand;
  transform-origin: left center;
}

.brand-mark .track-1 { top: 18rpx; width: 36rpx; transform: rotate(-16deg); }
.brand-mark .track-2 { top: 36rpx; width: 56rpx; }
.brand-mark .track-3 { top: 54rpx; width: 32rpx; transform: rotate(16deg); }

.brand-mark .track-dot {
  position: absolute;
  right: 0;
  top: 32rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: $lx-coral;
  box-shadow: 0 0 0 8rpx rgba(255, 107, 74, 0.14);
}

.brand-name {
  margin-top: 20rpx;
  font-size: 44rpx;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: $lx-text;
}

.brand-slogan {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $lx-text-3;
}

/* 登录卡 */
.login-card {
  background: $lx-surface;
  border: 1rpx solid $lx-line-soft;
  border-radius: $lx-radius-xl;
  padding: 44rpx 36rpx 36rpx;
  box-shadow: $lx-shadow-1;
}

.card-title {
  font-size: 40rpx;
  font-weight: 700;
  color: $lx-text;
}

.card-sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $lx-text-2;
  margin-bottom: 36rpx;
}

.field {
  margin-bottom: 24rpx;
  border: 2rpx solid transparent;
  border-radius: $lx-radius-md;
  background: $lx-surface-2;
  padding: 16rpx 24rpx 18rpx;
  transition: background-color 0.18s $lx-ease-out, border-color 0.18s $lx-ease-out,
    box-shadow 0.18s $lx-ease-out;
}

.field.focused {
  background: $lx-surface;
  border-color: $lx-brand;
  box-shadow: 0 0 0 6rpx rgba(0, 122, 255, 0.1);
}

.field-label {
  display: block;
  font-size: 22rpx;
  font-weight: 600;
  color: $lx-text-2;
  margin-bottom: 8rpx;
}

.input {
  height: 52rpx;
  font-size: 30rpx;
  color: $lx-text;
}

.code-field {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
}

.code-input { flex: 1; min-width: 0; }

.code-btn {
  margin: 0;
  width: 200rpx;
  height: 64rpx;
  line-height: 64rpx;
  font-size: 24rpx;
  color: $lx-brand;
  background: $lx-brand-soft;
  border-radius: $lx-radius-sm;
  flex-shrink: 0;
}

.code-btn.disabled {
  color: $lx-text-3;
  background: $lx-surface-2;
}

.demo-code {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: -8rpx;
  font-size: 22rpx;
  color: $lx-text-3;
}

.demo-code__mark {
  font-size: 20rpx;
  font-weight: 700;
  color: $lx-coral;
  background: $lx-coral-soft;
  border-radius: 8rpx;
  padding: 4rpx 12rpx;
}

.login-btn {
  margin-top: 32rpx;
  height: 92rpx;
  line-height: 92rpx;
  background: $lx-brand;
  color: #fff;
  border-radius: 46rpx;
  font-size: 30rpx;
  font-weight: 700;
}

.login-btn.disabled {
  background: rgba(0, 122, 255, 0.55);
  color: rgba(255, 255, 255, 0.92);
}

.login-btn:active {
  background: $lx-brand-deep;
  transform: scale(0.97);
}

.login-btn.disabled:active {
  background: rgba(0, 122, 255, 0.55);
  transform: none;
}

.tip {
  margin-top: 20rpx;
  text-align: center;
  font-size: 22rpx;
  color: $lx-text-3;
}
</style>
