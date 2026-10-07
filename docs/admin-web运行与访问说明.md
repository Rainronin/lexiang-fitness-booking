# admin-web 运行与访问说明（2026-09-07 核查）

> 目的：本次会话按 @docs 核对 admin-web 项目并启动运行，供上机测试。本文记录核查结论、启动方式与验证证据。

## 1. 项目是什么

- **名称**：乐享健身预约管理平台 · 管理后台（admin-web）
- **定位**：健身预约业务的管理端，与 `server`（Express + SQLite）同套后端、`miniapp`（uni-app）同套数据
- **技术栈**：Vue 3 + Vite 8 + Pinia（persistedstate）+ Vue Router + Element Plus（按需注册）+ ECharts（按需引入，zrender 独立分包）+ axios
- **目录**：`admin-web/src/` 下 `api/`（request 封装 + 接口）、`stores/`（登录态）、`router/`（角色动态路由）、`layout/`、`components/`（ProTable / ProForm / Chart 二次封装 5 模块复用）、`views/` 8 个模块页

## 2. 如何启动（本次已按此启动）

```bash
# 1. 后端（必须先启动，端口 3000）
cd server && npm run dev       # 重置/首次数据：npm run seed

# 2. 管理后台（端口 4180，strictPort；原 5180 落入 Windows 端口排除范围被拒）
cd admin-web && npm run dev    # http://localhost:4180
```

代理：Vite 将 `/api` 与 `/uploads` 转发到 `http://localhost:3000`，浏览器无跨域问题。

## 3. 访问信息

| 项 | 值 |
|---|---|
| 后台地址 | http://localhost:4180 |
| 管理员账号 | admin / 123456 |
| 员工账号 | staff / 123456 |
| 后端地址 | http://localhost:3000 |

## 4. 模块一览（7 个菜单模块 + 登录页，按角色显隐）

工作台看板（admin+staff）· 会员管理（admin+staff）· 课程管理（admin+staff）· 教练管理（admin+staff，含每周排班）· 预约管理（admin+staff）· 预约规则（仅 admin）· 营收统计（仅 admin）

## 5. 本次验证证据

- 后端：`node scripts/smoke-test.js` → **63 通过 / 0 失败**（2026-09-07 核查时；2026-09-27 起断言数增至 65 项，隔离种子库 65/65 全绿）（登录鉴权、分类/课程/教练/会员 CRUD、预约事务、规则、统计、签到全覆盖）
- 后端公开接口：`GET /api/rules/public` → `code=0, advance_days=7, daily_limit=3`
- 前端：`http://localhost:4180/` 返回 200，登录页截图见 `.verify/admin-login-chrome.png`（另存 `admin-login-bash.png`；均已人工复核：品牌区 + 登录卡片 + 演示账号正常渲染），HTML 快照 `.verify/admin-login.html`
