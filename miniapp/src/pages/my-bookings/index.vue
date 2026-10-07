<!-- 我的预约：固定状态 Tab（滑动指示条）+ 时间优先的预约卡片 + 分状态空态 -->
<template>
  <view class="lx-page bookings-page">
    <view class="tab-wrap">
      <view class="tab-track">
        <view
          class="tab-indicator"
          :style="{ transform: `translateX(${activeIndex * 100}%)` }"
          aria-hidden="true"
        />
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="switchTab(tab.key)"
        >
          {{ tab.label }}
        </view>
      </view>
    </view>

    <!-- 骨架 -->
    <view v-if="loading" class="skeleton-list">
      <view v-for="i in 3" :key="i" class="card skeleton-card">
        <view class="lx-skeleton" style="height: 36rpx; width: 46%" />
        <view class="lx-skeleton" style="height: 28rpx; width: 72%; margin-top: 20rpx" />
        <view class="lx-skeleton" style="height: 28rpx; width: 40%; margin-top: 14rpx" />
      </view>
    </view>

    <!-- 错误 -->
    <view v-else-if="loadError" class="lx-empty">
      <view class="lx-empty__graphic" />
      <view class="lx-empty__title">预约加载失败</view>
      <view class="lx-empty__desc">网络异常，请稍后重新加载。</view>
      <view class="lx-empty__action" @click="load">重新加载</view>
    </view>

    <!-- 分状态空态 -->
    <view v-else-if="!list.length" class="lx-empty">
      <view class="lx-empty__graphic" />
      <view class="lx-empty__title">{{ emptyCopy[currentLabel]?.title }}</view>
      <view class="lx-empty__desc">{{ emptyCopy[currentLabel]?.desc }}</view>
      <view v-if="activeTab === 'upcoming'" class="lx-empty__action" @click="goHome">去选课</view>
    </view>

    <!-- 预约卡片 -->
    <view v-else class="booking-list">
      <view
        v-for="b in list"
        :key="b.id"
        class="card booking-card"
        :class="`is-${b.display_status}`"
      >
        <view class="b-time">
          <view>
            <text class="b-date">{{ b.booking_date }} · {{ weekdayLabel(b.booking_date) }}</text>
            <text class="b-slot num">{{ b.time_slot }}</text>
          </view>
          <text class="b-status" :class="b.display_status">{{ statusText(b.display_status) }}</text>
        </view>

        <view class="b-course">
          <text class="b-course__name">{{ b.course_name }}</text>
          <text class="b-coach">教练：{{ b.coach_name }}</text>
        </view>

        <view class="b-foot">
          <text class="b-price num">¥{{ b.price }}</text>
          <button
            v-if="b.display_status === 'confirmed'"
            class="cancel-btn"
            :class="{ disabled: !canCancel(b) }"
            :disabled="!canCancel(b)"
            @click="handleCancel(b)"
          >
            {{ canCancel(b) ? '取消预约' : '距开课不足2小时' }}
          </button>
          <text v-else class="b-foot__hint">{{ footHint(b.display_status) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { bookingApi } from '../../api'

const tabs = [
  { key: 'upcoming', label: '待上课' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' }
]

const emptyCopy = {
  待上课: { title: '还没有待上课的预约', desc: '去首页选一门喜欢的课程，开始训练节奏。' },
  已完成: { title: '还没有已完成的预约', desc: '完成课程后，记录会出现在这里。' },
  已取消: { title: '没有已取消的预约', desc: '取消的预约会保留记录，方便核对。' }
}

const activeTab = ref('upcoming')
const list = ref([])
const loading = ref(true)
const loadError = ref(false)

const activeIndex = computed(() => tabs.findIndex((t) => t.key === activeTab.value))
const currentLabel = computed(() => tabs.find((t) => t.key === activeTab.value)?.label || '')

const statusText = (s) => ({ confirmed: '待上课', completed: '已完成', cancelled: '已取消' }[s] || s)
const footHint = (s) => (s === 'cancelled' ? '预约已释放名额' : '课程已完成')

function weekdayLabel(dateStr) {
  if (!dateStr) return ''
  const d = new Date(String(dateStr).replace(/-/g, '/'))
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()] || ''
}

// 开课前 > 2 小时才可取消（与后端规则一致）
function canCancel(b) {
  const start = new Date(`${b.booking_date.replace(/-/g, '/')} ${b.time_slot.split('-')[0]}:00`)
  return start.getTime() - Date.now() > 2 * 3600 * 1000
}

async function load() {
  const tab = activeTab.value // 快照：切 tab 后丢弃过期响应，防竞态
  loading.value = true
  loadError.value = false
  try {
    const data = await bookingApi.list(tab)
    if (tab !== activeTab.value) return
    list.value = data
  } catch {
    if (tab === activeTab.value) loadError.value = true
  } finally {
    if (tab === activeTab.value) loading.value = false
  }
}

function switchTab(key) {
  if (activeTab.value === key) return
  activeTab.value = key
  load()
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function handleCancel(b) {
  uni.showModal({
    title: '取消预约',
    content: `确定取消 ${b.booking_date} ${b.time_slot} 的「${b.course_name}」吗？取消后该时段名额将释放。`,
    confirmText: '确认取消',
    cancelText: '保留预约',
    confirmColor: '#E5484D',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await bookingApi.cancel(b.id)
        uni.showToast({ title: '预约已取消', icon: 'success' })
        load()
      } catch {
        /* 提示已由封装处理（如开课前 2 小时内不可取消） */
      }
    }
  })
}

onShow(load)
</script>
<style lang="scss" scoped>
.bookings-page { min-height: 100vh; padding-bottom: 40rpx; }

/* 固定 Tab + 滑动指示条 */
.tab-wrap {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(245, 245, 247, 0.94);
  border-bottom: 1rpx solid $lx-line-soft;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.tab-track {
  position: relative;
  display: flex;
  height: 88rpx;
}

.tab-indicator {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 33.333%;
  height: 6rpx;
  border-radius: 6rpx 6rpx 0 0;
  background: $lx-brand;
  transition: transform 0.24s $lx-ease-out;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: $lx-text-2;
  transition: color 0.2s $lx-ease-out;
}

.tab-item.active {
  color: $lx-brand;
  font-weight: 700;
}

/* 骨架 */
.skeleton-list { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.skeleton-card { margin: 0; }

/* 预约卡片：时间优先，状态次之 */
.booking-list { padding: 24rpx 24rpx 0; display: flex; flex-direction: column; gap: 20rpx; }

.booking-card {
  margin: 0;
  border: 1rpx solid $lx-line-soft;
}

.b-time {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.b-date {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: $lx-text;
}

.b-slot {
  display: inline-block;
  margin-top: 10rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: $lx-brand;
  background: $lx-brand-soft;
  border-radius: $lx-radius-sm;
  padding: 6rpx 16rpx;
}

.b-status {
  font-size: 22rpx;
  font-weight: 600;
  border-radius: $lx-radius-pill;
  padding: 8rpx 18rpx;
  flex-shrink: 0;
}

.b-status.confirmed { color: $lx-brand-deep; background: $lx-brand-soft; }
.b-status.completed { color: $lx-text-2; background: $lx-surface-2; }
.b-status.cancelled { color: $lx-danger; background: $lx-danger-soft; }

.b-course {
  margin-top: 24rpx;
  padding: 20rpx 0;
  border-top: 1rpx solid $lx-line-soft;
  border-bottom: 1rpx solid $lx-line-soft;
  display: flex;
  flex-direction: column;
}

.b-course__name {
  font-size: 28rpx;
  font-weight: 600;
  color: $lx-text;
}

.b-coach {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: $lx-text-2;
}

.b-foot {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.b-price {
  font-size: 30rpx;
  font-weight: 700;
  color: $lx-coral;
}

.b-foot__hint {
  font-size: 22rpx;
  color: $lx-text-3;
}

.cancel-btn {
  margin: 0;
  min-width: 200rpx;
  height: 60rpx;
  line-height: 58rpx;
  font-size: 24rpx;
  color: $lx-text-2;
  background: transparent;
  border: 1rpx solid rgba(60, 60, 67, 0.28);
  border-radius: $lx-radius-pill;
  padding: 0 26rpx;
}

.cancel-btn.disabled {
  color: $lx-text-3;
  border-color: $lx-line-soft;
  background: $lx-surface-2;
}

.cancel-btn:active {
  transform: scale(0.96);
  border-color: $lx-brand;
  color: $lx-brand;
}

.cancel-btn.disabled:active {
  transform: none;
  border-color: $lx-line-soft;
  color: $lx-text-3;
}

/* 已完成 / 已取消降低饱和度，但保留内容对比度 */
.booking-card.is-completed,
.booking-card.is-cancelled {
  background: #fbfbfc;
}

.booking-card.is-cancelled .b-date,
.booking-card.is-completed .b-date {
  color: $lx-text-2;
}
</style>
