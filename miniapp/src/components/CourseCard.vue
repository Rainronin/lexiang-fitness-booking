<!-- 课程卡片：统一比例封面 + 两行标题 + 珊瑚价格锚点 + 图片失败分类占位 -->
<template>
  <view class="course-card lx-pressable" @click="$emit('click')">
    <view class="cover-wrap">
      <view v-if="!loaded && !failed" class="cover-skeleton lx-skeleton" />
      <image
        v-if="course.cover && !failed"
        class="cover"
        :class="{ 'is-loaded': loaded }"
        :src="imgUrl(course.cover)"
        mode="aspectFill"
        lazy-load
        @load="loaded = true"
        @error="failed = true"
      />
      <view v-else class="cover cover-placeholder" :class="toneClass">
        <text class="placeholder-mark">{{ course.name?.[0] || '课' }}</text>
        <text class="placeholder-cat">{{ course.category_name || '乐享健身' }}</text>
      </view>

      <view v-if="course.status === 'off'" class="cover-tag is-off">已下架</view>
      <view v-else-if="hot" class="cover-tag is-hot">本周热门</view>
    </view>

    <view class="info">
      <text class="name">{{ course.name }}</text>
      <view class="meta">
        <text class="price num">¥{{ course.price }}</text>
        <text class="meta-line">{{ course.duration }}分钟<template v-if="course.coach_name"> · {{ course.coach_name }}</template></text>
      </view>
    </view>
  </view>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { imgUrl } from '../utils/imgUrl'

const props = defineProps({
  course: { type: Object, required: true },
  hot: { type: Boolean, default: false }
})
defineEmits(['click'])

const loaded = ref(false)
const failed = ref(false)

const toneClass = computed(() => `tone-${(Number(props.course?.category_id) || 0) % 4}`)

// 课程封面变化时重置图片状态，避免复用组件实例后仍显示旧失败态
watch(() => props.course?.cover, () => {
  loaded.value = false
  failed.value = false
})
</script>
<style lang="scss" scoped>
.course-card {
  background: $lx-surface;
  border-radius: $lx-radius-xl;
  overflow: hidden;
  box-shadow: $lx-shadow-1;
}

.cover-wrap {
  position: relative;
  height: 320rpx;
  background: $lx-surface-2;
  overflow: hidden;
}

.cover,
.cover-skeleton {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.cover {
  opacity: 0;
  transition: opacity 0.24s $lx-ease-out;
}

.cover.is-loaded { opacity: 1; }

.cover-skeleton { border-radius: 0; }

.cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.cover-placeholder.tone-0 { background: #e9f3ff; color: $lx-brand-deep; }
.cover-placeholder.tone-1 { background: #fff0eb; color: $lx-coral; }
.cover-placeholder.tone-2 { background: #eaf8f0; color: #1f9d58; }
.cover-placeholder.tone-3 { background: #f0ecff; color: #6652c9; }

.placeholder-mark {
  font-size: 56rpx;
  font-weight: 700;
}

.placeholder-cat {
  font-size: 22rpx;
  opacity: 0.72;
}

.cover-tag {
  position: absolute;
  left: 16rpx;
  top: 16rpx;
  height: 44rpx;
  line-height: 44rpx;
  padding: 0 18rpx;
  border-radius: $lx-radius-pill;
  font-size: 22rpx;
  font-weight: 600;
}

.cover-tag.is-hot {
  color: #fff;
  background: rgba(255, 107, 74, 0.9);
}

.cover-tag.is-off {
  color: $lx-text-2;
  background: rgba(240, 241, 243, 0.94);
}

.info { padding: 24rpx 28rpx 28rpx; }

.name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 80rpx;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.35;
  color: $lx-text;
}

.meta {
  margin-top: 16rpx;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
}

.price {
  font-size: 34rpx;
  font-weight: 700;
  color: $lx-coral;
}

.meta-line {
  font-size: 24rpx;
  color: $lx-text-2;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
