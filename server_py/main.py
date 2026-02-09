from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import init_db
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PC Builder API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    logger.info("Starting up and initializing database...")
    init_db()

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "PC Builder API is running"}

from .routers import auth, hardware, configs, used, payment, settings, sms, recycle
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(hardware.router, prefix="/api/hardware", tags=["hardware"])
app.include_router(configs.router, prefix="/api/configs", tags=["configs"])
app.include_router(used.router, prefix="/api/used", tags=["used"])
app.include_router(payment.router, prefix="/api/payment", tags=["payment"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(sms.router, prefix="/api/sms", tags=["sms"])
app.include_router(recycle.router, prefix="/api/recycle", tags=["recycle"])

# Serve static files from the 'dist' directory (frontend build)
# Only do this if the directory exists
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # If the path is an API path, it should have been caught by routers above
        # Otherwise, serve index.html for SPA routing
        if full_path.startswith("api"):
            return {"error": "Not Found"}
        return FileResponse(os.path.join(DIST_DIR, "index.html"))
