// 课程分类：列表公开，写操作需后台登录
const express = require('express')
const db = require('../db')
const { ok, fail } = require('../utils/response')
const { authAdmin } = require('../middleware/auth')

const router = express.Router()

// 列表：默认仅 active（公开端）；?all=1 返回全部（后台）
router.get('/', (req, res) => {
  const all = req.query.all === '1'
  const list = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM course co WHERE co.category_id = c.id) AS course_count
    FROM category c ${all ? '' : "WHERE c.status = 'active'"} ORDER BY c.sort, c.id
  `).all()
  ok(res, list)
})

// 新增
router.post('/', authAdmin, (req, res) => {
  const { name, sort = 0 } = req.body || {}
  if (!name) return fail(res, 400, '请输入分类名称')
  if (db.prepare('SELECT id FROM category WHERE name = ?').get(name)) return fail(res, 409, '分类名称已存在')
  const id = db.prepare('INSERT INTO category (name, sort, status) VALUES (?,?,?)').run(name, Number(sort), 'active').lastInsertRowid
  ok(res, { id }, '新增成功')
})

// 编辑
router.put('/:id', authAdmin, (req, res) => {
  const cat = db.prepare('SELECT * FROM category WHERE id = ?').get(req.params.id)
  if (!cat) return fail(res, 404, '分类不存在', 404)
  const { name, sort, status } = req.body || {}
  if (name && name !== cat.name && db.prepare('SELECT id FROM category WHERE name = ?').get(name)) {
    return fail(res, 409, '分类名称已存在')
  }
  // status 校验（R-I1）：非法值（含空串）拦截为 400，避免触发 DB CHECK 约束变 500
  if (status != null && status !== '' && !['active', 'inactive'].includes(status)) return fail(res, 400, '状态参数不正确')
  db.prepare('UPDATE category SET name = ?, sort = ?, status = ? WHERE id = ?')
    .run(name ?? cat.name, sort ?? cat.sort, status || cat.status, cat.id)
  ok(res, null, '保存成功')
})

// 删除（有课程时禁止）
router.delete('/:id', authAdmin, (req, res) => {
  const cat = db.prepare('SELECT * FROM category WHERE id = ?').get(req.params.id)
  if (!cat) return fail(res, 404, '分类不存在', 404)
  const n = db.prepare('SELECT COUNT(*) c FROM course WHERE category_id = ?').get(cat.id).c
  if (n > 0) return fail(res, 409, `该分类下还有 ${n} 门课程，无法删除`)
  db.prepare('DELETE FROM category WHERE id = ?').run(cat.id)
  ok(res, null, '删除成功')
})

module.exports = router
