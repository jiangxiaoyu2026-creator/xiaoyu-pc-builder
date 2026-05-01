from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import os
import uuid
import shutil
from .auth import get_current_admin, get_current_user
from ..models import User
from pydantic import BaseModel
import ipaddress
import socket

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

class UrlUploadRequest(BaseModel):
    url: str

@router.post("/url")
def upload_image_by_url(
    request: UrlUploadRequest,
    user: User = Depends(get_current_user)
):
    """Download an image from a URL and save it locally"""
    import requests
    from urllib.parse import urlparse
    
    # SSRF Protection: Validate URL and IP
    try:
        parsed_url = urlparse(request.url)
        if parsed_url.scheme not in ["http", "https"]:
            raise HTTPException(status_code=400, detail="只允许 http 或 https 协议")
            
        hostname = parsed_url.hostname
        if not hostname:
            raise HTTPException(status_code=400, detail="无效的 URL")
            
        # Get IP address
        try:
            ip = socket.gethostbyname(hostname)
        except socket.gaierror:
            raise HTTPException(status_code=400, detail="无法解析的域名")
            
        ip_obj = ipaddress.ip_address(ip)
        
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local:
            raise HTTPException(status_code=400, detail="不允许访问内部网络地址")
            
        response = requests.get(request.url, timeout=10, stream=True)
        response.raise_for_status()
        
        # Check content length
        content_length = response.headers.get('content-length')
        if content_length and int(content_length) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="图片文件过大，限制在10MB以内")
        
        # Check content type
        content_type = response.headers.get('content-type', '')
        if not content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="URL 必须指向一个图片文件")
            
        # Get extension from URL or content type
        path = urlparse(request.url).path
        ext = os.path.splitext(path)[1].lower()
        if not ext:
            # Try to map from content type
            mapping = {"image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp"}
            ext = mapping.get(content_type, ".jpg")
            
        filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        max_size = 10 * 1024 * 1024  # 10MB
        downloaded_size = 0
        
        with open(file_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                downloaded_size += len(chunk)
                if downloaded_size > max_size:
                    f.close()
                    os.remove(file_path)
                    raise HTTPException(status_code=400, detail="图片文件过大，限制在10MB以内")
                f.write(chunk)
                
        return {"url": f"/uploads/{filename}", "filename": filename}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"抓取图片失败: {str(e)}")
