# AGENTS.md — 乐享健身预约平台

## 项目定位
一套健身预约业务，两个端共用同一套 Express + SQLite 后端：Vue3 管理后台（admin-web）+ uni-app 会员端（miniapp）。为自研项目，以本地运行和作品集展示为主；经用户授权，当前源码快照发布到公开 GitHub 仓库 `Rainronin/lexiang-fitness-booking`，旧本地历史保留在本机。对外介绍和运行入口以根目录 `README.md` 为准。

## 怎么跑起来
```bash
# 1. 后端（必须最先启动，端口 3000）
cd server && npm run dev        # 首次/重置数据：npm run seed
# 2. 管理后台（端口 4180；原 5180 落入 Windows 端口排除范围 5147-5246 被拒 EACCES）
cd admin-web && npm run dev     # http://localhost:4180
# 3. 会员端（H5 端口 4174；微信小程序：npm run build:mp-weixin 后导入 dist/build/mp-weixin）
cd miniapp && npm run dev:h5    # http://localhost:4174
# 验证后端：cd server && node scripts/smoke-test.js（66 项断言；请使用隔离演示库）
```

## 技术栈
- server：Express 5 + better-sqlite3（同步 API）+ JWT + bcryptjs + multer + CORS
- admin-web：Vue3 + Vite + Pinia（persistedstate）+ Vue Router + Element Plus（项目所需组件按需注册）+ ECharts（按需引入，zrender 独立分包）
- miniapp：uni-app（Vue3 + Vite）+ Pinia，一套代码适配 H5 / 微信小程序

## 目录与约定
- `server/src/routes/` 按模块一个路由文件；`utils/constants.js` 时段字典；统一响应 `{ code, data, message }`
- `admin-web/src/components/` 有 ProTable / ProForm / Chart 二次封装（5 个模块复用）
- 预约提交在 `server/src/routes/memberBookings.js` 事务内校验（名额/冲突/规则/会员状态/课程下架/教练停用/已过时段）
- 权限三级：`authAdmin`（后台账号）/ `authSuper`（仅管理员：营收统计、课程热度、规则；工作台看板员工可见）/ `authMember`（会员端）
- 可约时段：`GET /api/schedules/member-schedules`（公开）按 advance_days 自动截断并过滤已过时段；`GET /api/rules/public`（公开）供小程序动态生成可约日期范围
- 演示账号：admin / staff 密码均 123456；会员端验证码固定 123456
- 数据在 `server/data.db`（gitignore），重置：`npm run seed`（重建表 + 种子数据）
- 课程封面/教练头像使用 `server/assets/demo-art` 中的原创示意插画，SVG 为编辑源稿、PNG 为实际加载文件；种子初始化直接复制 PNG。已有库可在 server 执行 `npm run art:refresh`，仅替换已知旧渐变占位图，不重置数据库、不覆盖用户图片。**后台上传真实图片即替换**（课程/教练编辑表单 → 封面上传），无需改代码
- 图片上传统一接受 JPG / PNG / WebP，前端与后端大小上限均为 2MB
- 2026-10-07：会员中心移除与会员标签重叠的装饰圆；课程列表 coach_name 已使用 DISTINCT 消除同一教练重复显示。后端冒烟脚本新增去重回归检查，详见 `docs/作品集展示修复-20261007.md`。
- 微信工具直接导入 miniapp 时，本地 `project.config.json` 与 `project.private.config.json` 的 `setting.urlCheck` 均设为 false，供模拟器访问 localhost；编译目录的设置不能替代当前导入根目录的配置。
- 微信调试期间，`miniapp/dist/build/mp-weixin` 是运行依赖，不作为临时文件清理；若该目录缺失，先在 miniapp 执行 `npm run build:mp-weixin` 恢复，再由开发者工具编译，保留正确的 miniprogramRoot。

## 当前状态与下一步
- 全部开发完成并验收通过（2026-08-08）：smoke-test 全绿，功能清单 98 项已勾选（2026-08-29 UI 验收同步后为 102 项全勾），三端（后台/H5/微信开发者工具）走查通过
- 2026-08-13 全量代码审查 + 修复完成：Critical 3 / Important 13 / Minor 8 已修复并回归（smoke-test 56 项全绿、三端构建通过），详见 `docs/代码审查记录表.md`（审查）与 `docs/修复记录.md`（修复明细）；另有若干 Minor 项评估后保留（见修复记录「未修项」）
- 2026-08-13 第二轮审查（鲁棒性+可读性对抗性审查）+ 修复完成：server 5 Important + 8 Minor + 3 可读性、admin-web 1 Critical + 1 Important + 6 Minor + 1 可读性、miniapp 5 Minor + 1 可读性，全部修复并回归（smoke-test 63 项全绿、三端构建通过），详见《代码审查记录表.md》第二轮记录与《修复记录.md》「第二轮修复记录」
- 2026-08-16 UI 重构按 `docs/乐享健身UI重构设计方案.md` 实施完成：双端设计令牌、组件状态、动态胶囊、动效与响应式已落地；admin-web build / miniapp H5 build / miniapp 微信小程序 build 均通过，smoke-test 63 项全绿；唯一新增开发依赖为 miniapp 的 sass（仅用于 SCSS 设计令牌编译）
- 2026-08-16 微信开发者工具实测适配完成：修复 WXSS 通配选择器编译错误并清理小程序不支持的选择器；确认「游客模式（touristappid）」会触发 `webapi_getwxaasyncsecinfo:fail` 并干扰登录请求，**本地调试小程序请使用测试号或真实 AppID，不要使用游客模式**；开发者工具自动生成的根目录 `project.config.*` 已加入 `.gitignore`，仍以 `miniapp/dist/build/mp-weixin` 为导入目录。详见《修复记录.md》第三轮
- 2026-08-29 UI 验收完成并收口 6 项体验问题：上传契约统一为 2MB、排班未保存离开保护、排班/菜单/登录字段无障碍语义、会员详情固定导航、后台按需组件与图表分包；后台与 miniapp 两端构建通过，smoke-test 63/63，全量页面浏览器复验无控制台错误。详见《修复记录.md》第四轮
- 2026-09-07 审查收口：补齐 M7 并发 401 提示与导航防重，`cd admin-web && node scripts/check-401.js`（Node.js 24）及后台构建通过；原清单已整理为 `docs/代码审查记录表.md`，历史评估保留项仍按未修记录。
- 下一步：按需在后台替换真实课程图/教练图
- 2026-09-07 微信导入入口：当前本地 `miniapp/project.config.json` 已设置 `miniprogramRoot: "dist/build/mp-weixin/"`，可直接导入 miniapp；仍需先执行 `npm run build:mp-weixin`。该配置被 gitignore，其他环境可直接导入编译目录，或自行配置相同入口。
- 2026-09-07 侧栏菜单「闪烁光标」排查结论：根因是浏览器（Edge）开启「使用文本光标浏览页面」（caret browsing，`edge://settings/accessibility` 或 F7）在菜单文字上显示闪烁光标；应用侧给侧栏菜单项加 `user-select: none` 实测可抑制。详见《修复记录.md》「后台侧栏菜单『闪烁光标』修复」。
- 2026-09-26 交付 `docs/学习指南/index.html`：58 章零基础源码学习指南（单文件离线网页，约 1.1 MB，双击即开）。按「预备 → 前端 admin-web → 小程序 miniapp → 后端 server → 贯通与练习」组织，每章含本章目标 / 术语小抄 / 先跑再看 / 代码精读（标注 文件:行号）/ 容易踩的坑 / 自测 / 动手验收；网页支持目录进度勾选、搜索、深浅色、字号与代码复制。附录保留「只读巡检实测记录」。当时发现的预约筛选 500 已于 2026-09-27 修复；教练名重复与建表注释数量不符仍待处理。
- 2026-09-27 修复后台预约列表筛选 500：COUNT 查询补齐关联表 JOIN，按课程/关键词及组合筛选与分页总数复测通过；隔离种子库的冒烟测试 65/65 通过。详见 `docs/修复记录.md`。
- 2026-09-27 文档审计与修订：全量文档只读审计后修订过期内容——端口 5180/5174 → 4180/4174（项目计划）、smoke 63 → 65（项目计划/运行说明）、功能清单 98 → 102 项（AGENTS/项目计划）、「8 张表」→「9 张表」（项目计划/学习指南各一处）、修复记录顶部「最新状态」与 UI 方案「更新日期」同步；代码侧两项仍待处理：schema.js 头注释「8 张表」实为 9 张、courses.js 列表 coach_name 同一教练重复出现（GROUP_CONCAT 无 DISTINCT）。
