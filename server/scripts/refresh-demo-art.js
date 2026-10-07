// 只替换已知的种子渐变占位图；不改数据库，也不覆盖用户上传的图片。
const fs = require('fs')
const path = require('path')
const { createHash } = require('crypto')

const legacyHashes = [
  'f6b7f3765e99e10c09329df141b76b3d3ffc96ca587099b7d3212ebe794b12c9',
  '9086b9647ff443b2269868b4ae1e19b5b4fd3178b70efe865f493a8f7788bf06',
  '2ad3275ae95c738bd19c03b53943278910d7cb174d506a0803b210c5cb57cf2d',
  '7e821fe1de0b5a9145f712743e9907522a27a89b4e38f5446c4155a2cfb609d3'
]
const coachHash = '9b21240d42ac6c521a7623a5258acfb5afafc498391efb7322ef466adb8c96d2'
const root = path.join(__dirname, '..')
const uploads = path.join(root, 'uploads')
const digest = buffer => createHash('sha256').update(buffer).digest('hex')
fs.mkdirSync(uploads, { recursive: true })
let changed = 0
for (const type of ['course', 'coach']) {
  for (let i = 1; i <= (type === 'course' ? 12 : 5); i++) {
    const file = `${type}-${i}.png`
    const target = path.join(uploads, file)
    const art = fs.readFileSync(path.join(root, 'assets', 'demo-art', file))
    if (fs.existsSync(target)) {
      const current = digest(fs.readFileSync(target))
      if (current === digest(art)) continue
      const legacy = type === 'course' ? legacyHashes[Math.floor((i - 1) / 3)] : coachHash
      if (current !== legacy) {
        console.log(`保留非占位图片：${file}`)
        continue
      }
    }
    fs.writeFileSync(target, art)
    changed++
  }
}
console.log(`已更新 ${changed} 张演示插画，数据库未修改。`)
