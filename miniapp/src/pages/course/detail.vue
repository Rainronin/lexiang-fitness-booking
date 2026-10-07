<!-- 课程详情：透明到实色自定义导航 + 首屏信息 + 教练横向身份卡 + 日期轨道/时段网格 + 动态胶囊 -->
<template>
  <view class="lx-page detail-page">
    <!-- 全页错误 -->
    <view v-if="error" class="lx-empty full-error">
      <view class="lx-empty__graphic" />
      <view class="lx-empty__title">课程加载失败</view>
      <view class="lx-empty__desc">请检查网络后重新加载课程详情。</view>
      <view class="lx-empty__action" @click="load">重新加载</view>
    </view>

    <block v-else-if="course">
      <view class="hero">
        <image v-if="course.cover && !heroFailed" class="hero-cover" :src="imgUrl(course.cover)" mode="aspectFill" @error="heroFailed = true" />
        <view v-else class="hero-cover hero-placeholder">
          <text class="hero-placeholder__mark">{{ course.name?.[0] || '课' }}</text>
          <text class="hero-placeholder__cat">{{ course.category_name }}</text>
        </view>
        <view class="hero-shade" />

        <!-- 自定义导航：透明 → 半透明实色 -->
        <view class="detail-nav" :class="{ scrolled }">
          <view class="detail-nav__inner" :style="{ paddingTop: statusBarHeight + 'px' }">
            <view class="nav-back" role="button" aria-label="返回" @click="goBack">
              <text class="nav-arrow">‹</text>
            </view>
            <text v-if="scrolled" class="nav-title">{{ course.name }}</text>
            <view class="nav-balance" />
          </view>
        </view>
      </view>

      <view class="content">
        <!-- 课程信息首屏 -->
        <view class="card course-card">
          <view class="course-title-row">
            <text class="course-name">{{ course.name }}</text>
            <text class="course-price num">¥{{ course.price }}</text>
          </view>
          <view class="tag-row">
            <text class="tag">{{ course.category_name }}</text>
            <text class="tag num">{{ course.duration }}分钟</text>
            <text v-if="course.status === 'off'" class="tag is-off">已下架</text>
          </view>
          <view v-if="course.intro" class="intro">{{ course.intro }}</view>
        </view>

        <!-- 教练横向身份卡 -->
        <view v-if="coach" class="card coach-card">
          <view class="card-head">
            <text class="section-title">授课教练</text>
            <text class="card-head__hint">课程排班教练</text>
          </view>
          <view class="coach-row">
            <view class="coach-avatar">
              <image v-if="coach.coach_avatar" :src="imgUrl(coach.coach_avatar)" mode="aspectFill" />
              <text v-else>{{ coach.coach_name?.[0] || '教' }}</text>
            </view>
            <view class="coach-info">
              <text class="coach-name">{{ coach.coach_name }}</text>
              <text class="coach-title">{{ coach.coach_title || '专业教练' }}</text>
            </view>
            <view class="coach-stripe" aria-hidden="true" />
          </view>
        </view>

        <!-- 可约时段 -->
        <view class="card slot-card">
          <view class="card-head">
            <text class="section-title">选择上课时间</text>
            <text class="card-head__hint">可约至未来 {{ advanceDays }} 天</text>
          </view>

          <!-- 日期轨道 -->
          <view v-if="slotGroups.length" class="date-rail-wrap">
            <scroll-view scroll-x class="date-rail" :show-scrollbar="false">
              <view class="date-track">
                <view
                  v-for="group in slotGroups"
                  :key="group.date"
                  class="date-chip"
                  :class="{ active: selectedDate === group.date }"
                  @click="selectedDate = group.date; selectedSlot = null"
                >
                  <text class="date-chip__week">{{ group.weekLabel }}</text>
                  <text class="date-chip__day num">{{ group.dateLabel }}</text>
                </view>
              </view>
            </scroll-view>
          </view>

          <!-- 时段网格 -->
          <view v-if="slotsLoading" class="slot-skeleton">
            <view v-for="i in 6" :key="i" class="lx-skeleton slot-skeleton__item" />
          </view>
          <view v-else-if="slotsError" class="slot-error">
            <text>时段加载失败，已保留课程内容</text>
            <view class="lx-empty__action" @click="loadSlots">重试时段</view>
          </view>
          <view v-else-if="!selectedGroup || !selectedGroup.slots.length" class="slot-error">
            <text>所选日期暂无排班，换一天试试</text>
          </view>
          <view v-else class="slot-grid">
            <view
              v-for="s in selectedGroup.slots"
              :key="s.schedule_id"
              class="slot"
              :class="{
                full: s.remain <= 0,
                tight: s.remain > 0 && s.remain <= 3,
                selected: isSlotSelected(selectedGroup.date, s)
              }"
              @click="selectSlot(selectedGroup.date, s)"
            >
              <text class="slot-time num">{{ s.time_slot }}</text>
              <text class="slot-remain num">
                {{ s.remain > 0 ? `余 ${s.remain} 名` : '已满' }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 选中时段动态胶囊 + 确认入口 -->
      <view v-if="selectedSlot" class="selection-dock">
        <view class="selection-dock__inner">
          <view class="lx-capsule is-success">
            <span class="lx-capsule__dot" />
            <text class="capsule-text">
              {{ selectedSlot.label }} · 余 {{ selectedSlot.slot.remain }} 名
            </text>
          </view>
          <button class="confirm-btn" @click="goConfirm(selectedSlot.date, selectedSlot.slot)">
            确认预约
          </button>
        </view>
      </view>
    </block>

    <view v-else class="loading-page">
      <view class="lx-skeleton loading-cover" />
      <view class="card">
        <view class="lx-skeleton" style="height: 40rpx; width: 64%" />
        <view class="lx-skeleton" style="height: 30rpx; width: 44%; margin-top: 20rpx" />
      </view>
    </view>
  </view>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onLoad, onPageScroll, onShow } from '@dcloudio/uni-app'
import { courseApi, ruleApi } from '../../api'
import { imgUrl } from '../../utils/imgUrl'
import { parseLocalDate } from '../../utils/date'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const course = ref(null)
const coach = ref(null)
const slotGroups = ref([])
const error = ref(false)
const courseId = ref(0)
const advanceDays = ref(7)
const selectedDate = ref('')
const selectedSlot = ref(null)
const slotsLoading = ref(false)
const slotsError = ref(false)
const scrolled = ref(false)
const statusBarHeight = ref(0)
const heroFailed = ref(false)

const selectedGroup = computed(() => slotGroups.value.find((g) => g.date === selectedDate.value) || slotGroups.value[0])

// 本地日期（禁止 toISOString 的 UTC 偏移）
function dateStr(offset) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function groupSlots(slots) {
  const map = {}
  slots.forEach((s) => {
    if (!map[s.date]) {
      const d = parseLocalDate(s.date)
      map[s.date] = {
        date: s.date,
        weekLabel: WEEKDAYS[d.getDay()],
        dateLabel: `${d.getMonth() + 1}/${d.getDate()}`,
        slots: []
      }
    }
    map[s.date].slots.push(s)
  })
  return Object.values(map)
}

function isSlotSelected(date, slot) {
  return selectedSlot.value?.date === date && selectedSlot.value?.slot.schedule_id === slot.schedule_id
}

async function load() {
  if (!courseId.value) return
  error.value = false
  try {
    const data = await courseApi.detail(courseId.value)
    course.value = data
    heroFailed.value = false
    if (data.schedules.length) {
      coach.value = {
        coach_name: data.schedules[0].coach_name,
        coach_title: data.schedules[0].coach_title,
        coach_avatar: data.schedules[0].coach_avatar
      }
    }
  } catch {
    error.value = true
    course.value = null
    return
  }
  await loadSlots()
}

// 时段独立容错：失败只清空时段区，不拖垮已加载的课程详情
async function loadSlots() {
  slotsLoading.value = true
  slotsError.value = false
  try {
    const rules = await ruleApi.public()
    advanceDays.value = rules?.advance_days || 7
  } catch {
    advanceDays.value = 7
  }
  try {
    const slots = await courseApi.availSlots(courseId.value, dateStr(0), dateStr(advanceDays.value))
    slotGroups.value = groupSlots(slots)
    selectedDate.value = slotGroups.value[0]?.date || ''
    selectedSlot.value = null
  } catch {
    slotGroups.value = []
    slotsError.value = true
  } finally {
    slotsLoading.value = false
  }
}

// 登录前所选时段暂存于此，登录成功返回本页后自动带入
const pendingSlot = ref(null)

function selectSlot(date, slot) {
  if (slot.remain <= 0) {
    uni.showToast({ title: '该时段已约满', icon: 'none' })
    return
  }
  if (!userStore.isLogin) {
    pendingSlot.value = { date, slot }
    uni.navigateTo({ url: '/pages/login/index' })
    return
  }
  selectedSlot.value = {
    date,
    slot,
    label: `${selectedGroup.value.weekLabel} ${date} ${slot.time_slot}`
  }
}

function goConfirm(date, slot) {
  if (!slot || slot.remain <= 0) {
    uni.showToast({ title: '该时段已约满', icon: 'none' })
    return
  }
  if (course.value.status === 'off') {
    uni.showToast({ title: '课程已下架', icon: 'none' })
    return
  }
  uni.navigateTo({
    url: `/pages/booking/confirm?courseId=${courseId.value}&scheduleId=${slot.schedule_id}&date=${date}&timeSlot=${slot.time_slot}`
  })
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/index/index' })
}

// 登录成功返回本页时自动带入登录前所选时段
onShow(() => {
  if (pendingSlot.value && userStore.isLogin) {
    const { date, slot } = pendingSlot.value
    pendingSlot.value = null
    goConfirm(date, slot)
  }
})

onPageScroll((e) => {
  scrolled.value = (e?.scrollTop || 0) > 24
})

onLoad((options) => {
  courseId.value = Number(options?.id) || 0
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
  load()
})
</script>
<style lang="scss" scoped>
.detail-page { min-height: 100vh; padding-bottom: calc(140rpx + env(safe-area-inset-bottom)); }

/* ---------- 顶部封面 ---------- */
.hero {
  position: relative;
  height: 520rpx;
  background: $lx-surface-2;
  overflow: hidden;
}

.hero-cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hero-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  background: $lx-brand-soft;
  color: $lx-brand-deep;
}

.hero-placeholder__mark { font-size: 88rpx; font-weight: 700; }
.hero-placeholder__cat { font-size: 24rpx; opacity: 0.72; }

.hero-shade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 180rpx;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.34) 100%);
}

/* ---------- 自定义导航 ---------- */
.detail-nav {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  z-index: 10;
  transition: background-color 0.24s $lx-ease-out;
}

.detail-nav.scrolled {
  background: rgba(245, 245, 247, 0.94);
  border-bottom: 1rpx solid $lx-line-soft;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.detail-nav__inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding-left: 16rpx;
  padding-right: 16rpx;
}

.nav-back {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: $lx-shadow-1;
  flex-shrink: 0;
}

.detail-nav.scrolled .nav-back {
  background: transparent;
  box-shadow: none;
}

.nav-arrow {
  font-size: 48rpx;
  line-height: 1;
  color: $lx-text;
  margin-top: -6rpx;
}

.nav-title {
  margin-left: 20rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: $lx-text;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.nav-balance { width: 72rpx; }

/* ---------- 内容 ---------- */
.content {
  position: relative;
  margin-top: -40rpx;
  padding: 0 24rpx;
}

.card {
  background: $lx-surface;
  border-radius: $lx-radius-lg;
  padding: 32rpx;
  margin-top: 24rpx;
  box-shadow: $lx-shadow-1;
}

.course-card {
  position: relative;
  z-index: 2;
}

.course-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
}

.course-name {
  flex: 1;
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1.3;
  color: $lx-text;
}

.course-price {
  font-size: 44rpx;
  font-weight: 700;
  color: $lx-coral;
  flex-shrink: 0;
}

.tag-row {
  margin-top: 20rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag {
  font-size: 22rpx;
  color: $lx-brand-deep;
  background: $lx-brand-soft;
  padding: 8rpx 18rpx;
  border-radius: $lx-radius-sm;
  font-weight: 600;
}

.tag.is-off {
  color: $lx-text-2;
  background: $lx-surface-2;
}

.intro {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: $lx-text-2;
  line-height: 1.7;
}

.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
}

.card-head__hint {
  font-size: 22rpx;
  color: $lx-text-3;
}

/* 教练横向身份卡 */
.coach-row {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  position: relative;
  padding: 20rpx 24rpx;
  background: $lx-bg;
  border-radius: $lx-radius-md;
}

.coach-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  overflow: hidden;
  background: $lx-brand-soft;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $lx-brand-deep;
  font-size: 40rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.coach-avatar image { width: 100%; height: 100%; }

.coach-info {
  flex: 1;
  min-width: 0;
}

.coach-name {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: $lx-text;
}

.coach-title {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: $lx-text-2;
}

.coach-stripe {
  width: 6rpx;
  height: 60rpx;
  border-radius: 6rpx;
  background: $lx-coral;
  opacity: 0.7;
}

/* ---------- 日期轨道 ---------- */
.date-rail-wrap { margin-top: 20rpx; }
.date-rail { width: 100%; }

.date-track {
  white-space: nowrap;
  padding: 4rpx 2rpx 8rpx;
}

.date-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 116rpx;
  height: 104rpx;
  margin: 0 8rpx;
  border-radius: $lx-radius-md;
  background: $lx-surface-2;
  color: $lx-text-2;
  transition: background-color 0.2s $lx-ease-out, color 0.2s $lx-ease-out,
    transform 0.12s $lx-ease-out;
}

.date-chip.active {
  background: $lx-brand;
  color: #fff;
}

.date-chip:active { transform: scale(0.95); }

.date-chip__week { font-size: 24rpx; }
.date-chip__day { margin-top: 6rpx; font-size: 28rpx; font-weight: 700; }

/* ---------- 时段网格 ---------- */
.slot-grid {
  margin-top: 20rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.slot {
  min-height: 112rpx;
  padding: 18rpx 10rpx;
  border: 1rpx solid rgba(0, 122, 255, 0.28);
  border-radius: $lx-radius-md;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  background: $lx-brand-soft;
  transition: transform 0.12s $lx-ease-out, border-color 0.18s $lx-ease-out,
    background-color 0.18s $lx-ease-out;
}

.slot:active { transform: scale(0.96); }

.slot.selected {
  border-color: $lx-brand;
  background: #dcecff;
  box-shadow: 0 0 0 4rpx rgba(0, 122, 255, 0.12);
}

.slot.tight {
  border-color: rgba(245, 165, 36, 0.5);
  background: $lx-warning-soft;
}

.slot.full {
  border-color: $lx-line-soft;
  background: $lx-surface-2;
  opacity: 0.78;
}

.slot.full:active { transform: none; }

.slot-time {
  font-size: 26rpx;
  font-weight: 600;
  color: $lx-brand-deep;
}

.slot.tight .slot-time { color: #8a6116; }
.slot.full .slot-time { color: $lx-text-3; }

.slot-remain {
  font-size: 22rpx;
  color: #1f9d58;
  font-weight: 600;
}

.slot.tight .slot-remain { color: $lx-warning; }
.slot.full .slot-remain { color: $lx-text-3; }

.slot-skeleton {
  margin-top: 20rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.slot-skeleton__item { height: 112rpx; }

.slot-error {
  margin-top: 20rpx;
  padding: 36rpx 24rpx;
  border-radius: $lx-radius-md;
  background: $lx-bg;
  color: $lx-text-2;
  font-size: 26rpx;
  text-align: center;
}

/* ---------- 底部选择胶囊 ---------- */
.selection-dock {
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

.selection-dock__inner {
  width: 100%;
  max-width: 912px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.selection-dock .lx-capsule {
  flex: 1;
  min-width: 0;
}

.capsule-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.confirm-btn {
  margin: 0;
  width: 220rpx;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  background: $lx-brand;
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.confirm-btn:active {
  background: $lx-brand-deep;
  transform: scale(0.97);
}

/* ---------- 加载 / 错误 ---------- */
.full-error { min-height: 80vh; }

.loading-page { padding: 0 24rpx; }

.loading-cover {
  height: 520rpx;
  border-radius: 0;
}
</style>
