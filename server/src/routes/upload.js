// 图片上传：本地存储 uploads/，返回可访问 URL（静态托管在 index.js 配置）
// 安全：扩展名白名单 + 文件头魔数校验（mimetype 可伪造，不可作为唯一依据）
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const express = require('express')
const multer = require('multer')
const { ok, fail } = require('../utils/response')
const { authAdmin } = require('../middleware/auth')

const uploadDir = path.join(__dirname, '..', '..', 'uploads')
fs.mkdirSync(uploadDir, { recursive: true })

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp']

// 常见图片格式魔数（文件头特征字节）
const MAGIC = [
  { ext: '.png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: '.jpg', bytes: [0xff, 0xd8, 0xff] },
  { ext: '.jpeg', bytes: [0xff, 0xd8, 0xff] }
]

// WebP 单独校验（R-M6）：仅验 RIFF 前缀会放行 WAV/AVI 等 RIFF 容器，必须再验 offset 8-12 的 "WEBP"
function isWebp(buf) {
  return buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
}

function checkMagic(buf) {
  if (isWebp(buf)) return true
  return MAGIC.some((m) => buf.length >= m.bytes.length && m.bytes.every((b, i) => buf[i] === b))
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (!ALLOWED_EXT.includes(ext)) return cb(new Error('INVALID_FILE_TYPE'))
    cb(null, true)
  }
})

const router = express.Router()
router.post('/', authAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return fail(res, 400, '请选择图片文件')
  // 读文件头校验真实格式（防伪造扩展名上传非图片内容）
  const head = fs.readFileSync(req.file.path).subarray(0, 12)
  if (!checkMagic(head)) {
    fs.unlinkSync(req.file.path) // 清除不合规文件
    return fail(res, 400, '文件内容不是有效图片')
  }
  ok(res, { url: `/uploads/${req.file.filename}` }, '上传成功')
})

module.exports = router
