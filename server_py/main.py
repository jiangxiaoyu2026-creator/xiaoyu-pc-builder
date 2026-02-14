from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from db import init_db
import logging


from routers import auth, configs, used, payment, settings, sms, recycle, products, stats, email, invitations, chat, ai, articles, upload
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PC Builder API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    logger.info("Starting up and initializing database...")
    init_db()
    logger.info("Registered routes:")
    for route in app.routes:
        if hasattr(route, 'methods'):
            logger.info(f"  {route.methods} {route.path}")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "PC 组装大师 API 正在运行"}

# 注册所有 API 路由
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
# app.include_router(hardware.router, prefix="/api/hardware", tags=["hardware"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(configs.router, prefix="/api/configs", tags=["configs"])
app.include_router(used.router, prefix="/api/used", tags=["used"])
app.include_router(payment.router, prefix="/api/payment", tags=["payment"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(sms.router, prefix="/api/sms", tags=["sms"])
app.include_router(recycle.router, prefix="/api/recycle", tags=["recycle"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
app.include_router(email.router, prefix="/api/email", tags=["email"])
app.include_router(invitations.router, prefix="/api/invitations", tags=["invitations"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(articles.router, prefix="/api/articles", tags=["articles"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])

# 静态文件和 SPA 路由处理
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")

if os.path.exists(DIST_DIR):
    # 挂载静态资源
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# 挂载上传文件目录
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# SPA fallback - 处理前端路由
# 注意：不使用 catch-all 路由，而是使用具体的前端路由模式
@app.get("/")
async def serve_index():
    """Serve index.html for root path"""
    if os.path.exists(DIST_DIR):
        index_path = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="未找到页面")

# 静态文件请求（非 /api 和 /assets 路径）
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    # API 路径不应该到达这里，但以防万一
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="API 接口未找到")

    # 检查是否存在静态文件
    if os.path.exists(DIST_DIR):
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # SPA fallback - 返回 index.html
        index_path = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)

    raise HTTPException(status_code=404, detail="未找到页面")


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "true").lower() == "true"
    uvicorn.run("main:app", host=host, port=port, reload=reload, log_level="info")