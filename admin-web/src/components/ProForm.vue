<!-- ProForm：弹窗表单二次封装 —— 分组字段、校验、上传、连续保存反馈 -->
<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    :close-on-click-modal="false"
    :close-on-press-escape="!formTouched"
    destroy-on-close
    class="pro-form-dialog"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <el-alert
      v-if="submitError"
      :title="submitError"
      type="error"
      :closable="true"
      show-icon
      class="submit-error"
      @close="submitError = ''"
    />

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="pro-form">
      <template v-for="(field, fieldIndex) in fields" :key="field.prop">
        <div v-if="field.group && field.group !== fields[fieldIndex - 1]?.group" class="form-group">
          <div class="form-group__title">{{ field.group }}</div>
          <div v-if="field.groupDesc" class="form-group__desc">{{ field.groupDesc }}</div>
        </div>

        <el-form-item :label="field.label" :prop="field.prop">
          <el-select
            v-if="field.type === 'select'"
            v-model="form[field.prop]"
            :placeholder="field.placeholder || '请选择'"
            style="width: 100%"
            @change="formTouched = true"
          >
            <el-option v-for="opt in field.options" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>

          <el-input-number
            v-else-if="field.type === 'number'"
            v-model="form[field.prop]"
            :min="field.min ?? 0"
            :max="field.max ?? 999999"
            :step="field.step || 1"
            style="width: 100%"
            @change="formTouched = true"
          />

          <el-input
            v-else-if="field.type === 'textarea'"
            v-model="form[field.prop]"
            type="textarea"
            :rows="3"
            :placeholder="field.placeholder || '请输入'"
            @input="formTouched = true"
          />

          <div v-else-if="field.type === 'upload'" class="upload-field">
            <el-upload
              :show-file-list="false"
              accept=".jpg,.jpeg,.png,.webp"
              :disabled="!!uploading[field.prop]"
              :http-request="(opt) => handleUpload(opt, field)"
            >
              <div class="upload-box" :class="{ 'has-image': form[field.prop], 'is-uploading': uploading[field.prop] }">
                <img v-if="form[field.prop]" :src="imgUrl(form[field.prop])" class="upload-img" alt="预览图" />
                <div v-else class="upload-placeholder">
                  <span class="upload-placeholder__icon">＋</span>
                  <span>{{ uploading[field.prop] ? '上传中...' : '选择图片' }}</span>
                </div>
                <div v-if="uploading[field.prop]" class="upload-loading">上传中...</div>
              </div>

              <div v-if="form[field.prop]" class="upload-actions">
                <span class="upload-replace">更换图片</span>
                <el-button
                  link
                  type="danger"
                  size="small"
                  @click.stop="removeUpload(field)"
                >
                  移除图片
                </el-button>
              </div>
            </el-upload>
            <div class="upload-hint">
              支持 JPG / PNG / WebP，大小不超过 {{ MAX_IMAGE_SIZE_MB }}MB<span v-if="field.uploadHint">；{{ field.uploadHint }}</span>
            </div>
          </div>

          <el-input
            v-else
            v-model="form[field.prop]"
            :placeholder="field.placeholder || '请输入'"
            @input="formTouched = true"
          />
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">{{ submitText }}</el-button>
    </template>
  </el-dialog>
</template>
<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { courseApi } from '../api'
import { imgUrl } from '../utils/imgUrl'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '编辑' },
  fields: { type: Array, required: true }, // [{prop,label,type,options,placeholder,rules,min,max,group}]
  initial: { type: Object, default: () => ({}) }, // 编辑回填数据
  submit: { type: Function, required: true }, // (form) => Promise
  width: { type: String, default: '520px' },
  submitText: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'success'])
const formRef = ref()
const submitting = ref(false)
const submitError = ref('')
const formTouched = ref(false)
const uploading = reactive({})
const form = reactive({})
const rules = {}
const MAX_IMAGE_SIZE_MB = 2
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

props.fields.forEach((f) => {
  if (f.rules) rules[f.prop] = f.rules
})

const submitText = computed(() => {
  if (props.submitText) return props.submitText
  if (String(props.title).includes('编辑')) return '保存修改'
  if (String(props.title).includes('新增')) return '确认新增'
  return '保存'
})

// 打开弹窗时初始化表单（新增用默认值，编辑用 initial 回填）
watch(
  () => props.modelValue,
  async (v) => {
    if (!v) return
    submitError.value = ''
    formTouched.value = false
    Object.keys(form).forEach((k) => delete form[k])
    props.fields.forEach((f) => {
      form[f.prop] = props.initial[f.prop] ?? f.default ?? (f.type === 'number' ? 0 : '')
      if (f.type === 'upload') uploading[f.prop] = false
    })
    // 打开后聚焦第一个可编辑字段
    await nextTick()
    focusFirstField()
  }
)

function focusFirstField() {
  const root = formRef.value?.$el
  if (!root) return
  const target = root.querySelector('input:not([type="file"]), textarea, .el-select__wrapper')
  if (target) target.focus?.()
}

async function handleUpload(opt, field) {
  const file = opt.file
  if (!file) return
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!file.type.startsWith('image/') || !ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
    ElMessage.warning('仅支持 JPG、PNG、WebP 图片')
    return
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    ElMessage.warning(`图片大小不能超过 ${MAX_IMAGE_SIZE_MB}MB`)
    return
  }
  uploading[field.prop] = true
  try {
    const data = await courseApi.upload(file)
    form[field.prop] = data.url
    formTouched.value = true
    ElMessage.success('图片已上传')
  } catch {
    /* 错误已由拦截器提示 */
  } finally {
    uploading[field.prop] = false
  }
}

// 移除图片：清空表单字段（保存后生效）
function removeUpload(field) {
  form[field.prop] = ''
  formTouched.value = true
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return // 校验失败：Element Plus 已滚动并聚焦第一个错误字段
  }
  submitting.value = true
  submitError.value = ''
  try {
    await props.submit({ ...form })
    ElMessage.success('保存成功')
    emit('update:modelValue', false)
    emit('success')
  } catch (e) {
    // 服务端错误保留在表单顶部，方便重试；拦截器仅做轻提示
    submitError.value = e?.message || '保存失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>
<style scoped>
.submit-error { margin-bottom: 16px; }

.pro-form {
  --el-form-label-font-size: 13px;
}

.pro-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.pro-form :deep(.el-form-item__label) {
  color: var(--lx-text);
  font-weight: 600;
  padding-bottom: 6px;
}

.form-group {
  margin: 6px 0 18px;
  padding: 14px 16px;
  border-radius: var(--lx-radius-md);
  background: var(--lx-bg);
}

.form-group__title {
  font-size: 13px;
  font-weight: 700;
  color: var(--lx-text);
}

.form-group__desc {
  margin-top: 3px;
  font-size: 12px;
  color: var(--lx-text-2);
}

/* 图片上传 */
.upload-field { width: 100%; }

.upload-box {
  position: relative;
  width: 200px;
  height: 124px;
  border-radius: var(--lx-radius-md);
  overflow: hidden;
  transition: transform 0.16s var(--lx-ease-out), box-shadow 0.16s var(--lx-ease-out);
}

.upload-box:not(.has-image):hover {
  transform: translateY(-1px);
  box-shadow: var(--lx-shadow-2);
}

.upload-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: var(--lx-surface-2);
}

.upload-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px dashed rgba(60, 60, 67, 0.28);
  border-radius: var(--lx-radius-md);
  color: var(--lx-text-3);
  font-size: 12px;
  cursor: pointer;
  background: var(--lx-bg);
  transition: border-color 0.16s var(--lx-ease-out), color 0.16s var(--lx-ease-out),
    background-color 0.16s var(--lx-ease-out);
}

.upload-placeholder:hover {
  border-color: var(--lx-brand);
  color: var(--lx-brand);
  background: var(--lx-brand-soft);
}

.upload-placeholder__icon { font-size: 20px; line-height: 1; }

.upload-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.72);
  color: var(--lx-brand);
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(4px);
}

.upload-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.upload-replace {
  font-size: 12px;
  color: var(--lx-text-3);
}

.upload-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--lx-text-3);
}
</style>
