<!-- 我的：浅色资料卡 + 今日签到状态 + 日期点阵签到记录 + 低优先级退出 -->
<template>
  <view class="lx-page my-page">
    <!-- 用户信息：浅色资料卡 -->
    <view class="profile-card">
      <view v-if="userStore.isLogin" class="profile-row">
        <view class="avatar">{{ (userStore.user?.nickname || '会')[0] }}</view>
        <view class="profile-info">
          <view class="nickname">{{ userStore.user?.nickname || '会员' }}</view>
          <view class="phone num">{{ maskPhone(userStore.user?.phone) }}</view>
        </view>
        <view class="member-badge">会员</view>
      </view>
      <view v-else class="profile-row login-entry lx-pressable" @click="goLogin">
        <view class="avatar avatar-empty">未</view>
        <view class="profile-info">
          <view class="nickname">点击登录</view>
          <view class="phone">登录后可预约课程并每日签到</view>
        </view>
        <view class="login-arrow">›</view>
      </view>
    </view>

    <!-- 每日签到 -->
    <view v-if="userStore.isLogin" class="card signin-card">
      <view class="signin-head">
        <view>
          <view class="section-title">每日签到</view>
          <view class="signin-sub">
            <text class="today-dot" :class="{ signed: signedToday }" />
            {{ signedToday ? '今日已签到，明天继续保持' : '今天还没有签到，来打卡吧' }}
          </view>
        </view>
        <button
          class="signin-btn"
          :class="{ signed: signedToday, pop: justSigned }"
          :disabled="signedToday || signing"
          @click="handleSignin"
        >
          {{ signedToday ? '今日已签到' : signing ? '签到中...' : '签到' }}
        </button>
      </view>

      <view v-if="signRecords.length" class="sign-grid">
        <view v-for="d in signRecords" :key="d" class="sign-day">
          <text class="sign-day__num num">{{ dayOfMonth(d) }}</text>
          <text class="sign-day__mark">已签</text>
        </view>
      </view>
      <view v-else class="empty-tip">还没有签到记录，从今天开始积累吧</view>
    </view>

    <!-- 退出：页面底部，低视觉优先级 -->
    <view v-if="userStore.isLogin" class="logout-area">
      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </view>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { signinApi } from '../../api'
import { useUserStore } from '../../stores/user'
import { localDateStr } from '../../utils/date'

const userStore = useUserStore()
const signedToday = ref(false)
const signRecords = ref([])
const signing = ref(false)
const justSigned = ref(false)
let popTimer = null

const maskPhone = (p) => (p ? p.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2') : '')
const dayOfMonth = (d) => Number(String(d).slice(-2))

function goLogin() {
  uni.navigateTo({ url: '/pages/login/index' })
}

async function loadSignin() {
  if (!userStore.isLogin) {
    signRecords.value = []
    signedToday.value = false
    return
  }
  try {
    const list = await signinApi.list()
    signRecords.value = list.slice(0, 30)
    signedToday.value = list.includes(localDateStr())
  } catch {
    // 错误提示已由 request 封装处理
  }
}

async function handleSignin() {
  if (signedToday.value || signing.value) return
  signing.value = true
  try {
    await signinApi.sign()
    justSigned.value = true
    if (popTimer) clearTimeout(popTimer)
    popTimer = setTimeout(() => {
      justSigned.value = false
    }, 600)
    uni.showToast({ title: '签到成功', icon: 'success' })
    loadSignin()
  } catch {
    /* 已签到等情况提示由封装处理 */
  } finally {
    signing.value = false
  }
}

function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定退出当前账号吗？退出后需要重新登录才能预约课程。',
    confirmText: '退出登录',
    cancelText: '取消',
    confirmColor: '#E5484D',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.showToast({ title: '已退出登录', icon: 'none' })
        loadSignin()
      }
    }
  })
}

onShow(loadSignin)

onUnload(() => {
  if (popTimer) clearTimeout(popTimer)
})
</script>
<style lang="scss" scoped>
.my-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 48rpx;
}

/* 浅色资料卡 */
.profile-card {
  background: $lx-surface;
  border: 1rpx solid $lx-line-soft;
  border-radius: $lx-radius-xl;
  box-shadow: $lx-shadow-1;
  padding: 36rpx 32rpx;
  position: relative;
  overflow: hidden;
}

.profile-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.avatar {
  width: 116rpx;
  height: 116rpx;
  border-radius: 50%;
  background: $lx-brand;
  color: #fff;
  font-size: 48rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.22);
}

.avatar-empty {
  background: $lx-surface-2;
  color: $lx-text-3;
  font-size: 26rpx;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.nickname {
  font-size: 36rpx;
  font-weight: 700;
  color: $lx-text;
}

.phone {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $lx-text-2;
}

.member-badge {
  font-size: 22rpx;
  font-weight: 600;
  color: $lx-brand-deep;
  background: $lx-brand-soft;
  border-radius: $lx-radius-pill;
  padding: 8rpx 18rpx;
}

.login-arrow {
  font-size: 48rpx;
  color: $lx-text-3;
}

/* 签到 */
.card {
  margin: 24rpx 0 0;
}

.signin-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.signin-sub {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 24rpx;
  color: $lx-text-2;
}

.today-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: $lx-text-3;
}

.today-dot.signed { background: $lx-success; }

.signin-btn {
  margin: 0;
  min-width: 176rpx;
  height: 68rpx;
  line-height: 68rpx;
  padding: 0 30rpx;
  border-radius: $lx-radius-pill;
  background: $lx-brand;
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}

.signin-btn.signed {
  background: $lx-success-soft;
  color: #1f9d58;
}

.signin-btn:active {
  background: $lx-brand-deep;
  transform: scale(0.95);
}

.signin-btn.pop {
  animation: sign-pop 0.48s $lx-ease-spring;
}

@keyframes sign-pop {
  0% { transform: scale(0.94); }
  55% { transform: scale(1.04); }
  100% { transform: scale(1); }
}

/* 签到记录：整齐日期点阵 */
.sign-grid {
  margin-top: 28rpx;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14rpx;
}

.sign-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  background: $lx-bg;
  border-radius: $lx-radius-sm;
  padding: 14rpx 0;
}

.sign-day__num {
  font-size: 28rpx;
  font-weight: 700;
  color: $lx-text;
}

.sign-day__mark {
  font-size: 20rpx;
  color: #1f9d58;
}

/* 退出 */
.logout-area {
  margin-top: 40rpx;
  padding: 0 40rpx;
}

.logout-btn {
  margin: 0;
  height: 80rpx;
  line-height: 78rpx;
  background: transparent;
  color: $lx-text-2;
  font-size: 26rpx;
  border: 1rpx solid $lx-line-soft;
  border-radius: $lx-radius-pill;
}

.logout-btn:active {
  color: $lx-danger;
  border-color: rgba(229, 72, 77, 0.45);
  background: $lx-danger-soft;
}
</style>
