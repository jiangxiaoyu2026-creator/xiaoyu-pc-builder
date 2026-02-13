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

后端已迁移至 Python (FastAPI)。

**操作步骤：**
1. 确保服务器上安装了 Python 3.9+。
2. 将 `server_py` 文件夹、`requirements.txt`、`.env` 和 `products.json` (如果需要) 复制到生产环境。
3. 创建虚拟环境并安装依赖：
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r server_py/requirements.txt
   ```
4. **环境变量**：确保生产环境中存在 `.env` 文件，并包含必要的配置（如 阿里云 SMS 密钥等）。

---

## 3. 部署方案推荐

### 方案 A：宝塔面板 / VPS (推荐，控制力最强)
1. **上传文件**：将根目录下的 `dist` (前端)、`server_py` (后端)、`requirements.txt` 等文件上传到服务器。
2. **进程管理**：使用 `supervisor` 或 `systemd` 或 `nohup` 运行 Python 服务。
   ```bash
   # 示例：使用 uvicorn 直接运行 (生产环境建议配合 gunicorn)
   python3 -m uvicorn server_py.main:app --host 0.0.0.0 --port 8000
   ```
   或者使用 `pm2` 管理 Python 进程：
   ```bash
   pm2 start "python3 -m uvicorn server_py.main:app --host 0.0.0.0 --port 8000" --name "pc-builder-api"
   ```
3. **Nginx 配置**：
   - 将域名指向服务器。
   - 配置 Nginx `root` 目录为项目中的 `dist` 文件夹。
   - 配置反向代理，将 `/api` 开头的请求转发给后端的 8000 端口。


### 方案 B：云平台 (最简单，自动化)
- **前端**：可以使用 [Vercel](https://vercel.com) 或 [Netlify](https://netlify.com)，只需关联 GitHub 仓库即可自动构建部署。
- **全栈**：可以使用 [Railway](https://railway.app) 或 [Zeabur](https://zeabur.com)，支持一键部署前端 + 后端应用。
### 方案 C：Docker 部署 (推荐，环境隔离)

项目提供了 `Dockerfile` 和 `docker-compose.yml`，支持一键容器化部署。

1. **安装环境**：确保服务器已安装 Docker 和 Docker Compose。
2. **构建并启动**：
   ```bash
   docker-compose up -d --build
   ```
   - 此命令会自动完成前端构建，并启动一个 Node.js 容器。
   - 容器会暴露 `3001` 端口，同时服务静态前端和 API 接口。
3. **域名与 Nginx**：
   - 建议在 Docker 容器前挂一个 Nginx 作为反向代理，处理 HTTPS 和 80 端口转发。

---

## 4. 权限与安全性逻辑

- **AI 智能功能**：已加固权限校验。仅登录且拥有 VIP (SVIP) 身份的用户可使用。
- **配置保存与分享**：已增加登录检查，确保用户资产安全。

---

## 5. 备份与存档 (打包)

如果您只是想把整个项目存起来或发送给他人：
1. **排除无关文件**：确保不要打包 `node_modules` 文件夹（它非常大且可以随时重新下载）。
2. **打包命令 (终端)**：
   ```bash
   zip -r project_backup.zip . -x "node_modules/*" ".git/*" "dist/*"
   ```

---

**如果您在特定部署步骤（如配置域名、数据库或其他云服务）上遇到困难，请随时告诉我！**
