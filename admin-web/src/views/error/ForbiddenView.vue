<template>
  <div class="forbidden">
    <div class="forbidden-card">
      <div class="permission-mark" aria-hidden="true">
        <el-icon :size="34"><Lock /></el-icon>
      </div>
      <p class="code">错误码 403</p>
      <h1>暂无访问权限</h1>
      <p class="desc">当前账号的角色不能访问该页面。如需查看营收统计或修改预约规则，请使用管理员账号登录。</p>
      <el-button type="primary" size="large" @click="$router.push('/dashboard')">返回工作台</el-button>
    </div>
  </div>
</template>
<script setup>
import { Lock } from '@element-plus/icons-vue'
</script>

<style scoped>
.forbidden {
  min-height: calc(100vh - 128px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.forbidden-card {
  width: 440px;
  max-width: 100%;
  background: var(--lx-surface);
  border: 1px solid var(--lx-line-soft);
  border-radius: var(--lx-radius-xl);
  box-shadow: var(--lx-shadow-1);
  padding: 44px 36px;
  text-align: center;
  animation: lx-rise-in 0.32s var(--lx-ease-out) both;
}

.permission-mark {
  width: 72px;
  height: 72px;
  margin: 0 auto 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lx-brand-soft);
  color: var(--lx-brand);
}

.code {
  font-size: 12px;
  color: var(--lx-text-3);
  letter-spacing: 0.06em;
}

.forbidden-card h1 {
  margin-top: 6px;
  font-size: 24px;
  font-weight: 700;
  color: var(--lx-text);
}

.desc {
  margin: 10px auto 22px;
  max-width: 330px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--lx-text-2);
}
</style>
