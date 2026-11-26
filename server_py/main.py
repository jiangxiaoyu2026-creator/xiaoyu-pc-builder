from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from .db import init_db
import logging


from .routers import auth, configs, used, payment, settings, sms, recycle, products, stats, email, invitations, chat, ai, articles, upload, marketing, recycling_prices, jd_trends, simulator, external, leaderboards, pc3d
from .routers import config_posters
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse, Response
from html import escape
import os
import re


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PC Builder API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip compression for all responses > 500 bytes
app.add_middleware(GZipMiddleware, minimum_size=500)

@app.on_event("startup")
def on_startup():
    logger.info("Starting up and initializing database...")
    init_db()
    
    logger.info("Starting APScheduler for JD price sync...")
    try:
        from .scheduler import start_scheduler
        start_scheduler()
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")
        
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
app.include_router(config_posters.router, prefix="/api/config-posters", tags=["configs"])
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
app.include_router(marketing.router, prefix="/api/marketing", tags=["marketing"])
app.include_router(recycling_prices.router, prefix="/api/recycling-prices", tags=["recycling-prices"])
app.include_router(jd_trends.router, prefix="/api/jd-trends", tags=["jd-trends"])
app.include_router(simulator.router, prefix="/api/simulator", tags=["simulator"])
app.include_router(external.router, prefix="/api/external", tags=["external"])
app.include_router(leaderboards.router, prefix="/api/leaderboards", tags=["leaderboards"])
app.include_router(pc3d.router, prefix="/api/pc3d", tags=["pc3d"])

# 静态文件和 SPA 路由处理
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
SITE_URL = "https://diyxx.com"
BASE_STRUCTURED_DATA = (
    '<script id="diyxx-structured-data" type="application/ld+json">'
    '{"@context":"https://schema.org","@graph":['
    '{"@type":"Organization","@id":"https://diyxx.com/#organization",'
    '"name":"蒋小鱼装机平台","url":"https://diyxx.com/",'
    '"logo":"https://diyxx.com/favicon.svg"},'
    '{"@type":"WebSite","@id":"https://diyxx.com/#website",'
    '"url":"https://diyxx.com/","name":"蒋小鱼装机平台",'
    '"description":"专业 DIY 电脑配置与 AI 智选推荐平台",'
    '"publisher":{"@id":"https://diyxx.com/#organization"},"inLanguage":"zh-CN"}'
    ']}</script>'
)


def _replace_or_insert_head_tag(html_content: str, pattern: str, replacement: str) -> str:
    if re.search(pattern, html_content, flags=re.IGNORECASE | re.DOTALL):
        return re.sub(
            pattern,
            replacement,
            html_content,
            count=1,
            flags=re.IGNORECASE | re.DOTALL,
        )
    return html_content.replace("</head>", f"  {replacement}\n</head>", 1)


def _replace_meta(html_content: str, attribute: str, key: str, content: str) -> str:
    """Replace one known SEO meta tag in the built index document."""
    safe_content = escape(content, quote=True)
    pattern = rf'<meta\s+{attribute}="{re.escape(key)}"\s+content="[^"]*"\s*/?>'
    replacement = f'<meta {attribute}="{key}" content="{safe_content}" />'
    return _replace_or_insert_head_tag(html_content, pattern, replacement)


def _serve_index_with_meta(
    *,
    title: str,
    description: str,
    canonical_path: str,
    robots: str = "index, follow, max-image-preview:large",
    image: str = "/og-image.jpg",
    status_code: int = 200,
) -> HTMLResponse:
    index_path = os.path.join(DIST_DIR, "index.html")
    if not os.path.isfile(index_path):
        raise HTTPException(status_code=404, detail="未找到页面")

    with open(index_path, "r", encoding="utf-8") as index_file:
        html_content = index_file.read()

    canonical_url = f"{SITE_URL}{canonical_path}"
    image_url = image if image.startswith(("http://", "https://")) else f"{SITE_URL}{image}"
    html_content = re.sub(
        r"<title>.*?</title>",
        f"<title>{escape(title)}</title>",
        html_content,
        count=1,
        flags=re.DOTALL,
    )
    for attribute, key, value in (
        ("name", "description", description),
        ("name", "robots", robots),
        ("name", "theme-color", "#4f46e5"),
        ("property", "og:title", title),
        ("property", "og:description", description),
        ("property", "og:type", "website"),
        ("property", "og:url", canonical_url),
        ("property", "og:image", image_url),
        ("property", "og:site_name", "蒋小鱼装机平台"),
        ("property", "og:locale", "zh_CN"),
        ("name", "twitter:card", "summary_large_image"),
        ("name", "twitter:title", title),
        ("name", "twitter:description", description),
        ("name", "twitter:image", image_url),
    ):
        html_content = _replace_meta(html_content, attribute, key, value)

    html_content = _replace_or_insert_head_tag(
        html_content,
        r'<link\s+rel="canonical"\s+href="[^"]*"\s*/?>',
        f'<link rel="canonical" href="{escape(canonical_url, quote=True)}" />',
    )
    html_content = _replace_or_insert_head_tag(
        html_content,
        r'<link\s+rel="icon"[^>]*>',
        '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    )
    if not robots.startswith("noindex") and 'id="diyxx-structured-data"' not in html_content:
        html_content = html_content.replace("</head>", f"  {BASE_STRUCTURED_DATA}\n</head>", 1)

    headers = {"Cache-Control": "no-cache, must-revalidate"}
    if robots.startswith("noindex"):
        headers["X-Robots-Tag"] = robots
    return HTMLResponse(html_content, status_code=status_code, headers=headers)


if os.path.exists(DIST_DIR):
    # 挂载静态资源
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Serve other static files from dist root (images, etc.)
    images_dir = os.path.join(DIST_DIR, "images")
    if os.path.exists(images_dir):
        app.mount("/images", StaticFiles(directory=images_dir), name="images")

# 挂载上传文件目录
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# SPA fallback - 处理前端路由
# 注意：不使用 catch-all 路由，而是使用具体的前端路由模式
@app.get("/robots.txt", response_class=PlainTextResponse, include_in_schema=False)
async def serve_robots():
    return PlainTextResponse(
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /api/\n\n"
        f"Sitemap: {SITE_URL}/sitemap.xml\n",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@app.get("/sitemap.xml", include_in_schema=False)
async def serve_sitemap():
    sitemap_path = os.path.join(DIST_DIR, "sitemap.xml")
    if not os.path.isfile(sitemap_path):
        raise HTTPException(status_code=404, detail="未找到站点地图")
    with open(sitemap_path, "r", encoding="utf-8") as sitemap_file:
        sitemap = sitemap_file.read()
    return Response(
        content=sitemap,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@app.api_route("/", methods=["GET", "HEAD"])
async def serve_index():
    """Serve index.html for root path"""
    if os.path.exists(DIST_DIR):
        index_path = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index_path):
            return _serve_index_with_meta(
                title="蒋小鱼装机平台 - 专业 DIY 电脑配置与 AI 智选推荐",
                description="使用 AI 智能生成 DIY 电脑配置，查看硬件价格与兼容性，轻松完成适合预算和用途的装机方案。",
                canonical_path="/",
            )
    raise HTTPException(status_code=404, detail="未找到页面")

# 静态文件请求（非 /api 和 /assets 路径）
@app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
async def serve_frontend(full_path: str):
    # API 路径不应该到达这里，但以防万一
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="API 接口未找到")
    
    # /uploads 路径 —— 直接从上传目录提供文件
    if full_path.startswith("uploads/"):
        upload_file_path = os.path.join(UPLOAD_DIR, full_path[len("uploads/"):])
        if os.path.isfile(upload_file_path):
            return FileResponse(upload_file_path)
        raise HTTPException(status_code=404, detail="文件未找到")

    # 检查是否存在静态文件
    if os.path.exists(DIST_DIR):
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(file_path):
            # Add long cache for hashed assets (JS/CSS with content hash in filename)
            cache_headers = {}
            if full_path.startswith("assets/") and any(full_path.endswith(ext) for ext in [".js", ".css", ".woff2", ".woff"]):
                cache_headers["Cache-Control"] = "public, max-age=31536000, immutable"
            return FileResponse(file_path, headers=cache_headers if cache_headers else None)
        # SPA fallback - 返回 index.html
        index_path = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index_path):
            normalized_path = full_path.rstrip("/")
            if normalized_path in {"VIP", "vip"}:
                return _serve_index_with_meta(
                    title="主播装机工作台 - 蒋小鱼装机平台",
                    description="面向电脑装机主播的专业配单工作台，快速选择硬件、核算预算并展示完整配置方案。",
                    canonical_path="/VIP",
                )
            if normalized_path == "pc3d":
                return _serve_index_with_meta(
                    title="3D 模型校准工作台 - 蒋小鱼装机平台",
                    description="蒋小鱼装机平台内部 3D 模型校准工具。",
                    canonical_path="/pc3d",
                    robots="noindex, nofollow",
                )
            if normalized_path == "admin":
                return _serve_index_with_meta(
                    title="管理后台 - 蒋小鱼装机平台",
                    description="蒋小鱼装机平台管理后台。",
                    canonical_path="/admin",
                    robots="noindex, nofollow",
                )
            return _serve_index_with_meta(
                title="页面未找到 - 蒋小鱼装机平台",
                description="你访问的页面不存在，请返回蒋小鱼装机平台首页。",
                canonical_path="/",
                robots="noindex, nofollow",
                status_code=404,
            )

    raise HTTPException(status_code=404, detail="未找到页面")


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    # In production with -m server_py.main, we pass the app object directly
    # and disable hot-reload for maximum stability.
    uvicorn.run(app, host=host, port=port, log_level="info")
