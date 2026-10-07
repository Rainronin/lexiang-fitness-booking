<!-- Chart：ECharts 封装组件 —— 全局图表主题 + 空态 + 进入动画 + 窗口自适应 -->
<template>
  <div v-if="isEmpty" class="chart-empty" :style="{ height }">
    <div class="chart-empty__graphic" aria-hidden="true"><span /><span /><span /></div>
    <div class="chart-empty__text">暂无图表数据</div>
  </div>
  <div v-else ref="el" class="chart" :class="{ 'is-ready': ready }" :style="{ height }" />
</template>
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
// ECharts 按需引入（core + 图表 + 组件），减小打包体积
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: '320px' }
})

const el = ref()
const ready = ref(false)
let chart = null

// 设计令牌中的固定图表色序：品牌蓝 → 珊瑚橙 → 成功绿 → 紫蓝
const SERIES_COLORS = ['#007AFF', '#FF6B4A', '#30B56A', '#8E7CFF']
const AXIS_LINE = 'rgba(60, 60, 67, 0.12)'
const AXIS_LABEL = '#98989D'
const GRID_LINE = 'rgba(60, 60, 67, 0.08)'

// 空态判断：所有 series 数据为空或全 0 时显示空态提示（替代空坐标系）
const isEmpty = computed(() => {
  const series = props.option?.series || []
  if (!series.length) return true
  return series.every((s) => !s.data || s.data.length === 0 || s.data.every((v) => !v))
})

function styleAxis(axis = {}) {
  if (!axis || axis.show === false) return axis
  return {
    ...axis,
    axisLine: {
      show: true,
      lineStyle: { color: AXIS_LINE },
      ...(axis.axisLine || {})
    },
    axisTick: {
      show: false,
      ...(axis.axisTick || {})
    },
    axisLabel: {
      color: AXIS_LABEL,
      fontSize: 12,
      margin: 10,
      ...(axis.axisLabel || {})
    },
    splitLine: {
      show: axis.type === 'value',
      lineStyle: { color: GRID_LINE, type: 'dashed' },
      ...(axis.splitLine || {})
    }
  }
}

// 用全局主题补齐 option：颜色、字体、Tooltip、网格和坐标轴
function themedOption(option) {
  const xAxis = Array.isArray(option.xAxis)
    ? option.xAxis.map(styleAxis)
    : styleAxis(option.xAxis)
  const yAxis = Array.isArray(option.yAxis)
    ? option.yAxis.map(styleAxis)
    : styleAxis(option.yAxis)

  return {
    ...option,
    textStyle: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
      color: '#1D1D1F',
      ...(option.textStyle || {})
    },
    color: option.color || SERIES_COLORS,
    animationDuration: option.animationDuration || 300,
    animationDurationUpdate: option.animationDurationUpdate || 180,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(29, 29, 31, 0.92)',
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: '#fff', fontSize: 12 },
      extraCssText: 'border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.18);',
      axisPointer: { lineStyle: { color: AXIS_LINE }, ...(option.tooltip?.axisPointer || {}) },
      ...(option.tooltip || {})
    },
    grid: {
      left: 16,
      right: 20,
      top: 32,
      bottom: 12,
      containLabel: true,
      ...(option.grid || {})
    },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: '#6E6E73', fontSize: 12 },
      ...(option.legend || {})
    },
    xAxis,
    yAxis,
    series: (option.series || []).map((s, i) => ({
      ...s,
      color: s.color || (s.itemStyle?.color ? undefined : SERIES_COLORS[i % SERIES_COLORS.length]),
      itemStyle: {
        borderRadius: s.type === 'bar' ? [4, 4, 0, 0] : undefined,
        ...(s.itemStyle || {})
      },
      lineStyle: {
        width: 2.5,
        ...(s.lineStyle || {})
      },
      symbol: s.type === 'line' ? 'circle' : undefined,
      symbolSize: s.type === 'line' ? 6 : undefined
    }))
  }
}

function render() {
  if (!el.value) return
  if (!chart) chart = echarts.init(el.value, null, { renderer: 'canvas' })
  chart.setOption(themedOption(props.option), true)
  ready.value = true
}

function handleResize() {
  chart?.resize()
}

onMounted(() => {
  render()
  window.addEventListener('resize', handleResize)
})

watch(() => props.option, () => nextTick(render), { deep: true })

// 空态切换：变空时销毁实例；恢复数据时重新挂载渲染
watch(isEmpty, (empty) => {
  if (empty) {
    ready.value = false
    chart?.dispose()
    chart = null
  } else {
    nextTick(render)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>
<style scoped>
.chart {
  width: 100%;
  opacity: 0;
  transform: translateY(8px);
}

.chart.is-ready {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.32s var(--lx-ease-out), transform 0.32s var(--lx-ease-out);
}

.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--lx-text-2);
  font-size: 13px;
  min-height: 220px;
}

.chart-empty__graphic {
  width: 68px;
  height: 44px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
  padding: 0 6px;
  border-bottom: 1px solid var(--lx-line);
}

.chart-empty__graphic span {
  width: 10px;
  border-radius: 3px 3px 0 0;
  background: var(--lx-surface-2);
}

.chart-empty__graphic span:nth-child(1) { height: 12px; }
.chart-empty__graphic span:nth-child(2) { height: 24px; background: var(--lx-brand-soft); }
.chart-empty__graphic span:nth-child(3) { height: 18px; }
</style>
