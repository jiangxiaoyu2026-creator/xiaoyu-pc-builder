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
    # Combine structured inputs into natural language prompt if needed, 
    # but the service 'generate_build' takes a single string or we can enhance it.
    # Service implementation in previous step took 'user_prompt'. 
    # Let's combine them for better context.
    
    full_prompt = f"{req.prompt}。预算约{req.budget}元，用于{req.usage}，偏好{req.appearance}风格。"
    
    result = service.generate_build(full_prompt)
    if "error" in result:
        # Check if it's a configuration error
        if "AI Service not configured" in result["error"]:
             raise HTTPException(status_code=503, detail="AI Service not configured. Please check admin settings.")
        return result # Return error-like object or raise exception? Frontend expects JSON.
    return result
