// 建表 SQL：8 张表，含 UNIQUE 约束（同教练同时段唯一、同会员同课唯一、每日签到唯一）
const db = require('../db')

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff'))
    );

    CREATE TABLE IF NOT EXISTS member (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      nickname TEXT,
      avatar TEXT,
      gender TEXT CHECK (gender IN ('male','female')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coach (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar TEXT,
      title TEXT,
      intro TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS category (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive'))
    );

    CREATE TABLE IF NOT EXISTS course (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES category(id),
      name TEXT NOT NULL,
      cover TEXT,
      price REAL NOT NULL,
      duration INTEGER NOT NULL DEFAULT 60,
      intro TEXT,
      status TEXT NOT NULL DEFAULT 'on' CHECK (status IN ('on','off')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_id INTEGER NOT NULL REFERENCES coach(id),
      course_id INTEGER NOT NULL REFERENCES course(id),
      weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
      time_slot TEXT NOT NULL,
      -- R-M8：DB 层 CHECK 兜底（代码层已校验 1~100）
      capacity INTEGER NOT NULL DEFAULT 10 CHECK (capacity BETWEEN 1 AND 100),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
      UNIQUE (coach_id, weekday, time_slot)
    );

    CREATE TABLE IF NOT EXISTS booking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL REFERENCES member(id),
      schedule_id INTEGER NOT NULL REFERENCES schedule(id),
      booking_date TEXT NOT NULL,
      -- R-C3 口径：completed 不落库，查询时按 booking_date < 今天 && confirmed 动态判定；
      -- CHECK 保留 'completed' 仅为兼容未来直接落库的可能
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
      created_at TEXT NOT NULL
    );

    -- 部分唯一索引：仅阻止"有效预约"重复（取消后可重新预约同一节）
    CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_unique_active
      ON booking(member_id, schedule_id, booking_date) WHERE status != 'cancelled';

    CREATE TABLE IF NOT EXISTS signin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL REFERENCES member(id),
      sign_date TEXT NOT NULL,
      UNIQUE (member_id, sign_date)
    );

    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      -- R-M8：DB 层 CHECK 兜底（代码层已校验 1~30 / 1~10）
      advance_days INTEGER NOT NULL DEFAULT 7 CHECK (advance_days BETWEEN 1 AND 30),
      daily_limit INTEGER NOT NULL DEFAULT 3 CHECK (daily_limit BETWEEN 1 AND 10)
    );
  `)
}

module.exports = { createSchema }
