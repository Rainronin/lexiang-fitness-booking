<!-- 预约管理：按使用频率排序筛选 + 上课时间合并展示 + 后台取消 -->
<template>
  <div class="bookings-page">
    <div class="lx-page-header">
      <div class="lx-page-header__main">
        <h1 class="lx-page-title">预约管理</h1>
        <p class="lx-page-desc">{{ headerDesc }}</p>
      </div>
    </div>

    <ProTable
      ref="tableRef"
      :request="bookingApi.list"
      :columns="columns"
      :search="search"
      :actions-width="130"
      empty-text="当前没有预约记录；会员提交预约后会显示在这里。"
    >
      <template #member="{ row }">
        <div class="member-cell">
          <div class="member-cell__name">{{ row.nickname || '未设置昵称' }}</div>
          <div class="member-cell__phone num">{{ row.phone }}</div>
        </div>
      </template>
      <template #booking_date="{ row }">
        <div class="schedule-cell">
          <div class="schedule-cell__date num">{{ row.booking_date }} · {{ weekdayLabel(row.booking_date) }}</div>
          <div class="schedule-cell__time">{{ row.time_slot }}</div>
        </div>
      </template>
      <template #price="{ row }">
        <span class="booking-price num">{{ formatPrice(row.price) }}</span>
      </template>
      <template #status="{ row }">
        <span class="status-tag" :class="`is-${row.display_status}`">
          <i />
          {{ statusText(row.display_status) }}
        </span>
      </template>
      <template #created_at="{ row }">{{ formatDateTime(row.created_at) }}</template>
      <template #actions="{ row }">
        <el-tooltip :disabled="row.display_status === 'confirmed'" content="仅待上课预约可以取消" placement="top">
          <span>
            <el-button
              link
              type="danger"
              :disabled="row.display_status !== 'confirmed'"
              @click="handleCancel(row)"
            >
              取消预约
            </el-button>
          </span>
        </el-tooltip>
      </template>
    </ProTable>
  </div>
</template>
<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { bookingApi, courseApi } from '../../api'
import ProTable from '../../components/ProTable.vue'
import { formatDateTime, formatPrice, WEEKDAYS } from '../../utils/format'

const tableRef = ref()

const statusText = (s) => ({ confirmed: '待上课', cancelled: '已取消', completed: '已完成' }[s] || s)

const headerDesc = computed(() => {
  const n = tableRef.value?.total
  return n ? `共 ${n} 条预约记录，按日期、课程与状态快速筛选` : '查询预约记录，并处理需要取消的订单'
})

const columns = [
  { prop: 'id', label: 'ID', width: 70, align: 'center' },
  { prop: 'member', label: '会员', minWidth: 160 },
  { prop: 'course_name', label: '课程', minWidth: 130 },
  { prop: 'coach_name', label: '教练', width: 100 },
  { prop: 'booking_date', label: '上课时间', width: 190 },
  { prop: 'price', label: '金额', width: 90, align: 'right' },
  { prop: 'status', label: '状态', width: 100 },
  { prop: 'created_at', label: '提交时间', width: 160 }
]

// 搜索项用 reactive：异步加载 options 保持响应式；第 4 项低频条件收纳到“更多筛选”
const search = reactive([
  { type: 'date', prop: 'date', label: '预约日期' },
  { type: 'select', prop: 'course_id', label: '课程', options: [] },
  {
    type: 'select', prop: 'status', label: '状态',
    options: [
      { label: '待上课', value: 'confirmed' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' }
    ]
  },
  { type: 'input', prop: 'keyword', label: '会员/课程', placeholder: '手机号、昵称或课程名' }
])

function weekdayLabel(dateStr) {
  if (!dateStr) return ''
  const d = new Date(String(dateStr).replace(/-/g, '/'))
  return Number.isNaN(d.getTime()) ? '' : WEEKDAYS[d.getDay()]
}

// 课程下拉选项
async function loadCourseOptions() {
  try {
    const data = await courseApi.list({ status: 'on', pageSize: 100 })
    search.find((s) => s.prop === 'course_id').options = data.list.map((c) => ({ label: c.name, value: c.id }))
  } catch {
    /* 错误已由拦截器提示 */
  }
}
loadCourseOptions()

async function handleCancel(row) {
  try {
    await ElMessageBox.confirm(
      `将取消「${row.nickname || row.phone}」在 ${row.booking_date} ${row.time_slot} 的「${row.course_name}」预约；确认后该时段名额会立即释放。`,
      '取消预约',
      {
        type: 'warning',
        confirmButtonText: '确认取消',
        cancelButtonText: '保留预约'
      }
    )
  } catch {
    return // 用户取消
  }
  try {
    await bookingApi.cancel(row.id)
    ElMessage.success('预约已取消')
    tableRef.value?.refresh()
  } catch {
    /* 错误已由拦截器提示 */
  }
}
</script>
<style scoped>
.member-cell__name {
  font-weight: 600;
  color: var(--lx-text);
}

.member-cell__phone {
  margin-top: 2px;
  font-size: 12px;
  color: var(--lx-text-2);
}

.schedule-cell__date {
  font-weight: 600;
  color: var(--lx-text);
  white-space: nowrap;
}

.schedule-cell__time {
  margin-top: 2px;
  font-size: 12px;
  color: var(--lx-text-2);
}

.booking-price {
  color: var(--lx-coral);
  font-weight: 700;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  min-width: 62px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status-tag i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
}

.status-tag.is-confirmed {
  color: var(--lx-brand-deep);
  background: var(--lx-brand-soft);
}

.status-tag.is-confirmed i { background: var(--lx-brand); }

.status-tag.is-completed {
  color: var(--lx-text-2);
  background: var(--lx-surface-2);
}

.status-tag.is-completed i { background: var(--lx-text-3); }

.status-tag.is-cancelled {
  color: var(--lx-danger);
  background: var(--lx-danger-soft);
}

.status-tag.is-cancelled i { background: var(--lx-danger); }
</style>
