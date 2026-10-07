// 环境配置
// 后端接口地址（真机调试时改为电脑的局域网 IP，如 http://192.168.x.x:3000/api）
// 图片静态资源地址（注意：/uploads 不在 /api 前缀下，需单独配置）
// 支持构建时通过环境变量覆盖（VITE_API_BASE / VITE_UPLOAD_BASE），如 .env 文件或命令行 --mode
// MP-C1：H5 与微信小程序两端默认配置一致（localhost 指向开发机；真机预览需改局域网 IP 并配置微信合法域名），
// 故不再条件编译；此写法对非 H5/微信平台也导出了配置（修复原条件编译下其他平台 BASE_URL 为 undefined 的隐患）
export const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'
export const UPLOAD_BASE = import.meta.env.VITE_UPLOAD_BASE || 'http://localhost:3000'
