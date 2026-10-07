<!-- 首页：本周热门内容轨道 + 吸顶分类胶囊 + 课程列表（骨架/空态/错误） -->
<template>
  <view class="lx-page home">
    <!-- 本周热门 -->
    <view v-if="hotCourses.length" class="hot-section">
      <view class="section-head">
        <view>
          <view class="section-title">本周热门</view>
          <view class="section-sub">会员近期预约最多的课程</view>
        </view>
        <text class="section-mark" aria-hidden="true">TOP</text>
      </view>
      <scroll-view scroll-x class="hot-scroll" :show-scrollbar="false">
        <view class="hot-track">
          <view
            v-for="c in hotCourses"
            :key="c.id"
            class="hot-item lx-pressable"
            @click="goDetail(c.id)"
          >
            <image v-if="c.cover && !c.coverFailed" class="hot-cover" :src="imgUrl(c.cover)" mode="aspectFill" @error="c.coverFailed = true" />
            <view v-else class="hot-cover hot-fallback">
              <text>{{ c.name?.[0] || '课' }}</text>
            </view>
            <view class="hot-shade" />
            <view class="hot-info">
              <text class="hot-name">{{ c.name }}</text>
              <view class="hot-foot">
                <text class="hot-price num">¥{{ c.price }}</text>
                <text class="hot-count num">已约 {{ c.booking_count }} 次</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 分类 tab（吸顶，半透明表面） -->
    <view class="cat-wrap">
      <scroll-view scroll-x class="cat-scroll" :show-scrollbar="false">
        <view class="cat-track">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="cat-item"
            :class="{ active: activeCat === cat.id }"
            @click="switchCat(cat.id)"
          >
            {{ cat.name }}
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 课程列表 -->
    <view class="list">
      <!-- 首次加载骨架 -->
      <view v-if="initialLoading" class="skeleton-list">
        <view v-for="i in 3" :key="i" class="skeleton-card">
          <view class="lx-skeleton skeleton-cover" />
          <view class="skeleton-body">
            <view class="lx-skeleton" style="height: 30rpx; width: 82%" />
            <view class="lx-skeleton" style="height: 30rpx; width: 56%; margin-top: 14rpx" />
            <view class="lx-skeleton" style="height: 30rpx; width: 34%; margin-top: 16rpx" />
          </view>
        </view>
      </view>

      <!-- 加载失败 -->
      <view v-else-if="loadError" class="lx-empty">
        <view class="lx-empty__graphic" />
        <view class="lx-empty__title">课程加载失败</view>
        <view class="lx-empty__desc">网络开小差了，已加载的其他内容不受影响。</view>
        <view class="lx-empty__action" @click="loadCourses(true)">重新加载</view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!courses.length" class="lx-empty">
        <view class="lx-empty__graphic" />
        <view class="lx-empty__title">{{ activeCat ? '该分类暂无课程' : '暂无课程' }}</view>
        <view class="lx-empty__desc">
          {{ activeCat ? '当前分类还没有上架课程，试试其他分类。' : '课程正在准备中，稍后再来看看。' }}
        </view>
        <view v-if="activeCat" class="lx-empty__action" @click="clearFilter">查看全部分类</view>
      </view>

      <!-- 课程列表 -->
      <template v-else>
        <CourseCard
          v-for="c in courses"
          :key="c.id"
          :course="c"
          :hot="hotIds.has(c.id)"
          @click="goDetail(c.id)"
        />
        <view v-if="finished" class="list-end">
          <view class="list-end__line" />
          <text>已经到底了</text>
          <view class="list-end__line" />
        </view>
        <view v-else-if="loading" class="list-loading">
          <view class="list-loading__dot" />
          正在加载更多
        </view>
      </template>
    </view>
  </view>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import { courseApi } from '../../api'
import CourseCard from '../../components/CourseCard.vue'
import { imgUrl } from '../../utils/imgUrl'

const categories = ref([{ id: 0, name: '全部' }])
const activeCat = ref(0)
const courses = ref([])
const hotCourses = ref([])
const page = ref(1)
const loading = ref(false)
const initialLoading = ref(true)
const loadError = ref('')
const finished = ref(false)
// 请求序号：切分类/刷新时丢弃过期响应，防竞态
let reqSeq = 0

const hotIds = computed(() => new Set(hotCourses.value.map((c) => c.id)))

async function loadCategories() {
  const list = await courseApi.categories()
  categories.value = [{ id: 0, name: '全部' }, ...list]
}

async function loadHot() {
  try {
    hotCourses.value = await courseApi.hot()
  } catch {
    hotCourses.value = []
  }
}

async function loadCourses(reset = false) {
  if (loading.value && !reset) return
  if (reset) {
    page.value = 1
    finished.value = false
  }
  const seq = ++reqSeq
  loading.value = true
  loadError.value = ''
  try {
    const params = { page: page.value, pageSize: 10 }
    if (activeCat.value) params.category_id = activeCat.value
    const data = await courseApi.list(params)
    if (seq !== reqSeq) return // 已有更新的请求，丢弃本次结果
    courses.value = reset ? data.list : [...courses.value, ...data.list]
    finished.value = courses.value.length >= data.total
  } catch {
    // 错误提示已由 request 封装处理；页面保留内联重试
    if (seq === reqSeq) loadError.value = '课程加载失败，请检查网络后重试'
  } finally {
    if (seq === reqSeq) {
      loading.value = false
      initialLoading.value = false
    }
  }
}

function switchCat(id) {
  if (activeCat.value === id) return
  activeCat.value = id
  loadCourses(true)
}

function clearFilter() {
  activeCat.value = 0
  loadCourses(true)
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/course/detail?id=${id}` })
}

onLoad(() => {
  // 各模块独立加载：任一失败不影响其他
  loadCategories().catch(() => {})
  loadHot().catch(() => {})
  loadCourses(true).catch(() => {})
})

onReachBottom(() => {
  if (!finished.value && !loading.value) {
    page.value += 1
    loadCourses().catch(() => {})
  }
})

onPullDownRefresh(async () => {
  try {
    await Promise.all([loadHot(), loadCourses(true)])
  } finally {
    uni.stopPullDownRefresh()
  }
})
</script>
<style lang="scss" scoped>
.home { padding-bottom: 32rpx; }

/* ---------- 本周热门 ---------- */
.hot-section { padding: 24rpx 0 28rpx; }

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0 24rpx 20rpx;
}

.section-sub {
  margin-top: 4rpx;
  font-size: 24rpx;
  color: $lx-text-2;
}

.section-mark {
  font-size: 22rpx;
  font-weight: 700;
  color: $lx-coral;
  letter-spacing: 0.08em;
  padding-top: 4rpx;
}

.hot-scroll { width: 100%; }

.hot-track {
  white-space: nowrap;
  padding: 0 16rpx;
}

.hot-item {
  display: inline-block;
  width: 300rpx;
  margin: 0 8rpx;
  vertical-align: top;
  position: relative;
  border-radius: $lx-radius-lg;
  overflow: hidden;
  background: $lx-surface-2;
}

.hot-cover {
  width: 300rpx;
  height: 180rpx;
  display: block;
}

.hot-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: $lx-brand-soft;
  color: $lx-brand-deep;
  font-size: 56rpx;
  font-weight: 700;
}

.hot-shade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 96rpx;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.55) 100%);
}

.hot-info {
  position: absolute;
  left: 16rpx;
  right: 16rpx;
  bottom: 12rpx;
}

.hot-name {
  display: block;
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hot-foot {
  margin-top: 6rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hot-price { color: #fff; font-size: 26rpx; font-weight: 700; }
.hot-count { color: rgba(255, 255, 255, 0.78); font-size: 20rpx; }

/* ---------- 分类胶囊（吸顶） ---------- */
.cat-wrap {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 12rpx 0;
  background: rgba(245, 245, 247, 0.94);
  border-bottom: 1rpx solid $lx-line-soft;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.cat-scroll { width: 100%; }

.cat-track {
  white-space: nowrap;
  padding: 0 20rpx;
}

.cat-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 64rpx;
  padding: 0 30rpx;
  margin: 0 8rpx;
  border-radius: $lx-radius-pill;
  font-size: 26rpx;
  color: $lx-text-2;
  background: $lx-surface-2;
  transition: background-color 0.2s $lx-ease-out, color 0.2s $lx-ease-out,
    transform 0.12s $lx-ease-out;
}

.cat-item.active {
  background: $lx-brand;
  color: #fff;
  font-weight: 600;
}

.cat-item:active { transform: scale(0.96); }

/* ---------- 课程列表 ---------- */
.list {
  padding: 24rpx 24rpx 0;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.skeleton-list { display: flex; flex-direction: column; gap: 20rpx; }

.skeleton-card {
  background: $lx-surface;
  border-radius: $lx-radius-xl;
  box-shadow: $lx-shadow-1;
  overflow: hidden;
}

.skeleton-cover { height: 320rpx; border-radius: 0; }

.skeleton-body { padding: 24rpx 28rpx 28rpx; }

.list-end {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  color: $lx-text-3;
  font-size: 22rpx;
  padding: 24rpx 0 8rpx;
}

.list-end__line {
  width: 72rpx;
  height: 1rpx;
  background: $lx-line;
}

.list-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  color: $lx-text-3;
  font-size: 24rpx;
  padding: 24rpx 0;
}

.list-loading__dot {
  width: 16rpx;
  height: 16rpx;
  border: 3rpx solid rgba(0, 122, 255, 0.2);
  border-top-color: $lx-brand;
  border-radius: 50%;
  animation: lx-spin 0.7s linear infinite;
}

@keyframes lx-spin {
  to { transform: rotate(360deg); }
}
</style>
