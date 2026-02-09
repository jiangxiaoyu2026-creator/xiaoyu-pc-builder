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

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(hardware.router, prefix="/api/hardware", tags=["hardware"])
app.include_router(configs.router, prefix="/api/configs", tags=["configs"])
app.include_router(used.router, prefix="/api/used", tags=["used"])
app.include_router(payment.router, prefix="/api/payment", tags=["payment"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(sms.router, prefix="/api/sms", tags=["sms"])
app.include_router(recycle.router, prefix="/api/recycle", tags=["recycle"])
