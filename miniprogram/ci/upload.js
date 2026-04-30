/**
 * 小鱼装机小程序 — miniprogram-ci 自动上传脚本
 * 
 * 用法:
 *   npm run upload              # 上传体验版（自动递增版本号）
 *   npm run upload -- --desc "修复了XX"  # 自定义描述
 *   npm run preview             # 生成预览二维码
 * 
 * 前置条件:
 *   1. 在微信公众平台 → 开发管理 → 开发设置 → 小程序代码上传 下载上传密钥
 *   2. 将密钥文件保存为 ci/private.key
 *   3. 在 IP 白名单中添加你的 IP
 */
const ci = require('miniprogram-ci')
const path = require('path')
const fs = require('fs')

// ==========================================
// 配置
// ==========================================
const APP_ID = 'wx0d6e54929064e86c'
const PROJECT_PATH = path.resolve(__dirname, '../dist')
const PRIVATE_KEY_PATH = path.resolve(__dirname, 'private.key')
const QR_OUTPUT_PATH = path.resolve(__dirname, '../preview_qr.jpg')

// 从 package.json 读取版本号
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'))

// ==========================================
// 解析命令行参数
// ==========================================
const args = process.argv.slice(2)
const isPreview = args.includes('--preview')
const descIdx = args.indexOf('--desc')
const customDesc = descIdx !== -1 ? args[descIdx + 1] : ''

const version = pkg.version || '1.0.0'
const desc = customDesc || `v${version} 自动上传 @ ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`

// ==========================================
// 检查密钥文件
// ==========================================
if (!fs.existsSync(PRIVATE_KEY_PATH)) {
  console.error('\n❌ 未找到上传密钥文件: ci/private.key')
  console.error('   请从微信公众平台下载密钥并保存到该路径。')
  console.error('   路径: 微信公众平台 → 开发管理 → 开发设置 → 小程序代码上传\n')
  process.exit(1)
}

// 检查 dist 目录
if (!fs.existsSync(PROJECT_PATH)) {
  console.error('\n❌ 未找到构建产物目录: dist/')
  console.error('   请先执行 npm run build:weapp 构建项目\n')
  process.exit(1)
}

// ==========================================
// 创建项目实例
// ==========================================
const project = new ci.Project({
  appid: APP_ID,
  type: 'miniProgram',
  projectPath: PROJECT_PATH,
  privateKeyPath: PRIVATE_KEY_PATH,
  ignores: ['node_modules/**/*'],
})

// ==========================================
// 上传 / 预览
// ==========================================
async function main() {
  try {
    if (isPreview) {
      // --- 预览模式：生成二维码 ---
      console.log(`\n📱 正在生成预览二维码...`)
      console.log(`   版本: ${version}`)
      console.log(`   描述: ${desc}\n`)

      const previewResult = await ci.preview({
        project,
        desc,
        version,
        qrcodeFormat: 'image',
        qrcodeOutputDest: QR_OUTPUT_PATH,
        setting: {
          es6: true,
          minify: true,
        },
        onProgressUpdate: console.log,
      })

      console.log(`\n✅ 预览二维码已生成: ${QR_OUTPUT_PATH}`)
      console.log(previewResult)
    } else {
      // --- 上传模式：提交体验版 ---
      console.log(`\n🚀 正在上传小程序体验版...`)
      console.log(`   AppID:  ${APP_ID}`)
      console.log(`   版本:   ${version}`)
      console.log(`   描述:   ${desc}\n`)

      const uploadResult = await ci.upload({
        project,
        version,
        desc,
        setting: {
          es6: true,
          minify: true,
          autoPrefixWXSS: true,
        },
        onProgressUpdate: console.log,
      })

      console.log(`\n✅ 上传成功！`)
      console.log(`   版本: ${version}`)
      console.log(`   请在微信公众平台 → 管理 → 版本管理 中设置为体验版`)
      console.log(uploadResult)
    }
  } catch (err) {
    console.error('\n❌ 操作失败:', err.message || err)
    process.exit(1)
  }
}

main()
