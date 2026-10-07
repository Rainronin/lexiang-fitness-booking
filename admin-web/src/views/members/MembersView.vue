<!-- 会员管理：页面头 + ProTable（身份信息合并）+ 危险停用确认 -->
<template>
  <div class="members-page">
    <div class="lx-page-header">
      <div class="lx-page-header__main">
        <h1 class="lx-page-title">会员管理</h1>
        <p class="lx-page-desc">{{ headerDesc }}</p>
      </div>
      <div class="lx-page-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">新增会员</el-button>
      </div>
    </div>

    <ProTable
      ref="tableRef"
      :request="memberApi.list"
      :columns="columns"
      :search="search"
      :actions-width="150"
    >
      <template #identity="{ row }">
        <div class="identity">
          <div class="identity__name">{{ row.nickname || '未设置昵称' }}</div>
          <div class="identity__phone num">{{ row.phone }}</div>
        </div>
      </template>
      <template #gender="{ row }">
        {{ row.gender === 'male' ? '男' : row.gender === 'female' ? '女' : '-' }}
      </template>
      <template #status="{ row }">
        <span class="status-tag" :class="row.status === 'active' ? 'is-active' : 'is-disabled'">
          <i />
          {{ row.status === 'active' ? '正常' : '已停用' }}
        </span>
      </template>
      <template #booking_count="{ row }">
        <span class="count-badge num">{{ row.booking_count || 0 }}</span>
      </template>
      <template #created_at="{ row }">{{ formatDateTime(row.created_at) }}</template>
      <template #actions="{ row }">
        <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-button
          link
          :type="row.status === 'active' ? 'danger' : 'primary'"
          @click="toggleStatus(row)"
        >
          {{ row.status === 'active' ? '停用' : '启用' }}
        </el-button>
      </template>
    </ProTable>

    <ProForm
      v-model="dialogVisible"
      :title="editingId ? '编辑会员' : '新增会员'"
      :fields="formFields"
      :initial="currentRow"
      :submit="handleSubmit"
      :submit-text="editingId ? '保存修改' : '确认新增'"
      @success="tableRef?.refresh()"
    />
  </div>
</template>
<script setup>
import { computed, ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { memberApi } from '../../api'
import ProTable from '../../components/ProTable.vue'
import ProForm from '../../components/ProForm.vue'
import { formatDateTime } from '../../utils/format'

const tableRef = ref()

const headerDesc = computed(() => {
  const n = tableRef.value?.total
  return n ? `共 ${n} 条会员记录，可查看状态与有效预约数` : '查询会员状态、编辑资料并管理预约资格'
})

const columns = [
  { prop: 'id', label: 'ID', width: 70, align: 'center' },
  { prop: 'identity', label: '会员', minWidth: 190 },
  { prop: 'gender', label: '性别', width: 80, align: 'center' },
  { prop: 'status', label: '状态', width: 100 },
  { prop: 'booking_count', label: '有效预约数', width: 110, align: 'center' },
  { prop: 'created_at', label: '注册时间', width: 170 }
]

const search = [
  { type: 'input', prop: 'keyword', label: '手机号/昵称', placeholder: '输入关键字' },
  {
    type: 'select', prop: 'status', label: '状态',
    options: [
      { label: '正常', value: 'active' },
      { label: '停用', value: 'disabled' }
    ]
  }
]

const formFields = [
  { prop: 'phone', label: '手机号', placeholder: '请输入 11 位手机号', rules: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入 11 位手机号', trigger: 'blur' }
  ] },
  { prop: 'nickname', label: '昵称', placeholder: '例如：小乐' },
  {
    prop: 'gender', label: '性别', type: 'select', placeholder: '请选择性别',
    options: [
      { label: '男', value: 'male' },
      { label: '女', value: 'female' }
    ]
  }
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
    await memberApi.update(editingId.value, form)
  } else {
    await memberApi.create(form)
  }
}

async function toggleStatus(row) {
  const disabling = row.status === 'active'
  const title = disabling ? '停用会员' : '启用会员'
  const content = disabling
    ? `停用后，「${row.nickname || row.phone}」将无法登录会员端，也不能继续预约课程。`
    : `启用后，「${row.nickname || row.phone}」可恢复登录和预约。`
  try {
    await ElMessageBox.confirm(content, title, {
      type: disabling ? 'warning' : 'info',
      confirmButtonText: disabling ? '确认停用' : '确认启用',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  try {
    await memberApi.updateStatus(row.id, disabling ? 'disabled' : 'active')
    ElMessage.success(disabling ? '会员已停用' : '会员已启用')
    tableRef.value?.refresh()
  } catch {
    /* 错误已由拦截器提示 */
  }
}
</script>
<style scoped>
.identity__name {
  font-weight: 600;
  color: var(--lx-text);
}

.identity__phone {
  margin-top: 2px;
  font-size: 12px;
  color: var(--lx-text-2);
}

.status-tag {
  display: inline-flex;
  align-items: center;
  min-width: 64px;
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

.status-tag.is-active {
  color: #1f9d58;
  background: var(--lx-success-soft);
}

.status-tag.is-active i { background: var(--lx-success); }

.status-tag.is-disabled {
  color: var(--lx-danger);
  background: var(--lx-danger-soft);
}

.status-tag.is-disabled i { background: var(--lx-danger); }

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
</style>
