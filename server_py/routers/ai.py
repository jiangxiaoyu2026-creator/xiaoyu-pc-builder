from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session
from ..db import get_session
from ..models import Setting
from ..services.ai_service import AiService
from pydantic import BaseModel
import json

router = APIRouter()

DEFAULT_PUBLIC_SUGGESTIONS = [
    "3000元 办公主机",
    "5000元 性价比游戏主机",
    "8000元 直播主机",
    "15000元 极致游戏主机",
    "20000元 高端海景房主机"
]

class AIGenerateRequest(BaseModel):
    prompt: str
    budget: int = 6000
    usage: str = 'gaming' # gaming, work, streaming
    appearance: str = 'black' # black, white, rgb
    includeMonitor: bool = False
    discountRate: float = 1.0

@router.get("/public-config")
def get_public_ai_config(session: Session = Depends(get_session)):
    """Return non-sensitive AI settings for the client UI."""
    setting = session.get(Setting, "aiSettings")
    if not setting:
        return {
            "enabled": False,
            "suggestions": DEFAULT_PUBLIC_SUGGESTIONS
        }

    try:
        config = json.loads(setting.value)
    except Exception:
        return {
            "enabled": False,
            "suggestions": DEFAULT_PUBLIC_SUGGESTIONS
        }

    suggestions = config.get("suggestions")
    if not isinstance(suggestions, list) or not suggestions:
        suggestions = DEFAULT_PUBLIC_SUGGESTIONS

    return {
        "enabled": bool(config.get("enabled")),
        "suggestions": [str(item) for item in suggestions if str(item).strip()]
    }

@router.get("/data-health")
def get_ai_data_health(session: Session = Depends(get_session)):
    """Return product-data readiness for the deterministic build planner."""
    service = AiService(session)
    return service.get_build_data_health()

@router.post("/generate")
def generate_build_endpoint(
    req: AIGenerateRequest,
    session: Session = Depends(get_session)
):
    service = AiService(session)
    print(f"DEBUG: [AI] Request received for prompt: {str(req.prompt)[:50]}... budget: {req.budget}")
    
    try:
        result = service.generate_build(
            req.prompt,
            budget=req.budget,
            usage=req.usage,
            appearance=req.appearance,
            include_monitor=req.includeMonitor,
            discount_rate=req.discountRate,
        )
        
        # Check for service-level errors that might be returned as dicts (legacy or specific checks)
        if hasattr(result, "get") and result.get("error"):
             if "AI Service not configured" in result["error"]:
                 raise HTTPException(status_code=503, detail="AI Service not configured")
             raise HTTPException(status_code=500, detail=result["error"])
             
        return result
    except HTTPException:
        raise
    except Exception as e:
        # Check if it's the "not configured" error which might come from check at start of generate_build
        err_str = str(e)
        
        # Log the error on the backend for debugging
        import traceback
        traceback.print_exc()
        
        # Return 200 with an error field to bypass Nginx/Cloudflare error swallowing
        return {"error": f"AI Service Error: {err_str}", "items": {}, "totalPrice": 0}
