<!-- 教练管理：身份信息合并 + 排班设置为每行主操作 -->
<template>
  <div class="coaches-page">
    <div class="lx-page-header">
      <div class="lx-page-header__main">
        <h1 class="lx-page-title">教练管理</h1>
        <p class="lx-page-desc">{{ headerDesc }}</p>
      </div>
      <div class="lx-page-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">新增教练</el-button>
      </div>
    </div>

    <ProTable ref="tableRef" :request="loadCoaches" :columns="columns" :actions-width="260">
      <template #identity="{ row }">
        <div class="coach-identity" :class="{ 'is-off': row.status !== 'active' }">
          <div class="coach-avatar">
            <el-avatar :src="row.avatar ? imgUrl(row.avatar) : ''" :size="42">{{ row.name?.[0] }}</el-avatar>
          </div>
          <div class="coach-meta">
            <div class="coach-name">{{ row.name }}</div>
            <div class="coach-title">{{ row.title || '未设置头衔' }}</div>
          </div>
        </div>
      </template>
      <template #schedule_count="{ row }">
        <span class="schedule-badge num">
          <i />
          {{ row.schedule_count || 0 }} 节 / 周
        </span>
      </template>
      <template #status="{ row }">
        <span class="status-tag" :class="row.status === 'active' ? 'is-active' : 'is-off'">
          <i />
          {{ row.status === 'active' ? '在职' : '已停用' }}
        </span>
      </template>
      <template #created_at="{ row }">{{ row.created_at ? localDateStr(new Date(row.created_at)) : '-' }}</template>
      <template #actions="{ row }">
        <el-button link type="primary" :icon="Calendar" @click="$router.push(`/coaches/${row.id}/schedule`)">
          排班设置
        </el-button>
        <el-button link @click="openEdit(row)">编辑</el-button>
        <el-button link :type="row.status === 'active' ? 'warning' : 'success'" @click="toggleStatus(row)">
          {{ row.status === 'active' ? '停用' : '启用' }}
        </el-button>
        <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
      </template>
    </ProTable>

    <ProForm
      v-model="dialogVisible"
      :title="editingId ? '编辑教练' : '新增教练'"
      :fields="formFields"
      :initial="currentRow"
      :submit="handleSubmit"
      :submit-text="editingId ? '保存修改' : '确认新增'"
      width="600px"
      @success="tableRef?.refresh()"
    />
  </div>
</template>
<script setup>
import { computed, ref } from 'vue'
import { Plus, Calendar } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { coachApi } from '../../api'
import ProTable from '../../components/ProTable.vue'
import ProForm from '../../components/ProForm.vue'
import { imgUrl } from '../../utils/imgUrl'
import { localDateStr } from '../../utils/format'

// 教练接口支持分页（?all=1 返回 {list,total}）
function loadCoaches(params) {
  return coachApi.list(true, params)
}

const tableRef = ref()

const headerDesc = computed(() => {
  const n = tableRef.value?.total
  return n ? `共 ${n} 位教练，可维护资料、在职状态与每周排班` : '维护教练资料、状态与每周排班'
})

const columns = [
  { prop: 'identity', label: '教练', minWidth: 210 },
  { prop: 'intro', label: '简介', minWidth: 200 },
  { prop: 'schedule_count', label: '周排班', width: 110, align: 'center' },
  { prop: 'status', label: '状态', width: 100 },
  { prop: 'created_at', label: '入职日期', width: 120, formatter: (r) => (r.created_at ? localDateStr(new Date(r.created_at)) : '-') }
]

const formFields = [
  { prop: 'name', label: '姓名', group: '教练资料', placeholder: '请输入教练姓名', rules: [{ required: true, message: '请输入姓名', trigger: 'blur' }] },
  { prop: 'title', label: '头衔', group: '教练资料', placeholder: '如：高级私教' },
  {
    prop: 'avatar', label: '教练头像', type: 'upload', group: '展示资料',
    uploadHint: '推荐 1:1 正方形'
  },
  { prop: 'intro', label: '简介', type: 'textarea', group: '展示资料', placeholder: '介绍教学方向与擅长项目' }
]

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
    await coachApi.update(editingId.value, form)
  } else {
    await coachApi.create(form)
  }
}

async function toggleStatus(row) {
  const disabling = row.status === 'active'
  try {
    await ElMessageBox.confirm(
      disabling
        ? `停用后，「${row.name}」不再展示在会员端，也不能被安排新排班。`
        : `启用后，「${row.name}」将重新展示给会员。`,
      disabling ? '停用教练' : '启用教练',
      {
        type: disabling ? 'warning' : 'info',
        confirmButtonText: disabling ? '确认停用' : '确认启用',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }
  try {
    await coachApi.update(row.id, { status: disabling ? 'inactive' : 'active' })
    ElMessage.success(disabling ? '教练已停用' : '教练已启用')
    tableRef.value?.refresh()
  } catch {
    /* 错误已由拦截器提示 */
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `删除「${row.name}」会移除其全部资料；已有排班的教练无法删除。`,
      '删除教练',
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
    await coachApi.remove(row.id)
    ElMessage.success('教练已删除')
    tableRef.value?.refresh()
  } catch {
    /* 错误已由拦截器提示 */
  }
}
</script>
<style scoped>
.coach-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.coach-avatar {
  flex-shrink: 0;
}

.coach-identity.is-off .coach-avatar {
  filter: grayscale(1);
  opacity: 0.55;
}

.coach-name {
  font-weight: 600;
  color: var(--lx-text);
}

.coach-title {
  margin-top: 3px;
  font-size: 12px;
  color: var(--lx-text-2);
}

.coach-identity.is-off .coach-name,
.coach-identity.is-off .coach-title {
  color: var(--lx-text-3);
}

.schedule-badge {
  display: inline-flex;
  align-items: center;
  min-width: 82px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--lx-brand-soft);
  color: var(--lx-brand-deep);
  font-size: 12px;
  font-weight: 700;
}

.schedule-badge i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--lx-brand);
  margin-right: 6px;
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

.status-tag.is-active { color: #1f9d58; background: var(--lx-success-soft); }
.status-tag.is-active i { background: var(--lx-success); }
.status-tag.is-off { color: var(--lx-text-2); background: var(--lx-surface-2); }
.status-tag.is-off i { background: var(--lx-text-3); }
</style>
