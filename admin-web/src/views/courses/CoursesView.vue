<!-- 课程管理：分段控制器（课程 / 分类）+ 分组表单 + 统一图片上传 -->
<template>
  <div class="courses-page">
    <div class="lx-page-header">
      <div class="lx-page-header__main">
        <h1 class="lx-page-title">课程管理</h1>
        <p class="lx-page-desc">维护课程资料、上下架状态与分类展示顺序</p>
      </div>
      <div class="lx-page-actions">
        <el-button type="primary" :icon="Plus" @click="activeTab === 'courses' ? openCreate() : openCatCreate()">
          {{ activeTab === 'courses' ? '新增课程' : '新增分类' }}
        </el-button>
      </div>
    </div>

    <div class="segment" role="tablist" aria-label="课程管理视图">
      <span class="segment__thumb" :class="activeTab === 'categories' ? 'is-right' : ''" aria-hidden="true" />
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'courses'"
        class="segment__item"
        :class="{ active: activeTab === 'courses' }"
        @click="activeTab = 'courses'"
      >
        课程管理
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'categories'"
        class="segment__item"
        :class="{ active: activeTab === 'categories' }"
        @click="activeTab = 'categories'"
      >
        分类管理
      </button>
    </div>

    <!-- 课程管理 -->
    <div v-show="activeTab === 'courses'">
      <ProTable ref="tableRef" :request="courseApi.list" :columns="columns" :search="search" :actions-width="200">
        <template #cover="{ row }">
          <div class="cover-thumb">
            <el-image v-if="row.cover" :src="imgUrl(row.cover)" fit="cover" :preview-src-list="[imgUrl(row.cover)]" preview-teleported>
              <template #error>
                <div class="cover-fallback">课程封面</div>
              </template>
            </el-image>
            <div v-else class="cover-fallback">暂无封面</div>
          </div>
        </template>
        <template #courseInfo="{ row }">
          <div class="course-info">
            <div class="course-info__name">{{ row.name }}</div>
            <div class="course-info__meta">{{ row.category_name || '未分类' }} · {{ row.coach_name || '暂未排班' }}</div>
          </div>
        </template>
        <template #price="{ row }">
          <span class="course-price num">{{ formatPrice(row.price) }}</span>
        </template>
        <template #duration="{ row }">
          <span class="duration-cell num">{{ row.duration }} 分钟</span>
        </template>
        <template #status="{ row }">
          <span class="status-tag" :class="row.status === 'on' ? 'is-on' : 'is-off'">
            <i />
            {{ row.status === 'on' ? '上架中' : '已下架' }}
          </span>
        </template>
        <template #created_at="{ row }">{{ localDateStr(new Date(row.created_at)) }}</template>
        <template #actions="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link :type="row.status === 'on' ? 'warning' : 'success'" @click="toggleStatus(row)">
            {{ row.status === 'on' ? '下架' : '上架' }}
          </el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </ProTable>

      <ProForm
        v-model="dialogVisible"
        :title="editingId ? '编辑课程' : '新增课程'"
        :fields="formFields"
        :initial="currentRow"
        :submit="handleSubmit"
        :submit-text="editingId ? '保存修改' : '确认新增'"
        width="600px"
        @success="tableRef?.refresh()"
      />
    </div>

    <!-- 分类管理 -->
    <div v-show="activeTab === 'categories'" class="lx-panel">
      <el-table :data="categories" v-loading="catLoading" class="cat-table" empty-text="暂无分类，点击右上角新增分类">
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="name" label="分类名称" min-width="160" />
        <el-table-column prop="sort" label="排序" width="90" align="center" />
        <el-table-column prop="course_count" label="课程数" width="100" align="center">
          <template #default="{ row }">
            <span class="count-badge num">{{ row.course_count }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openCatEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleCatDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <ProForm
        v-model="catDialogVisible"
        :title="catEditingId ? '编辑分类' : '新增分类'"
        :fields="catFields"
        :initial="catCurrentRow"
        :submit="handleCatSubmit"
        :submit-text="catEditingId ? '保存修改' : '确认新增'"
        width="440px"
        @success="loadCategories"
      />
    </div>
  </div>
</template>
<script setup>
import { onMounted, reactive, ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { categoryApi, courseApi } from '../../api'
import ProTable from '../../components/ProTable.vue'
import ProForm from '../../components/ProForm.vue'
import { formatPrice, localDateStr } from '../../utils/format'
import { imgUrl } from '../../utils/imgUrl'

const activeTab = ref('courses')
const tableRef = ref()

const columns = [
  { prop: 'cover', label: '封面', width: 96, align: 'center' },
  { prop: 'courseInfo', label: '课程名称', minWidth: 220 },
  { prop: 'price', label: '价格', width: 100, align: 'right' },
  { prop: 'duration', label: '时长', width: 100, align: 'center' },
  { prop: 'status', label: '状态', width: 100 },
  { prop: 'created_at', label: '创建日期', width: 120, formatter: (r) => (r.created_at ? localDateStr(new Date(r.created_at)) : '-') }
]

// 搜索项用 reactive 包裹：异步加载 options 时保持响应式
const search = reactive([
  { type: 'input', prop: 'keyword', label: '课程名称', placeholder: '输入关键字' },
  { type: 'select', prop: 'category_id', label: '分类', options: [] },
  {
    type: 'select', prop: 'status', label: '状态',
    options: [
      { label: '上架中', value: 'on' },
      { label: '已下架', value: 'off' }
    ]
  }
])

// 分类下拉选项（搜索 + 表单共用）
const categoryOptions = ref([])
async function loadCategoryOptions() {
  try {
    const list = await categoryApi.list(true)
    categoryOptions.value = list.map((c) => ({ label: c.name, value: c.id }))
    search.find((s) => s.prop === 'category_id').options = categoryOptions.value
    formFields.value[0].options = categoryOptions.value
  } catch {
    /* 错误已由拦截器提示 */
  }
}

const formFields = ref([
  {
    prop: 'category_id', label: '课程分类', type: 'select', options: [],
    group: '基本信息', groupDesc: '用于课程筛选与会员端分类展示',
    rules: [{ required: true, message: '请选择分类', trigger: 'change' }]
  },
  { prop: 'name', label: '课程名称', group: '基本信息', placeholder: '例如：燃脂搏击操', rules: [{ required: true, message: '请输入课程名称', trigger: 'blur' }] },
  { prop: 'price', label: '价格（元）', type: 'number', min: 1, max: 9999, group: '基本信息', rules: [{ required: true, message: '请输入价格', trigger: 'change' }] },
  { prop: 'duration', label: '时长（分钟）', type: 'number', min: 15, max: 240, step: 15, group: '基本信息' },
  {
    prop: 'cover', label: '课程封面', type: 'upload', group: '展示信息', groupDesc: '会员端课程卡与详情页展示',
    uploadHint: '推荐 16:9 横图'
  },
  { prop: 'intro', label: '课程介绍', type: 'textarea', group: '展示信息', placeholder: '介绍课程内容、强度和适合人群' }
])

const dialogVisible = ref(false)
const editingId = ref(null)
const currentRow = ref({})

function openCreate() {
  editingId.value = null
  currentRow.value = {}
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  currentRow.value = { ...row }
  dialogVisible.value = true
}

async function handleSubmit(form) {
  if (editingId.value) {
    await courseApi.update(editingId.value, form)
  } else {
    await courseApi.create(form)
  }
}

async function toggleStatus(row) {
  const target = row.status === 'on' ? 'off' : 'on'
  const takingOff = target === 'off'
  try {
    await ElMessageBox.confirm(
      takingOff
        ? `下架后，「${row.name}」将不再出现在会员端，已有排班也会停止展示。`
        : `上架后，「${row.name}」将重新展示给会员。`,
      takingOff ? '下架课程' : '上架课程',
      {
        type: takingOff ? 'warning' : 'info',
        confirmButtonText: takingOff ? '确认下架' : '确认上架',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }
  try {
    await courseApi.updateStatus(row.id, target)
    ElMessage.success(target === 'on' ? '课程已上架' : '课程已下架')
    tableRef.value?.refresh()
  } catch {
    /* 错误已由拦截器提示 */
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `删除「${row.name}」后，课程资料与图片引用将移除；已有预约记录的排班无法直接删除。`,
      '删除课程',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }
  try {
    await courseApi.remove(row.id)
    ElMessage.success('课程已删除')
    tableRef.value?.refresh()
  } catch {
    /* 错误已由拦截器提示 */
  }
}
// ===== 分类管理 =====
const categories = ref([])
const catLoading = ref(false)
const catDialogVisible = ref(false)
const catEditingId = ref(null)
const catCurrentRow = ref({})

const catFields = ref([
  { prop: 'name', label: '分类名称', placeholder: '例如：团操', rules: [{ required: true, message: '请输入分类名称', trigger: 'blur' }] },
  { prop: 'sort', label: '排序', type: 'number', min: 0, max: 999 }
])

async function loadCategories() {
  catLoading.value = true
  try {
    categories.value = await categoryApi.list(true)
  } catch {
    /* 错误已由拦截器提示 */
  } finally {
    catLoading.value = false
  }
}

function openCatCreate() {
  catEditingId.value = null
  catCurrentRow.value = {}
  catDialogVisible.value = true
}

function openCatEdit(row) {
  catEditingId.value = row.id
  catCurrentRow.value = { ...row }
  catDialogVisible.value = true
}

async function handleCatSubmit(form) {
  if (catEditingId.value) {
    await categoryApi.update(catEditingId.value, form)
  } else {
    await categoryApi.create(form)
  }
  await loadCategoryOptions()
}

async function handleCatDelete(row) {
  try {
    await ElMessageBox.confirm(
      `删除分类「${row.name}」后，相关课程需要重新指定分类。`,
      '删除分类',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }
  try {
    await categoryApi.remove(row.id)
    ElMessage.success('分类已删除')
    loadCategories()
    loadCategoryOptions()
  } catch {
    /* 错误已由拦截器提示（如分类下有课程 409） */
  }
}

onMounted(() => {
  loadCategories()
  loadCategoryOptions()
})
</script>
<style scoped>
/* 分段控制器：滑动底板 + 白色选中项 */
.segment {
  position: relative;
  display: inline-flex;
  width: 320px;
  max-width: 100%;
  height: 44px;
  padding: 4px;
  margin-bottom: 16px;
  border-radius: var(--lx-radius-md);
  background: var(--lx-surface-2);
  border: 1px solid var(--lx-line-soft);
}

.segment__thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: 34px;
  border-radius: 10px;
  background: var(--lx-surface);
  box-shadow: var(--lx-shadow-1);
  transition: transform 0.22s var(--lx-ease-out);
}

.segment__thumb.is-right {
  transform: translateX(100%);
}

.segment__item {
  position: relative;
  z-index: 1;
  flex: 1;
  border: 0;
  background: transparent;
  color: var(--lx-text-2);
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: color 0.2s var(--lx-ease-out), transform 0.12s var(--lx-ease-out);
}

.segment__item.active {
  color: var(--lx-text);
}

.segment__item:active {
  transform: scale(0.97);
}

.segment__item:focus-visible {
  outline: 2px solid var(--lx-brand);
  outline-offset: -2px;
}

/* 课程封面：统一 3:2 比例 */
.cover-thumb {
  width: 72px;
  height: 48px;
  margin: 0 auto;
  border-radius: var(--lx-radius-sm);
  overflow: hidden;
  background: var(--lx-surface-2);
}

.cover-thumb :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--lx-text-3);
}

.course-info__name {
  font-weight: 600;
  color: var(--lx-text);
}

.course-info__meta {
  margin-top: 3px;
  font-size: 12px;
  color: var(--lx-text-2);
}

.course-price {
  color: var(--lx-coral);
  font-weight: 700;
}

.duration-cell {
  color: var(--lx-text-2);
}

.status-tag {
  display: inline-flex;
  align-items: center;
  min-width: 66px;
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

.status-tag.is-on {
  color: #1f9d58;
  background: var(--lx-success-soft);
}

.status-tag.is-on i { background: var(--lx-success); }

.status-tag.is-off {
  color: var(--lx-text-2);
  background: var(--lx-surface-2);
}

.status-tag.is-off i { background: var(--lx-text-3); }

.count-badge {
  display: inline-flex;
  min-width: 30px;
  height: 26px;
  padding: 0 9px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--lx-brand-soft);
  color: var(--lx-brand-deep);
  font-size: 12px;
  font-weight: 700;
}

.cat-table {
  width: 100%;
}
</style>
