<!-- 排班设置：教练任务栏 + 浮动课程容量工具条 + 轻量时间块网格 + 保存动态胶囊
     交互：① 点击空格子 → 用工具条当前"课程+容量"直接填入；② 点击已排格子 → 选中并同步工具条（可改容量）；
           ③ 再次点击已选中格子 → 确认移除，可短暂撤销；④ 工具条变化实时应用到选中格子 -->
<template>
  <div class="schedule-page">
    <!-- 任务栏 -->
    <div class="taskbar lx-panel">
      <div class="taskbar-left">
        <el-button link class="back-btn" :icon="ArrowLeft" @click="$router.push('/coaches')">
          教练管理
        </el-button>
        <div class="coach-unit">
          <span class="coach-avatar">{{ (coachName || '教')[0] }}</span>
          <div class="coach-meta">
            <div class="coach-name">{{ coachName || '加载中...' }}</div>
            <div class="coach-desc">每周排班 · {{ TIME_SLOTS.length }} 个固定时段</div>
          </div>
        </div>
        <span class="lx-dynamic-capsule" :class="capsuleClass">
          <span class="lx-dynamic-capsule__dot" />
          {{ capsuleText }}
        </span>
      </div>
      <el-button type="primary" class="save-btn" :loading="saving" @click="handleSave">
        {{ saving ? '正在保存排班' : '保存排班' }}
      </el-button>
    </div>

    <!-- 浮动课程 / 容量工具条 -->
    <div class="control-panel lx-panel">
      <div class="control-head">
        <div>
          <div class="control-title">课程与容量</div>
          <div class="control-desc">选择课程后点击空格子填入；点击已排格子可修改或移除</div>
        </div>
        <span v-if="selectedCell" class="selected-hint">正在编辑：{{ selectedLabel }}</span>
      </div>
      <div class="control-body">
        <label class="control-label" for="schedule-course">课程</label>
        <el-select
          id="schedule-course"
          v-model="draftCourseId"
          placeholder="选择课程"
          style="width: 260px"
        >
          <el-option
            v-for="c in onCourses"
            :key="c.id"
            :label="c.status === 'off' ? `${c.name}（已下架）` : c.name"
            :value="c.id"
          />
        </el-select>

        <label class="control-label" for="schedule-capacity">容量</label>
        <el-input-number id="schedule-capacity" v-model="draftCapacity" :min="1" :max="100" />
        <span class="capacity-unit">人 / 节</span>
      </div>

      <!-- 移除撤销入口 -->
      <transition name="undo-fade">
        <div v-if="lastRemoved" class="undo-bar">
          <span>已移除 {{ lastRemoved.label }}，保存后生效</span>
          <el-button link type="primary" @click="undoRemove">撤销</el-button>
        </div>
      </transition>
    </div>

    <!-- 排班网格 -->
    <div v-loading="loading" class="grid-panel lx-panel">
      <div class="grid-legend">
        <span><i class="legend-dot is-empty" />空格子</span>
        <span><i class="legend-dot is-filled" />已排课程</span>
        <span><i class="legend-dot is-selected" />当前选中</span>
        <span><i class="legend-dot is-off" />已下架课程</span>
      </div>

      <div class="grid-scroll">
        <div class="schedule-grid">
          <div class="grid-corner">时段</div>
          <div v-for="(_, wd) in 7" :key="wd" class="grid-head">{{ WEEKDAYS[wd] }}</div>

          <template v-for="row in gridRows" :key="row.time_slot">
            <div class="time-cell">
              <span class="time-cell__main">{{ row.time_slot }}</span>
            </div>
            <button
              v-for="(_, wd) in 7"
              :key="`${row.time_slot}-${wd}`"
              type="button"
              class="cell"
              :class="{
                filled: isFilled(row.time_slot, wd),
                selected: isSelected(row.time_slot, wd),
                'is-off': isOffCourse(row.time_slot, wd)
              }"
              :aria-label="cellAriaLabel(row.time_slot, wd)"
              @click="handleCellClick(row.time_slot, wd)"
            >
              <template v-if="isFilled(row.time_slot, wd)">
                <div class="course-name">{{ getCell(row.time_slot, wd).course_name }}</div>
                <div class="capacity">限 {{ getCell(row.time_slot, wd).capacity }} 人</div>
              </template>
              <span v-else class="empty"><b>＋</b>添加</span>
            </button>
          </template>
        </div>
      </div>
    </div>

    <el-alert
      v-if="errorMsg"
      :title="errorMsg"
      type="error"
      show-icon
      :closable="false"
      class="error-alert"
    />
  </div>
</template>
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { coachApi, courseApi } from '../../api'
import { WEEKDAYS } from '../../utils/format'

const route = useRoute()
const coachId = route.params.id
const coachName = ref('')
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const saveState = ref('idle') // idle | saving | saved | error
const snapshot = ref(null)
const lastRemoved = ref(null)
let undoTimer = null

const TIME_SLOTS = ['09:00-10:00', '10:00-11:00', '14:00-15:00', '15:00-16:00', '19:00-20:00', '20:00-21:00']
const gridRows = TIME_SLOTS.map((t) => ({ time_slot: t }))

// 当前排班 Map: key = `${weekday}|${time_slot}` → { course_id, course_name, course_status, capacity, weekday, time_slot }
const scheduleMap = ref({})
const draftCourseId = ref(null)
const draftCapacity = ref(10)
const selectedCell = ref('')
const onCourses = ref([])

const cellKey = (timeSlot, weekday) => `${weekday}|${timeSlot}`
const getCell = (timeSlot, weekday) => scheduleMap.value[cellKey(timeSlot, weekday)]
const isFilled = (timeSlot, weekday) => !!getCell(timeSlot, weekday)
const isSelected = (timeSlot, weekday) => selectedCell.value === cellKey(timeSlot, weekday)
const isOffCourse = (timeSlot, weekday) => getCell(timeSlot, weekday)?.course_status === 'off'

const selectedLabel = computed(() => {
  if (!selectedCell.value) return ''
  const [wd, timeSlot] = selectedCell.value.split('|')
  const cell = scheduleMap.value[selectedCell.value]
  return cell ? `${WEEKDAYS[Number(wd)]} ${timeSlot} · ${cell.course_name}` : `${WEEKDAYS[Number(wd)]} ${timeSlot}`
})

function cellAriaLabel(timeSlot, weekday) {
  const cell = getCell(timeSlot, weekday)
  if (!cell) return `${WEEKDAYS[weekday]} ${timeSlot}，空格子，点击添加`
  return `${WEEKDAYS[weekday]} ${timeSlot}，${cell.course_name}，容量 ${cell.capacity} 人`
}

// 当前排班签名：用于未保存变更检测
function signatureOf(map) {
  return JSON.stringify(
    Object.values(map)
      .map((v) => [v.weekday, v.time_slot, v.course_id, v.capacity])
      .sort((a, b) => (a[0] - b[0]) || a[1].localeCompare(b[1]))
  )
}

const currentSignature = computed(() => signatureOf(scheduleMap.value))
const isDirty = computed(() => snapshot.value !== null && snapshot.value !== currentSignature.value)

const capsuleClass = computed(() => {
  if (saveState.value === 'saving') return 'is-saving'
  if (saveState.value === 'saved') return 'is-saved'
  if (saveState.value === 'error') return 'is-error'
  return isDirty.value ? 'is-dirty' : ''
})

const capsuleText = computed(() => {
  if (saveState.value === 'saving') return '正在保存排班'
  if (saveState.value === 'saved') return '排班已保存'
  if (saveState.value === 'error') return '保存失败，请检查错误'
  return isDirty.value ? '未保存变更' : '暂无变更'
})

// 工具条课程/容量变化 → 实时应用到选中格子；有改动时退出“已保存”状态
watch([draftCourseId, draftCapacity], () => {
  if (selectedCell.value) applyToSelected()
  if (saveState.value === 'saved') saveState.value = isDirty.value ? 'idle' : 'saved'
})

watch(isDirty, (dirty) => {
  if (dirty && saveState.value === 'saved') saveState.value = 'idle'
})

// 点击格子：空格子直接填入；已排格子选中/同步；再点已选中格子移除
function handleCellClick(timeSlot, weekday) {
  const key = cellKey(timeSlot, weekday)
  const existing = scheduleMap.value[key]

  if (selectedCell.value === key) {
    if (existing) {
      removeCell(key)
    } else {
      selectedCell.value = ''
    }
    return
  }

  selectedCell.value = key
  if (existing) {
    // 已排：同步工具条（方便调整容量/换课程）
    draftCourseId.value = existing.course_id
    draftCapacity.value = existing.capacity
  } else if (draftCourseId.value) {
    // 空格子：直接应用当前工具条选择
    applyToSelected()
  } else {
    ElMessage.warning('请先在工具条选择课程')
  }
}

function removeCell(key) {
  const cell = scheduleMap.value[key]
  if (!cell) return
  const [wd, timeSlot] = key.split('|')
  const label = `${WEEKDAYS[Number(wd)]} ${timeSlot}`
  ElMessageBox.confirm(`确定移除「${label}」的排班吗？保存后生效。`, '移除排班', {
    type: 'warning',
    confirmButtonText: '确认移除',
    cancelButtonText: '取消'
  })
    .then(() => {
      lastRemoved.value = { key, label, cell: { ...cell } }
      delete scheduleMap.value[key]
      selectedCell.value = ''
      if (undoTimer) clearTimeout(undoTimer)
      undoTimer = setTimeout(() => {
        lastRemoved.value = null
      }, 5000)
    })
    .catch(() => {}) // 用户取消
}

function undoRemove() {
  if (!lastRemoved.value) return
  const { key, cell } = lastRemoved.value
  scheduleMap.value[key] = { ...cell }
  lastRemoved.value = null
  if (undoTimer) clearTimeout(undoTimer)
}

// 将工具条当前选择应用到选中格子
function applyToSelected() {
  if (!selectedCell.value || !draftCourseId.value) return
  const [wd, timeSlot] = selectedCell.value.split('|')
  const course = onCourses.value.find((c) => c.id === draftCourseId.value)
  if (!course) return
  scheduleMap.value[selectedCell.value] = {
    course_id: course.id,
    course_name: course.name,
    course_status: course.status,
    capacity: draftCapacity.value,
    weekday: Number(wd),
    time_slot: timeSlot
  }
}

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [scheduleData, courses] = await Promise.all([
      coachApi.getSchedule(coachId),
      courseApi.list({ status: 'all', pageSize: 100 })
    ])
    coachName.value = scheduleData.coach.name
    // 加载全部课程：下架课程仍可显示/编辑旧排班，但新增下架课程排班由后端校验拒绝
    onCourses.value = courses.list
    scheduleMap.value = {}
    scheduleData.list.forEach((s) => {
      const course = courses.list.find((c) => c.id === s.course_id)
      scheduleMap.value[cellKey(s.time_slot, s.weekday)] = {
        course_id: s.course_id,
        course_name: s.course_name,
        course_status: course?.status || 'on',
        capacity: s.capacity,
        weekday: s.weekday,
        time_slot: s.time_slot
      }
    })
    snapshot.value = signatureOf(scheduleMap.value)
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  const schedules = Object.values(scheduleMap.value).map((v) => ({
    course_id: v.course_id,
    weekday: v.weekday,
    time_slot: v.time_slot,
    capacity: v.capacity
  }))
  saving.value = true
  saveState.value = 'saving'
  errorMsg.value = ''
  try {
    await coachApi.saveSchedule(coachId, schedules)
    saveState.value = 'saved'
    ElMessage.success('排班已保存')
    await load()
    snapshot.value = signatureOf(scheduleMap.value)
    // 保存成功状态停留片刻后回到“暂无变更”
    setTimeout(() => {
      if (!isDirty.value && saveState.value === 'saved') saveState.value = 'idle'
    }, 1600)
  } catch (e) {
    errorMsg.value = e.message || '保存失败，请重试'
    saveState.value = 'error'
  } finally {
    saving.value = false
  }
}

async function confirmLeave() {
  if (!isDirty.value) return true
  try {
    await ElMessageBox.confirm(
      '排班尚未保存，离开后本次修改将丢失。',
      '离开排班设置？',
      { confirmButtonText: '确认离开', cancelButtonText: '继续编辑', type: 'warning' }
    )
    return true
  } catch {
    return false
  }
}

function handleBeforeUnload(event) {
  if (!isDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(confirmLeave)

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  load()
})

onBeforeUnmount(() => {
  if (undoTimer) clearTimeout(undoTimer)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>
<style scoped>
.schedule-page { min-width: 0; }

/* 任务栏 */
.taskbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  position: sticky;
  top: 76px;
  z-index: 15;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .taskbar { background: rgba(255, 255, 255, 0.97); }
}

.taskbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.back-btn { flex-shrink: 0; }

.coach-unit {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.coach-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--lx-brand-soft);
  color: var(--lx-brand);
  font-size: 17px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.coach-name {
  font-weight: 700;
  color: var(--lx-text);
}

.coach-desc {
  margin-top: 2px;
  font-size: 11px;
  color: var(--lx-text-3);
}

.save-btn { min-width: 132px; }

/* 浮动控制面板 */
.control-panel {
  margin-top: 16px;
  padding: 16px 20px;
  position: sticky;
  top: 164px;
  z-index: 12;
}

.control-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.control-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--lx-text);
}

.control-desc {
  margin-top: 3px;
  font-size: 12px;
  color: var(--lx-text-2);
}

.selected-hint {
  font-size: 12px;
  color: var(--lx-brand);
  background: var(--lx-brand-soft);
  border-radius: 999px;
  padding: 6px 12px;
  white-space: nowrap;
}

.control-body {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.control-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--lx-text-2);
}

.capacity-unit {
  font-size: 12px;
  color: var(--lx-text-3);
}

.undo-bar {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: var(--lx-radius-sm);
  background: var(--lx-warning-soft);
  color: #8a6116;
  font-size: 12px;
  padding: 8px 12px;
}

/* 网格 */
.grid-panel { margin-top: 16px; }

.grid-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--lx-text-2);
}

.grid-legend span { display: inline-flex; align-items: center; gap: 6px; }

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}

.legend-dot.is-empty { border: 1px dashed rgba(60, 60, 67, 0.28); background: var(--lx-bg); }
.legend-dot.is-filled { background: var(--lx-brand-soft); border: 1px solid rgba(0, 122, 255, 0.25); }
.legend-dot.is-selected { background: var(--lx-brand); box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.14); }
.legend-dot.is-off { background: var(--lx-warning-soft); border: 1px solid rgba(245, 165, 36, 0.35); }

.grid-scroll { overflow-x: auto; padding-bottom: 4px; }

.schedule-grid {
  display: grid;
  grid-template-columns: 100px repeat(7, minmax(118px, 1fr));
  gap: 8px;
  min-width: 960px;
}

.grid-corner,
.grid-head {
  height: 34px;
  display: flex;
  align-items: center;
  color: var(--lx-text-2);
  font-size: 12px;
  font-weight: 600;
}

.grid-corner { justify-content: flex-start; }
.grid-head { justify-content: center; }

.time-cell {
  min-height: 58px;
  display: flex;
  align-items: center;
  color: var(--lx-text-2);
  font-size: 12px;
}

.time-cell__main {
  font-variant-numeric: tabular-nums;
}

.cell {
  width: 100%;
  min-height: 58px;
  border-radius: var(--lx-radius-sm);
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
  border: 1px dashed rgba(60, 60, 67, 0.18);
  background: var(--lx-bg);
  color: var(--lx-text-3);
  font: inherit;
  transition: transform 0.12s var(--lx-ease-out), border-color 0.18s var(--lx-ease-out),
    background-color 0.18s var(--lx-ease-out), box-shadow 0.18s var(--lx-ease-out);
}

.cell:hover {
  border-color: var(--lx-brand);
  color: var(--lx-brand);
}

.cell:active { transform: scale(0.97); }

.cell.empty { font-size: 12px; }
.cell.empty b { font-weight: 600; }

.cell.filled {
  border: 1px solid rgba(0, 122, 255, 0.22);
  background: var(--lx-brand-soft);
  color: var(--lx-text);
  animation: cell-fill 0.12s var(--lx-ease-out);
}

.cell.filled:hover { border-color: var(--lx-brand); }

.cell.selected {
  border-color: var(--lx-brand);
  background: #dcecff;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12);
}

.cell.is-off {
  border-color: rgba(245, 165, 36, 0.4);
  background: var(--lx-warning-soft);
}

.course-name {
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  line-height: 1.35;
  color: var(--lx-text);
  max-width: 100%;
}

.capacity {
  font-size: 11px;
  color: var(--lx-text-2);
  font-variant-numeric: tabular-nums;
}

@keyframes cell-fill {
  from { transform: scale(0.96); opacity: 0.5; }
  to { transform: scale(1); opacity: 1; }
}

.error-alert { margin-top: 16px; }

.undo-fade-enter-active,
.undo-fade-leave-active { transition: opacity 0.18s var(--lx-ease-out), transform 0.18s var(--lx-ease-out); }
.undo-fade-enter-from,
.undo-fade-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-width: 1199px) {
  .taskbar,
  .control-panel { position: static; }
}
</style>
