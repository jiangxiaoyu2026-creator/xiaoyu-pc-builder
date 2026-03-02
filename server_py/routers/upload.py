from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import os
import uuid
import shutil
from .auth import get_current_admin, get_current_user
from ..models import User

router = APIRouter()

# 获取项目根目录 (server_py 的上一级)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

# 确保上传目录存在
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    """Upload an image file and return its public URL"""
    # 验证文件类型：如果 content_type 为空或不以 image/ 开头，则通过扩展名进行二次判断（兼容部分移动端异常 Mime Type）
    ext = os.path.splitext(file.filename)[1].lower()
    valid_exts = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"}
    
    is_valid_type = file.content_type.startswith("image/") if file.content_type else False
    if not is_valid_type and ext not in valid_exts:
        raise HTTPException(status_code=400, detail="只能上传图片文件")
    
    # 生成唯一文件名
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        # 保存文件
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 返回访问 URL
        # 注意：这里的 URL 需要对应 main.py 中挂载的路径
        return {"url": f"/uploads/{filename}", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")
