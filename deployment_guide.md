# 项目导出与部署指南 🚀

您的项目 `xiaoyu-pc-builder` 是一个典型的全栈应用（Vite 前端 + Node.js 后端）。要将其“导出”并运行在生产环境中，请参考以下步骤。

## 1. 前端导出 (构建)

前端代码需要经过编译和压缩，生成浏览器可以直接运行的静态文件。

**操作步骤：**
1. 在项目根目录下打开终端。
2. 运行构建命令：
   ```bash
   npm run build
   ```
3. 构建完成后，根目录下会生成一个 `dist` 文件夹。
   - **`dist` 文件夹就是您需要导出的前端成果**。它包含了所有的 HTML, CSS, 和 JavaScript 文件。

---

## 2. 后端部署准备

后端是一个运行在 Node.js 环境下的 Express 服务。

**操作步骤：**
1. 确保服务器上安装了 Node.js (建议版本 v18+)。
2. 将 `server` 文件夹和 `package.json` 复制到生产环境。
3. 在生产环境中运行 `npm install --production` 安装依赖。
4. **环境变量**：确保生产环境中存在 `.env` 文件，并包含必要的配置（如 阿里云 SMS 密钥等）。

---

## 3. 部署方案推荐

### 方案 A：宝塔面板 / VPS (推荐，控制力最强)
1. **上传文件**：将根目录下的所有内容（除了 `node_modules` 和 `.git`）上传到服务器。
2. **PM2 管理**：在服务器上启动并管理 Node 服务：
   ```bash
   npm install pm2 -g
   pm2 start server/index.ts --interpreter tsx --name "pc-builder-api"
   ```
3. **Nginx 配置**：
   - 将域名指向服务器。
   - 配置 Nginx `root` 目录为项目中的 `dist` 文件夹。
   - 配置反向代理，将请求转发给后端的端口（通常是 `.env` 中定义的端口）。

### 方案 B：云平台 (最简单，自动化)
- **前端**：可以使用 [Vercel](https://vercel.com) 或 [Netlify](https://netlify.com)，只需关联 GitHub 仓库即可自动构建部署。
- **全栈**：可以使用 [Railway](https://railway.app) 或 [Zeabur](https://zeabur.com)，支持一键部署前端 + 后端应用。

---

## 4. 备份与存档 (打包)

如果您只是想把整个项目存起来或发送给他人：
1. **排除无关文件**：确保不要打包 `node_modules` 文件夹（它非常大且可以随时重新下载）。
2. **打包命令 (终端)**：
   ```bash
   zip -r project_backup.zip . -x "node_modules/*" ".git/*" "dist/*"
   ```

---

**如果您在特定部署步骤（如配置域名、数据库或其他云服务）上遇到困难，请随时告诉我！**
