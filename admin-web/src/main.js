// 应用入口：Element Plus 按需注册 + Pinia(持久化) + Vue Router
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import {
  ElAlert,
  ElAside,
  ElAvatar,
  ElBreadcrumb,
  ElBreadcrumbItem,
  ElButton,
  ElCol,
  ElConfigProvider,
  ElContainer,
  ElDatePicker,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElForm,
  ElFormItem,
  ElHeader,
  ElIcon,
  ElImage,
  ElInput,
  ElInputNumber,
  ElLoading,
  ElMain,
  ElMenu,
  ElMenuItem,
  ElOption,
  ElPagination,
  ElRow,
  ElScrollbar,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTooltip,
  ElUpload
} from 'element-plus'
import 'element-plus/dist/index.css'
// A-M4：按需注册图标（仅注册字符串引用的 9 个），其余由组件局部 import，与 ECharts 按需引入口径一致
import {
  Odometer, User, Notebook, Avatar, Calendar, SetUp, TrendCharts, DataAnalysis, Money
} from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)

const elementComponents = [
  ElAlert, ElAside, ElAvatar, ElBreadcrumb, ElBreadcrumbItem, ElButton, ElCol,
  ElConfigProvider, ElContainer, ElDatePicker, ElDialog, ElDropdown, ElDropdownItem,
  ElDropdownMenu, ElForm, ElFormItem, ElHeader, ElIcon, ElImage, ElInput,
  ElInputNumber, ElMain, ElMenu, ElMenuItem, ElOption, ElPagination, ElRow,
  ElScrollbar, ElSelect, ElTable, ElTableColumn, ElTooltip, ElUpload
]
for (const component of elementComponents) app.component(component.name, component)
app.directive('loading', ElLoading.directive)

const globalIcons = { Odometer, User, Notebook, Avatar, Calendar, SetUp, TrendCharts, DataAnalysis, Money }
for (const [name, comp] of Object.entries(globalIcons)) {
  app.component(name, comp)
}

app.mount('#app')
