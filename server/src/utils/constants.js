// 全局常量：时段字典与状态值（排班与预约共用）
const TIME_SLOTS = [
  '09:00-10:00',
  '10:00-11:00',
  '14:00-15:00',
  '15:00-16:00',
  '19:00-20:00',
  '20:00-21:00'
]

const BOOKING_STATUS = ['confirmed', 'cancelled', 'completed']

module.exports = { TIME_SLOTS, BOOKING_STATUS }
