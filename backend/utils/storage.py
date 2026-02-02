import os
import uuid
import magic
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException

UPLOAD_DIR = Path("static/uploads")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_DOC_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "application/zip",
    "application/x-zip-compressed"
}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES

EXTENSION_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "text/plain": ".txt",
    "text/csv": ".csv",
    "application/zip": ".zip",
    "application/x-zip-compressed": ".zip"
}

def get_upload_path() -> Path:
    now = datetime.utcnow()
    year_month = now.strftime("%Y/%m")
    path = UPLOAD_DIR / year_month
    path.mkdir(parents=True, exist_ok=True)
    return path

def get_file_type(content_type: str) -> str:
    if content_type in ALLOWED_IMAGE_TYPES:
        return "imagem"
    return "arquivo"

def detect_mime_type(content: bytes) -> str:
    try:
        mime = magic.Magic(mime=True)
        detected = mime.from_buffer(content[:2048])
        return detected or "application/octet-stream"
    except Exception:
        return "application/octet-stream"

def validate_file_content(content: bytes, original_filename: str) -> Tuple[bool, str, str]:
    file_size = len(content)
    
    if file_size > MAX_FILE_SIZE:
        return False, f"Arquivo muito grande. Maximo permitido: {MAX_FILE_SIZE // (1024*1024)}MB", ""
    
    if file_size == 0:
        return False, "Arquivo vazio nao permitido", ""
    
    detected_mime = detect_mime_type(content)
    
    if detected_mime not in ALLOWED_TYPES:
        ext = Path(original_filename).suffix.lower() if original_filename else ""
        ext_to_mime = {
            ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
            ".gif": "image/gif", ".webp": "image/webp", ".pdf": "application/pdf",
            ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".txt": "text/plain", ".csv": "text/csv"
        }
        
        if ext in ext_to_mime and ext_to_mime[ext] in ALLOWED_TYPES:
            if detected_mime.startswith("application/") or detected_mime == "text/plain":
                detected_mime = ext_to_mime[ext]
            else:
                return False, f"Tipo de arquivo detectado nao permitido: {detected_mime}", ""
        else:
            return False, f"Tipo de arquivo nao permitido: {detected_mime}", ""
    
    return True, "", detected_mime

async def save_upload_file(file: UploadFile) -> dict:
    content = await file.read()
    file_size = len(content)
    original_filename = file.filename or "arquivo"
    
    is_valid, error_msg, detected_mime = validate_file_content(content, original_filename)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    extension = EXTENSION_MAP.get(detected_mime, Path(original_filename).suffix or ".bin")
    
    unique_id = uuid.uuid4().hex[:12]
    safe_name = "".join(c for c in original_filename if c.isalnum() or c in ".-_")[:50]
    new_filename = f"{unique_id}_{safe_name}"
    if not new_filename.lower().endswith(extension.lower()):
        new_filename += extension
    
    upload_path = get_upload_path()
    file_path = upload_path / new_filename
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    relative_url = "/" + str(file_path).replace("\\", "/")
    
    return {
        "url": relative_url,
        "nome": original_filename,
        "tamanho": file_size,
        "tipo": get_file_type(detected_mime),
        "content_type": detected_mime
    }

def delete_file(file_url: str) -> bool:
    try:
        if file_url.startswith("/"):
            file_url = file_url[1:]
        
        file_path = Path(file_url)
        if file_path.exists():
            file_path.unlink()
            return True
        return False
    except Exception:
        return False

def format_file_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
