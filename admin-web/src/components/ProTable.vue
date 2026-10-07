<!-- ProTable：筛选区 + 状态胶囊 + 表格 + 分页的二次封装（5 个管理模块复用） -->
<template>
  <div class="pro-table">
    <!-- 筛选区 -->
    <div v-if="search.length" class="pro-filter">
      <el-form :model="query" inline class="filter-form" @submit.prevent>
        <el-form-item v-for="item in primarySearch" :key="item.prop" :label="item.label">
          <el-select
            v-if="item.type === 'select'"
            v-model="query[item.prop]"
            :placeholder="item.placeholder || '全部'"
            clearable
            style="width: 160px"
            @change="handleSearch"
          >
            <el-option v-for="opt in item.options" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
          <el-date-picker
            v-else-if="item.type === 'date'"
            v-model="query[item.prop]"
            type="date"
            value-format="YYYY-MM-DD"
            :placeholder="item.placeholder || '选择日期'"
            style="width: 160px"
            @change="handleSearch"
          />
          <el-input
            v-else
            v-model="query[item.prop]"
            :placeholder="item.placeholder || '请输入'"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>

        <template v-if="moreSearch.length">
          <div v-show="moreVisible" class="filter-more">
            <el-form-item v-for="item in moreSearch" :key="item.prop" :label="item.label">
              <el-select
                v-if="item.type === 'select'"
                v-model="query[item.prop]"
                :placeholder="item.placeholder || '全部'"
                clearable
                style="width: 160px"
                @change="handleSearch"
              >
                <el-option v-for="opt in item.options" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
              <el-date-picker
                v-else-if="item.type === 'date'"
                v-model="query[item.prop]"
                type="date"
                value-format="YYYY-MM-DD"
                :placeholder="item.placeholder || '选择日期'"
                style="width: 160px"
                @change="handleSearch"
              />
              <el-input
                v-else
                v-model="query[item.prop]"
                :placeholder="item.placeholder || '请输入'"
                clearable
                style="width: 200px"
                @keyup.enter="handleSearch"
                @clear="handleSearch"
              />
            </el-form-item>
          </div>
        </template>

        <el-form-item class="filter-actions">
          <el-button type="primary" :icon="Search" @click="handleSearch">应用筛选</el-button>
          <el-button :icon="Refresh" :plain="activeFilterCount === 0" @click="handleReset">重置</el-button>
          <el-button v-if="moreSearch.length" link type="primary" @click="moreVisible = !moreVisible">
            {{ moreVisible ? '收起筛选' : '更多筛选' }}
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 已生效条件 -->
      <div v-if="activeFilterCount" class="filter-applied">
        <span class="lx-dynamic-capsule">
          <span class="lx-dynamic-capsule__dot" />
          已生效 {{ activeFilterCount }} 个筛选
        </span>
        <button
          v-for="f in activeFilters"
          :key="f.prop"
          class="filter-chip"
          type="button"
          :title="`移除条件：${f.label}`"
          @click="clearFilter(f.prop)"
        >
          {{ f.label }}：{{ f.text }}
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>

    <!-- 操作区 -->
    <div v-if="$slots.toolbar" class="toolbar">
      <slot name="toolbar" />
    </div>

    <!-- 首次加载：骨架屏 -->
    <div v-if="firstLoading" class="pro-skeleton" aria-hidden="true">
      <div class="pro-skeleton__head">
        <span v-for="i in Math.min(5, Math.max(columns.length, 2))" :key="i" class="lx-skeleton__bar" :style="{ width: 60 + (i * 17) % 60 + 'px' }" />
      </div>
      <div v-for="r in 5" :key="r" class="pro-skeleton__row">
        <span class="lx-skeleton__circle" style="width: 30px; height: 30px" />
        <span class="lx-skeleton__bar" style="width: 22%" />
        <span class="lx-skeleton__bar" style="width: 34%" />
        <span class="lx-skeleton__bar" style="width: 16%" />
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error && !list.length" class="lx-empty">
      <div class="lx-empty__graphic" />
      <div class="lx-empty__title">加载失败</div>
      <div class="lx-empty__desc">{{ error || '网络异常，请稍后重试' }}</div>
      <el-button type="primary" plain @click="load">重新加载</el-button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading && !list.length" class="lx-empty">
      <div class="lx-empty__graphic" />
      <div class="lx-empty__title">{{ activeFilterCount ? '没有符合筛选条件的数据' : '暂无数据' }}</div>
      <div class="lx-empty__desc">
        {{ activeFilterCount ? '当前筛选条件没有匹配记录，可以清除条件后重试。' : emptyText }}
      </div>
      <el-button v-if="activeFilterCount" type="primary" plain @click="handleReset">清除筛选</el-button>
    </div>

    <!-- 表格 -->
    <div v-else class="table-shell">
      <el-table v-loading="loading" :data="list" stripe class="data-table">
        <el-table-column
          v-for="col in columns"
          :key="col.prop"
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
          :align="col.align || 'left'"
        >
          <template #default="{ row }">
            <slot v-if="$slots[col.prop]" :name="col.prop" :row="row" />
            <template v-else>{{ col.formatter ? col.formatter(row) : row[col.prop] }}</template>
          </template>
        </el-table-column>
        <el-table-column v-if="$slots.actions" label="操作" :width="actionsWidth" align="center" fixed="right">
          <template #default="{ row }">
            <slot name="actions" :row="row" />
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页：总数靠左，翻页靠右 -->
      <div v-if="total" class="pagination">
        <div class="pagination__total">
          共 <b class="num">{{ total }}</b> 条记录
          <el-select v-model="pageSize" class="page-size" :aria-label="'每页条数'" @change="handlePageSizeChange">
            <el-option v-for="s in [10, 20, 50]" :key="s" :label="`${s} 条/页`" :value="s" />
          </el-select>
        </div>
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          background
          @current-change="load"
        />
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'

const props = defineProps({
  request: { type: Function, required: true }, // (params) => Promise<{list,total}>
  columns: { type: Array, default: () => [] },
  search: { type: Array, default: () => [] },
  params: { type: Object, default: () => ({}) }, // 固定查询参数
  actionsWidth: { type: Number, default: 160 },
  moreCount: { type: Number, default: 3 }, // 高频筛选数量，其余收纳到“更多筛选”
  emptyText: { type: String, default: '当前模块还没有记录，可在上方创建第一条数据。' }
})

const loading = ref(false)
const firstLoading = ref(true)
const error = ref('')
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const query = reactive({})
const moreVisible = ref(false)

// 搜索项初始值
props.search.forEach((item) => {
  query[item.prop] = ''
})

const primarySearch = computed(() => props.search.slice(0, Math.max(1, props.moreCount)))
const moreSearch = computed(() => props.search.slice(Math.max(1, props.moreCount)))

function optionText(item, value) {
  if (value === '' || value === null || value === undefined) return ''
  const opt = item.options?.find((o) => String(o.value) === String(value))
  if (opt) return opt.label
  return typeof value === 'string' ? value : String(value)
}

const activeFilters = computed(() =>
  props.search
    .filter((item) => query[item.prop] !== '' && query[item.prop] !== null && query[item.prop] !== undefined)
    .map((item) => ({ prop: item.prop, label: item.label, text: optionText(item, query[item.prop]) }))
)

const activeFilterCount = computed(() => activeFilters.value.length)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await props.request({
      ...props.params,
      ...query,
      page: page.value,
      pageSize: pageSize.value
    })
    list.value = data.list
    total.value = data.total
  } catch (e) {
    // 拦截器已提示；此处保留页面内错误状态，提供“重新加载”
    error.value = e?.message || '网络异常，请稍后重试'
  } finally {
    loading.value = false
    firstLoading.value = false
  }
}

function handleSearch() {
  page.value = 1
  load()
}

function handleReset() {
  Object.keys(query).forEach((k) => (query[k] = ''))
  page.value = 1
  load()
}

function clearFilter(prop) {
  query[prop] = ''
  page.value = 1
  load()
}

function handlePageSizeChange() {
  page.value = 1
  load()
}

function refresh() {
  load()
}

// params 变化（如筛选联动）自动刷新
watch(() => props.params, () => { page.value = 1; load() }, { deep: true })

defineExpose({ refresh, reload: load, total })
load()
</script>

<style scoped>
.pro-table { min-width: 0; }

/* 筛选区：紧凑卡片，保留高度避免跳位 */
.pro-filter {
  background: var(--lx-surface);
  border: 1px solid var(--lx-line-soft);
  border-radius: var(--lx-radius-lg);
  padding: 16px 16px 8px;
  margin-bottom: 16px;
  box-shadow: var(--lx-shadow-1);
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}

.filter-more {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  width: 100%;
  border-top: 1px dashed var(--lx-line-soft);
  padding-top: 12px;
  margin-top: 4px;
}

.filter-actions { margin-left: auto; }

.filter-applied {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 0 8px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: var(--lx-surface-2);
  color: var(--lx-text-2);
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.16s var(--lx-ease-out), color 0.16s var(--lx-ease-out);
}

.filter-chip:hover {
  background: var(--lx-brand-soft);
  color: var(--lx-brand-deep);
}

.filter-chip span { font-size: 14px; line-height: 1; }

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

/* 表格表面 */
.table-shell {
  background: var(--lx-surface);
  border-radius: var(--lx-radius-lg);
  box-shadow: var(--lx-shadow-1);
  padding: 8px 8px 12px;
  overflow: hidden;
}

.data-table { width: 100%; }

.pro-skeleton {
  background: var(--lx-surface);
  border-radius: var(--lx-radius-lg);
  box-shadow: var(--lx-shadow-1);
  padding: 20px 24px 24px;
}

.pro-skeleton__head,
.pro-skeleton__row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pro-skeleton__head {
  padding: 14px 0;
  border-bottom: 1px solid var(--lx-line-soft);
  margin-bottom: 6px;
}

.pro-skeleton__row {
  padding: 16px 0;
  border-bottom: 1px solid var(--lx-line-soft);
}

/* 分页 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 12px 4px;
  color: var(--lx-text-2);
  font-size: 13px;
}

.pagination b {
  color: var(--lx-text);
  font-weight: 700;
}

.pagination__total {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-size { width: 104px; }

@media (max-width: 1199px) {
  .pagination {
    flex-wrap: wrap;
  }
}
</style>
