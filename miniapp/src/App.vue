<script>
import { BASE_URL } from './config'

export default {
  onLaunch: function () {
    // 启动标记：确认工具加载的是最新产物（版本 v3）
    console.log('乐享健身会员端启动 v3，API:', BASE_URL)
  }
}
</script>

<style lang="scss">
/* ===== 全局公共样式：设计令牌统一入口 ===== */
page {
  background: $lx-bg;
  color: $lx-text;
  font-size: $lx-font-body;
  line-height: 1.5;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* 移除小程序 button 默认边框，统一交给页面控制 */
button::after {
  border: 0;
}

/* 通用卡片 */
.card {
  background: $lx-surface;
  border-radius: $lx-radius-lg;
  padding: $lx-space-4;
  margin: $lx-space-3;
  box-shadow: $lx-shadow-1;
}

/* 价格：珊瑚橙只承担“值得关注” */
.price {
  color: $lx-coral;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* 分区标题 */
.section-title {
  font-size: $lx-font-section;
  font-weight: 700;
  color: $lx-text;
}

/* 旧空态提示的轻量兜底 */
.empty-tip {
  text-align: center;
  color: $lx-text-3;
  padding: 80rpx 0;
  font-size: $lx-font-small;
}

/* 通用空状态：图形 + 原因 + 下一步 */
.lx-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 96rpx 48rpx;
  text-align: center;
}

.lx-empty__graphic {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: $lx-surface-2;
  position: relative;
  margin-bottom: 24rpx;
}

.lx-empty__graphic::before {
  content: '';
  position: absolute;
  left: 36rpx;
  top: 36rpx;
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid $lx-text-3;
  border-radius: 50%;
}

.lx-empty__graphic::after {
  content: '';
  position: absolute;
  right: 30rpx;
  top: 26rpx;
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: $lx-coral;
}

.lx-empty__title {
  font-size: $lx-font-section;
  font-weight: 700;
  color: $lx-text;
}

.lx-empty__desc {
  margin-top: 12rpx;
  font-size: $lx-font-small;
  color: $lx-text-2;
  line-height: 1.6;
  max-width: 480rpx;
}

.lx-empty__action {
  margin-top: 28rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 72rpx;
  padding: 0 40rpx;
  border-radius: $lx-radius-pill;
  background: $lx-brand-soft;
  color: $lx-brand-deep;
  font-size: $lx-font-small;
  font-weight: 600;
  line-height: 72rpx;
}

/* 骨架块 */
.lx-skeleton {
  border-radius: $lx-radius-sm;
  background: linear-gradient(90deg, #ececf0 25%, #f7f7f9 50%, #ececf0 75%);
  background-size: 200% 100%;
  animation: lx-skeleton 1.4s ease infinite;
}

@keyframes lx-skeleton {
  to { background-position: -200% 0; }
}

/* 训练动态胶囊：任务连续状态反馈 */
.lx-capsule {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  min-height: 56rpx;
  padding: 0 24rpx;
  border-radius: $lx-radius-pill;
  font-size: $lx-font-small;
  font-weight: 600;
  color: $lx-text;
  background: rgba(255, 255, 255, 0.94);
  border: 1rpx solid $lx-line-soft;
  box-shadow: $lx-shadow-1;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: background-color 0.2s $lx-ease-out, border-color 0.2s $lx-ease-out,
    transform 0.2s $lx-ease-out;
}

.lx-capsule__dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: $lx-text-3;
  flex-shrink: 0;
}

.lx-capsule.is-saving .lx-capsule__dot {
  width: 20rpx;
  height: 20rpx;
  border: 3rpx solid rgba(0, 122, 255, 0.24);
  border-top-color: $lx-brand;
  background: transparent;
  animation: lx-spin 0.7s linear infinite;
}

.lx-capsule.is-saving {
  background: $lx-brand-soft;
  border-color: rgba(0, 122, 255, 0.3);
}

.lx-capsule.is-success {
  background: $lx-success-soft;
  border-color: rgba(48, 181, 106, 0.35);
}

.lx-capsule.is-success .lx-capsule__dot {
  background: $lx-success;
}

.lx-capsule.is-error {
  background: $lx-danger-soft;
  border-color: rgba(229, 72, 77, 0.35);
}

.lx-capsule.is-error .lx-capsule__dot { background: $lx-danger; }

@keyframes lx-spin {
  to { transform: rotate(360deg); }
}

/* 按下反馈：所有可点卡片共用 */
.lx-pressable {
  transition: transform 0.12s $lx-ease-out, opacity 0.12s $lx-ease-out;
}

.lx-pressable:active {
  transform: scale(0.985);
  opacity: 0.92;
}

/* 页面宽度包含内边距，避免 100% 宽度叠加 padding 后溢出屏幕 */
.lx-page {
  width: 100%;
  box-sizing: border-box;
}

/* #ifdef H5 */
.lx-page {
  max-width: 960px;
  margin: 0 auto;
}
/* #endif */

/* #ifdef H5 */
/* 微信小程序 WXSS 不支持通配选择器，减少动态效果仅编译到 H5 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.08s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.08s !important;
  }
}
/* #endif */
</style>
