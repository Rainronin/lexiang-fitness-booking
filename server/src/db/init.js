// 数据库初始化入口：npm run seed —— 重建表结构 + 灌入种子数据
const db = require('../db')
const { createSchema } = require('./schema')
const { seed } = require('./seed')

console.log('[seed] 重建数据库...')
// 按依赖顺序删除（子表在前）：booking/signin 引用 member，schedule 引用 coach/course，course 引用 category
db.exec('DROP TABLE IF EXISTS booking; DROP TABLE IF EXISTS schedule; DROP TABLE IF EXISTS signin; DROP TABLE IF EXISTS course; DROP TABLE IF EXISTS category; DROP TABLE IF EXISTS coach; DROP TABLE IF EXISTS member; DROP TABLE IF EXISTS rules; DROP TABLE IF EXISTS admin;')
createSchema()
seed()
console.log('[seed] 完成 ✓')
