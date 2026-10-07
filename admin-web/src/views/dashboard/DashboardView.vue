<!-- 工作台看板：今日运营概览 KPI + 预约趋势 + 热门课程 + 本月营收（ECharts） -->
<template>
  <div v-loading="loading" class="dashboard">
    <div class="lx-page-header">
      <div class="lx-page-header__main">
        <h1 class="lx-page-title">今日运营概览</h1>
        <p class="lx-page-desc">{{ todayLabel }} · 数据来自实时预约与排班</p>
      </div>
    </div>

    <!-- KPI：强数字、弱图标，按业务关系两两成组 -->
    <el-row :gutter="16" class="kpi-row">
      <el-col v-for="card in kpiCards" :key="card.label" :xs="24" :sm="12" :lg="6">
        <div class="kpi-card" :class="card.tone">
          <div class="kpi-icon">
            <el-icon :size="20"><component :is="card.icon" /></el-icon>
          </div>
          <div class="kpi-body">
            <div class="kpi-value num">{{ card.value }}</div>
            <div class="kpi-label">{{ card.label }}</div>
            <div class="kpi-note">{{ card.note }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 预约趋势 + 课程热度 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :lg="14">
        <div class="lx-panel">
          <div class="chart-head">
            <div>
              <h3 class="lx-panel__title">近 7 日预约趋势</h3>
              <p class="chart-desc">按提交日期统计，单位：次</p>
            </div>
          </div>
          <Chart :option="trendOption" height="300px" />
        </div>
      </el-col>
      <el-col :xs="24" :lg="10">
        <div class="lx-panel">
          <div class="chart-head">
            <div>
              <h3 class="lx-panel__title">课程热度 TOP5</h3>
              <p class="chart-desc">近 30 天预约次数</p>
            </div>
          </div>
          <Chart :option="hotOption" height="300px" />
        </div>
      </el-col>
    </el-row>

    <!-- 本月营收 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :span="24">
        <div class="lx-panel">
          <div class="chart-head">
            <div>
              <h3 class="lx-panel__title">本月每日营收</h3>
              <p class="chart-desc">按上课日期归集，单位：元</p>
            </div>
          </div>
          <Chart :option="revenueOption" height="300px" />
        </div>
      </el-col>
    </el-row>
  </div>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { statsApi } from '../../api'
import Chart from '../../components/Chart.vue'
import { localDateStr, localMonthPrefix, WEEKDAYS } from '../../utils/format'

const loading = ref(false)
const data = ref(null)

const todayLabel = computed(() => {
  const d = new Date()
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${WEEKDAYS[d.getDay()]}`
})

const kpiCards = computed(() => [
  {
    label: '今日预约数',
    value: data.value?.today_bookings ?? '-',
    note: '今日已确认的预约',
    icon: 'Calendar',
    tone: 'brand'
  },
  {
    label: '今日课程数',
    value: data.value?.today_courses ?? '-',
    note: '今日已安排课程',
    icon: 'Notebook',
    tone: 'brand'
  },
  {
    label: '今日课程上座率',
    value: data.value ? `${data.value.today_occupancy}%` : '-',
    note: '已预约名额 / 总容量',
    icon: 'DataAnalysis',
    tone: 'coral'
  },
  {
    label: '本月营收',
    value: data.value ? `¥${data.value.month_revenue}` : '-',
    note: '按已完成与待上课归集',
    icon: 'Money',
    tone: 'coral'
  }
])

// 近 7 日预约趋势折线（按连续 7 天补零，无预约的日期也显示 0）
const trendOption = computed(() => {
  const countMap = {}
  ;(data.value?.trend || []).forEach((t) => {
    countMap[t.date] = t.count
  })
  const days = []
  const counts = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = localDateStr(d)
    days.push(key.slice(5))
    counts.push(countMap[key] || 0)
  }
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => `${v} 次`
    },
    grid: { left: 12, right: 16, top: 24, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: days, boundaryGap: false },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '预约数',
        type: 'line',
        smooth: 0.28,
        symbol: 'circle',
        symbolSize: 6,
        data: counts
      }
    ]
  }
})

// 热门课程横向条形图：课程名可完整读取
const hotOption = computed(() => {
  const rows = data.value?.hot_courses || []
  // ECharts category 轴自下而上排列，反转后第一名显示在最上方
  const names = rows.map((c) => c.course_name).reverse()
  const counts = rows.map((c) => c.booking_count).reverse()
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (v) => `${v} 次`
    },
    grid: { left: 12, right: 24, top: 16, bottom: 8, containLabel: true },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: {
      type: 'category',
      data: names,
      axisLabel: { width: 110, overflow: 'truncate' },
      axisLine: { show: false },
      splitLine: { show: false }
    },
    series: [
      {
        name: '预约数',
        type: 'bar',
        barWidth: 12,
        color: '#FF6B4A',
        itemStyle: { borderRadius: [0, 6, 6, 0] },
        data: counts
      }
    ]
  }
})

// 本月每日营收
const revenueOption = computed(() => {
  const month = localMonthPrefix()
  const days = []
  const values = []
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const revenueMap = {}
  ;(data.value?.monthDaily || []).forEach((d) => {
    revenueMap[d.date] = d.revenue
  })
  for (let i = 1; i <= daysInMonth; i++) {
    const key = `${month}-${String(i).padStart(2, '0')}`
    days.push(String(i))
    values.push(revenueMap[key] || 0)
  }
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => `¥${Number(v).toFixed(0)}`
    },
    grid: { left: 12, right: 16, top: 24, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: days },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (v) => (v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v) }
    },
    series: [
      {
        name: '营收(元)',
        type: 'bar',
        barWidth: '55%',
        color: '#30B56A',
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        data: values
      }
    ]
  }
})

async function load() {
  loading.value = true
  try {
    // 只用 dashboard 一个数据源（后端已并入 month_daily，员工也可访问）
    const dash = await statsApi.dashboard()
    data.value = { ...dash, monthDaily: dash.month_daily || [] }
  } catch {
    /* 错误已由拦截器提示 */
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
<style scoped>
.dashboard { min-height: 400px; }

.kpi-row { margin-bottom: 0; }

.kpi-card {
  background: var(--lx-surface);
  border: 1px solid var(--lx-line-soft);
  border-radius: var(--lx-radius-lg);
  box-shadow: var(--lx-shadow-1);
  padding: 20px;
  min-height: 118px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  position: relative;
  overflow: hidden;
  transition: transform 0.18s var(--lx-ease-out), box-shadow 0.18s var(--lx-ease-out);
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--lx-shadow-2);
}

.kpi-card::after {
  content: '';
  position: absolute;
  right: 0;
  top: 18px;
  bottom: 18px;
  width: 3px;
  border-radius: 3px 0 0 3px;
  background: var(--lx-brand);
  opacity: 0.5;
}

.kpi-card.coral::after { background: var(--lx-coral); }

.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lx-brand-soft);
  color: var(--lx-brand);
  flex-shrink: 0;
}

.kpi-card.coral .kpi-icon {
  background: var(--lx-coral-soft);
  color: var(--lx-coral);
}

.kpi-body { min-width: 0; }

.kpi-value {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--lx-text);
}

.kpi-label {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--lx-text);
}

.kpi-note {
  margin-top: 3px;
  font-size: 11px;
  color: var(--lx-text-3);
}

.chart-row { margin-top: 16px; }

.chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}

.chart-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--lx-text-2);
}

@media (max-width: 1199px) {
  .kpi-card { min-height: 104px; }
}
</style>
