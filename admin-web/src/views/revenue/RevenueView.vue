<!-- 营收统计（仅管理员）：按日/月分段 + 汇总指标 + 趋势图 + 课程排行 -->
<template>
  <div v-loading="loading" class="revenue-page">
    <div class="lx-page-header">
      <div class="lx-page-header__main">
        <h1 class="lx-page-title">营收统计</h1>
        <p class="lx-page-desc">按日或按月查看营收趋势，并对比课程热度</p>
      </div>
    </div>

    <!-- 统一筛选栏 -->
    <div class="lx-panel filter-panel">
      <div class="segment" role="tablist" aria-label="统计方式">
        <span class="segment__thumb" :class="{ 'is-right': type === 'month' }" aria-hidden="true" />
        <button type="button" role="tab" :aria-selected="type === 'day'" class="segment__item" :class="{ active: type === 'day' }" @click="switchType('day')">按日</button>
        <button type="button" role="tab" :aria-selected="type === 'month'" class="segment__item" :class="{ active: type === 'month' }" @click="switchType('month')">按月</button>
      </div>

      <el-date-picker
        v-model="range"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        :clearable="false"
        class="range-picker"
        @change="load"
      />
      <el-button type="primary" :icon="Search" @click="load">应用查询</el-button>
    </div>

    <!-- 汇总指标 -->
    <el-row :gutter="16" class="summary-row">
      <el-col :xs="24" :sm="8">
        <div class="summary-card is-primary">
          <div class="summary-label">总营收</div>
          <div class="summary-value num">¥{{ summary.revenue }}</div>
          <div class="summary-note">所选范围内已归集营收</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8">
        <div class="summary-card">
          <div class="summary-label">有效预约数</div>
          <div class="summary-value num">{{ summary.order_count }}</div>
          <div class="summary-note">不含已取消预约</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8">
        <div class="summary-card">
          <div class="summary-label">客单价</div>
          <div class="summary-value num">¥{{ summary.avg }}</div>
          <div class="summary-note">总营收 / 有效预约数</div>
        </div>
      </el-col>
    </el-row>

    <!-- 营收趋势：主要空间 -->
    <div class="lx-panel chart-panel">
      <div class="chart-head">
        <div>
          <h3 class="lx-panel__title">营收趋势</h3>
          <p class="chart-desc">{{ type === 'day' ? '按日统计，单位：元' : '按月统计，单位：元' }}</p>
        </div>
        <span class="range-label num">{{ range[0] }} 至 {{ range[1] }}</span>
      </div>
      <Chart :option="revenueOption" height="340px" />
    </div>

    <!-- 课程热度排行 -->
    <div class="lx-panel">
      <div class="chart-head">
        <div>
          <h3 class="lx-panel__title">课程热度排行</h3>
          <p class="chart-desc">按预约次数排序，前 3 名轻量强调</p>
        </div>
      </div>
      <el-table :data="hotList" class="hot-table" empty-text="所选范围内暂无课程热度数据">
        <el-table-column label="排名" width="80" align="center">
          <template #default="{ $index }">
            <span class="rank-badge" :class="`is-${$index + 1}`">{{ $index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="course_name" label="课程名称" min-width="200" />
        <el-table-column prop="booking_count" label="预约次数" width="120" align="center">
          <template #default="{ row }">
            <span class="num">{{ row.booking_count }} 次</span>
          </template>
        </el-table-column>
        <el-table-column prop="revenue" label="累计营收" width="140" align="right">
          <template #default="{ row }">
            <span class="rank-revenue num">{{ formatPrice(row.revenue) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { statsApi } from '../../api'
import Chart from '../../components/Chart.vue'
import { formatPrice, localDateStr } from '../../utils/format'

const loading = ref(false)
const type = ref('day')
const range = ref([])
const list = ref([])
const summary = ref({ revenue: 0, order_count: 0, avg: 0 })
const hotList = ref([])

function defaultRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 29)
  return [localDateStr(start), localDateStr(end)]
}

function switchType(next) {
  if (type.value === next) return
  type.value = next
  load()
}

const revenueOption = computed(() => {
  const labels = list.value.map((r) => (type.value === 'day' ? r.period.slice(5) : r.period))
  const values = list.value.map((r) => r.revenue)
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => `¥${Number(v).toFixed(0)}`
    },
    grid: { left: 12, right: 20, top: 24, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: type.value === 'day' ? { interval: 'auto' } : {}
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (v) => (v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v) }
    },
    series: [
      {
        name: '营收(元)',
        type: 'line',
        smooth: 0.24,
        symbol: 'circle',
        symbolSize: 6,
        color: '#007AFF',
        lineStyle: { width: 2.5 },
        data: values
      }
    ]
  }
})

async function load() {
  if (!range.value[0] || !range.value[1]) return
  loading.value = true
  try {
    const [rev, hot] = await Promise.all([
      statsApi.revenue({ type: type.value, start: range.value[0], end: range.value[1] }),
      statsApi.courseHot()
    ])
    list.value = rev.list
    summary.value = rev.summary
    hotList.value = hot
  } catch {
    /* 错误已由拦截器提示 */
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  range.value = defaultRange()
  load()
})
</script>
<style scoped>
.revenue-page { min-height: 400px; }

.filter-panel {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.segment {
  position: relative;
  display: inline-flex;
  width: 220px;
  height: 40px;
  padding: 4px;
  border-radius: var(--lx-radius-md);
  background: var(--lx-surface-2);
  border: 1px solid var(--lx-line-soft);
}

.segment__thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: 30px;
  border-radius: 9px;
  background: var(--lx-surface);
  box-shadow: var(--lx-shadow-1);
  transition: transform 0.22s var(--lx-ease-out);
}

.segment__thumb.is-right { transform: translateX(100%); }

.segment__item {
  position: relative;
  z-index: 1;
  flex: 1;
  border: 0;
  background: transparent;
  color: var(--lx-text-2);
  font-size: 13px;
  font-weight: 600;
  border-radius: 9px;
  cursor: pointer;
  transition: color 0.2s var(--lx-ease-out), transform 0.12s var(--lx-ease-out);
}

.segment__item.active { color: var(--lx-text); }
.segment__item:active { transform: scale(0.97); }
.segment__item:focus-visible { outline: 2px solid var(--lx-brand); outline-offset: -2px; }

.range-picker { width: 300px; }

.summary-row { margin-bottom: 16px; }

.summary-card {
  background: var(--lx-surface);
  border: 1px solid var(--lx-line-soft);
  border-radius: var(--lx-radius-lg);
  box-shadow: var(--lx-shadow-1);
  padding: 20px;
  min-height: 112px;
  position: relative;
  overflow: hidden;
  transition: transform 0.18s var(--lx-ease-out), box-shadow 0.18s var(--lx-ease-out);
}

.summary-card:hover { transform: translateY(-2px); box-shadow: var(--lx-shadow-2); }

.summary-card::after {
  content: '';
  position: absolute;
  left: 0;
  top: 22px;
  bottom: 22px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--lx-brand);
  opacity: 0.45;
}

.summary-card.is-primary::after { background: var(--lx-coral); opacity: 0.7; }

.summary-label { font-size: 13px; color: var(--lx-text-2); font-weight: 600; }
.summary-value { margin-top: 10px; font-size: 30px; font-weight: 700; letter-spacing: -0.02em; color: var(--lx-text); }
.summary-note { margin-top: 6px; font-size: 11px; color: var(--lx-text-3); }

.chart-panel { margin-bottom: 16px; }

.chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.chart-desc { margin-top: 4px; font-size: 12px; color: var(--lx-text-2); }
.range-label { font-size: 12px; color: var(--lx-text-3); }

.hot-table { width: 100%; }

.rank-badge {
  display: inline-flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--lx-surface-2);
  color: var(--lx-text-2);
  font-size: 12px;
  font-weight: 700;
}

.rank-badge.is-1 { background: var(--lx-coral-soft); color: var(--lx-coral); }
.rank-badge.is-2 { background: var(--lx-brand-soft); color: var(--lx-brand-deep); }
.rank-badge.is-3 { background: var(--lx-warning-soft); color: #9a680c; }

.rank-revenue { color: var(--lx-coral); font-weight: 700; }
</style>
