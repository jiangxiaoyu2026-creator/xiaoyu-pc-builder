from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session
from ..db import get_session
from ..services.ai_service import AiService
from pydantic import BaseModel

router = APIRouter()

class AIGenerateRequest(BaseModel):
    prompt: str
    budget: int = 6000
    usage: str = 'gaming' # gaming, work, streaming
    appearance: str = 'black' # black, white, rgb

@router.post("/generate")
async def generate_build_endpoint(
    req: AIGenerateRequest,
    session: Session = Depends(get_session)
):
    service = AiService(session)
    full_prompt = f"{req.prompt}。预算约{req.budget}元，用于{req.usage}，偏好{req.appearance}风格。"
    print(f"DEBUG: [AI] Request received for prompt: {str(req.prompt)[:50]}... budget: {req.budget}")
    
    try:
        result = service.generate_build(full_prompt)
        
        # Check for service-level errors that might be returned as dicts (legacy or specific checks)
        if hasattr(result, "get") and result.get("error"):
             if "AI Service not configured" in result["error"]:
                 raise HTTPException(status_code=503, detail="AI Service not configured")
             raise HTTPException(status_code=500, detail=result["error"])
             
        return result
    except Exception as e:
        # Check if it's the "not configured" error which might come from check at start of generate_build
        err_str = str(e)
        
        # Log the error on the backend for debugging
        import traceback
        traceback.print_exc()
        
        # Return 200 with an error field to bypass Nginx/Cloudflare error swallowing
        return {"error": f"AI Service Error: {err_str}", "items": {}, "totalPrice": 0}
