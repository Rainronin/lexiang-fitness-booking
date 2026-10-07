// 数据库连接：单例打开 data.db（better-sqlite3 同步 API）
const path = require('path')
const Database = require('better-sqlite3')

const db = new Database(path.join(__dirname, '..', 'data.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

module.exports = db
