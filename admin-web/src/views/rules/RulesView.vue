<!-- 预约规则（仅管理员）：规则说明 + 配置表单双栏，保存后页内连续反馈 -->
<template>
  <div class="rules-page">
    <div class="lx-page-header">
      <div class="lx-page-header__main">
        <h1 class="lx-page-title">预约规则</h1>
        <p class="lx-page-desc">控制会员可预约的日期范围与每日预约上限，保存后立即生效</p>
      </div>
    </div>

    <div v-loading="loading" class="rules-layout">
      <aside class="lx-panel rule-intro">
        <h3 class="lx-panel__title">规则说明</h3>
        <p class="lx-panel__desc">以下规则同时作用于会员端日期选择与后端预约校验。</p>
        <ol class="rule-steps">
          <li>
            <span class="rule-step__num">1</span>
            <div>
              <b>提前预约天数</b>
              <p>会员可预约今天至未来 <em>{{ form.advance_days }}</em> 天内的课程，超出范围的日期不会展示。</p>
            </div>
          </li>
          <li>
            <span class="rule-step__num">2</span>
            <div>
              <b>每日预约上限</b>
              <p>同一会员同一天最多预约 <em>{{ form.daily_limit }}</em> 节课程，重复提交会被后端拒绝。</p>
            </div>
          </li>
          <li>
            <span class="rule-step__num">3</span>
            <div>
              <b>立即生效</b>
              <p>保存后无需重启服务，会员端下一次加载即使用新规则。</p>
            </div>
          </li>
        </ol>
      </aside>

      <div class="lx-panel rule-form-panel">
        <el-alert
          v-if="errorMsg"
          :title="errorMsg"
          type="error"
          show-icon
          :closable="false"
          class="rule-error"
        />
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
          <div class="rule-fields">
            <el-form-item label="提前预约天数" prop="advance_days">
              <div class="rule-control">
                <el-input-number v-model="form.advance_days" :min="1" :max="30" :precision="0" :step="1" />
                <span class="rule-unit">天</span>
              </div>
              <div class="rule-hint">范围 1–30 天；例如设置为 7，会员最多可约到未来第 7 天。</div>
            </el-form-item>
            <el-form-item label="每会员每日预约上限" prop="daily_limit">
              <div class="rule-control">
                <el-input-number v-model="form.daily_limit" :min="1" :max="10" :precision="0" :step="1" />
                <span class="rule-unit">节 / 天</span>
              </div>
              <div class="rule-hint">范围 1–10 节；同一会员同一天达到上限后不可继续提交。</div>
            </el-form-item>
          </div>

          <div class="rule-actions">
            <el-button type="primary" :loading="saving" @click="handleSave">
              {{ saving ? '正在保存规则' : '保存规则' }}
            </el-button>
            <span class="lx-dynamic-capsule" :class="capsuleClass">
              <span class="lx-dynamic-capsule__dot" />
              {{ capsuleText }}
            </span>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ruleApi } from '../../api'

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const saveState = ref('idle') // idle | saving | saved | error
const formRef = ref()
const form = reactive({ advance_days: 7, daily_limit: 3 })
const rules = {
  advance_days: [{ required: true, message: '请输入提前预约天数', trigger: 'change' }],
  daily_limit: [{ required: true, message: '请输入每日预约上限', trigger: 'change' }]
}

const capsuleClass = computed(() => {
  if (saveState.value === 'saving') return 'is-saving'
  if (saveState.value === 'saved') return 'is-saved'
  if (saveState.value === 'error') return 'is-error'
  return ''
})

const capsuleText = computed(() => {
  if (saveState.value === 'saving') return '正在保存规则'
  if (saveState.value === 'saved') return '规则已更新，立即生效'
  if (saveState.value === 'error') return '保存失败，请重试'
  return '修改后记得保存'
})

async function load() {
  loading.value = true
  try {
    const data = await ruleApi.get()
    form.advance_days = data.advance_days
    form.daily_limit = data.daily_limit
  } catch {
    /* 错误已由拦截器提示 */
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  try {
    await formRef.value.validate()
  } catch {
    return // 校验失败
  }
  saving.value = true
  saveState.value = 'saving'
  errorMsg.value = ''
  try {
    await ruleApi.update({ ...form })
    saveState.value = 'saved'
    setTimeout(() => {
      if (saveState.value === 'saved') saveState.value = 'idle'
    }, 1800)
  } catch (e) {
    errorMsg.value = e?.message || '保存失败，请稍后重试'
    saveState.value = 'error'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
<style scoped>
.rules-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  min-height: 360px;
}

.rule-intro {
  align-self: start;
}

.rule-steps {
  list-style: none;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.rule-steps li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.rule-step__num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lx-brand-soft);
  color: var(--lx-brand-deep);
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.rule-steps b {
  color: var(--lx-text);
  font-size: 13px;
}

.rule-steps p {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.65;
  color: var(--lx-text-2);
}

.rule-steps em {
  font-style: normal;
  color: var(--lx-coral);
  font-weight: 700;
  margin: 0 2px;
}

.rule-form-panel {
  min-width: 0;
}

.rule-error { margin-bottom: 18px; }

.rule-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 24px;
}

.rule-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rule-unit {
  font-size: 13px;
  color: var(--lx-text-2);
}

.rule-hint {
  width: 100%;
  margin-top: 6px;
  font-size: 12px;
  color: var(--lx-text-3);
  line-height: 1.5;
}

.rule-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-top: 8px;
}

@media (max-width: 1024px) {
  .rules-layout { grid-template-columns: 1fr; }
  .rule-fields { grid-template-columns: 1fr; }
}
</style>
