<!-- 预约确认：订单摘要结构 + 规则提示 + 底部毛玻璃操作区 + 成功动态胶囊 -->
<template>
  <view class="lx-page confirm-page">
    <view v-if="courseError" class="lx-empty">
      <view class="lx-empty__graphic" />
      <view class="lx-empty__title">课程摘要加载失败</view>
      <view class="lx-empty__desc">为避免信息错误，已禁用提交；请重试或返回重选时段。</view>
      <view class="lx-empty__action" @click="loadCourse">重新加载</view>
    </view>

    <block v-else>
      <view class="summary-card">
        <view class="summary-hero">
          <text class="summary-label">上课时间</text>
          <view class="summary-datetime">
            <text class="summary-date">{{ date }} · {{ weekLabel }}</text>
            <text class="summary-time num">{{ timeSlot }}</text>
          </view>
        </view>

        <view class="summary-divider" />

        <view class="summary-row">
          <text class="summary-label">课程</text>
          <text class="summary-value">{{ courseName || '加载中...' }}</text>
        </view>
        <view v-if="coachName" class="summary-row">
          <text class="summary-label">教练</text>
          <text class="summary-value">{{ coachName }}</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">价格</text>
          <text class="summary-value price num">¥{{ price }}</text>
        </view>
      </view>

      <view class="rule-tip">
        <view class="rule-tip__mark">i</view>
        <view class="rule-tip__text">
          <text class="rule-tip__title">取消规则</text>
          <text class="rule-tip__desc">提交后预约立即生效；开课前 2 小时内不可取消。</text>
        </view>
      </view>

      <view class="footer">
        <view class="footer-inner">
          <view class="footer-total">
            <text class="footer-total__label">合计</text>
            <text class="footer-total__value price num">¥{{ price }}</text>
          </view>

          <button
            v-if="!success"
            class="submit-btn"
            :class="{ disabled: submitting || !courseLoaded }"
            :loading="submitting"
            :disabled="submitting || !courseLoaded"
            @click="handleSubmit"
          >
            {{ submitting ? '正在提交预约' : '确认预约' }}
          </button>
          <view v-else class="lx-capsule is-success success-capsule">
            <span class="lx-capsule__dot" />
            <text>预约成功，即将跳转</text>
          </view>
        </view>
      </view>
    </block>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { bookingApi, courseApi } from '../../api'
import { parseLocalDate } from '../../utils/date'

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const courseId = ref(0)
const scheduleId = ref(0)
const date = ref('')
const timeSlot = ref('')
const courseName = ref('')
const coachName = ref('')
const price = ref(0)
const courseLoaded = ref(false)
const courseError = ref(false)
const submitting = ref(false)
const success = ref(false)
const weekLabel = ref('')

async function loadCourse() {
  courseError.value = false
  try {
    const data = await courseApi.detail(courseId.value)
    courseName.value = data.name
    price.value = data.price
    coachName.value = data.schedules?.[0]?.coach_name || ''
    courseLoaded.value = true
  } catch {
    courseName.value = '加载失败，请重试'
    courseError.value = true
  }
}

onLoad(async (options) => {
  courseId.value = Number(options?.courseId) || 0
  scheduleId.value = Number(options?.scheduleId) || 0
  date.value = options?.date || ''
  timeSlot.value = options?.timeSlot || ''
  // 参数缺失时提示并返回（防直接打开本页）
  if (!courseId.value || !scheduleId.value || !date.value || !timeSlot.value) {
    uni.showToast({ title: '课程时段已失效，请重新选择', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 600)
    return
  }
  weekLabel.value = WEEKDAYS[parseLocalDate(date.value).getDay()]
  await loadCourse()
})

async function handleSubmit() {
  if (!courseLoaded.value || submitting.value) return
  submitting.value = true
  try {
    await bookingApi.create(scheduleId.value, date.value)
    success.value = true
    // 动态胶囊停留片刻，再进入“我的预约”
    setTimeout(() => {
      uni.switchTab({ url: '/pages/my-bookings/index' })
    }, 800)
  } catch {
    /* 失败原因（名额不足/重复/超上限等）已由后端 message 提示；摘要保留可重试 */
  } finally {
    submitting.value = false
  }
}
</script>
<style lang="scss" scoped>
.confirm-page {
  min-height: 100vh;
  padding: 24rpx 24rpx calc(160rpx + env(safe-area-inset-bottom));
}

.summary-card {
  background: $lx-surface;
  border-radius: $lx-radius-xl;
  box-shadow: $lx-shadow-1;
  padding: 40rpx 32rpx 12rpx;
}

.summary-hero {
  padding-bottom: 28rpx;
}

.summary-label {
  display: block;
  font-size: 24rpx;
  color: $lx-text-3;
}

.summary-datetime {
  margin-top: 14rpx;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20rpx;
}

.summary-date {
  font-size: 38rpx;
  font-weight: 700;
  color: $lx-text;
}

.summary-time {
  font-size: 40rpx;
  font-weight: 700;
  color: $lx-brand;
}

.summary-divider {
  height: 1rpx;
  background: $lx-line-soft;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  padding: 24rpx 0;
}

.summary-row .summary-label { display: inline; }

.summary-value {
  font-size: 28rpx;
  font-weight: 600;
  color: $lx-text;
  text-align: right;
}

.price { font-size: 32rpx; color: $lx-coral; }

.rule-tip {
  margin-top: 24rpx;
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  background: $lx-brand-soft;
  border-radius: $lx-radius-md;
  padding: 22rpx 24rpx;
}

.rule-tip__mark {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: $lx-brand;
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2rpx;
}

.rule-tip__text { display: flex; flex-direction: column; }

.rule-tip__title {
  font-size: 24rpx;
  font-weight: 700;
  color: $lx-brand-deep;
}

.rule-tip__desc {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: $lx-text-2;
  line-height: 1.5;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(245, 245, 247, 0.94);
  border-top: 1rpx solid $lx-line-soft;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 -16rpx 48rpx rgba(0, 0, 0, 0.06);
}

.footer-inner {
  width: 100%;
  max-width: 912px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.footer-total {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  min-width: 0;
}

.footer-total__label {
  font-size: 24rpx;
  color: $lx-text-2;
}

.footer-total__value {
  font-size: 40rpx;
  color: $lx-coral;
}

.submit-btn {
  margin: 0;
  width: 300rpx;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  background: $lx-brand;
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.submit-btn.disabled {
  background: rgba(0, 122, 255, 0.5);
  color: rgba(255, 255, 255, 0.9);
}

.submit-btn:active {
  background: $lx-brand-deep;
  transform: scale(0.97);
}

.submit-btn.disabled:active {
  background: rgba(0, 122, 255, 0.5);
  transform: none;
}

.success-capsule {
  width: 300rpx;
  justify-content: center;
  flex-shrink: 0;
  animation: capsule-pop 0.5s $lx-ease-spring;
}

@keyframes capsule-pop {
  from { transform: scale(0.94); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
