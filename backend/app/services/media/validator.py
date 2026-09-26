import io
import os
import re
from typing import Tuple, Optional
from fastapi import HTTPException
from PIL import Image

# Prevent decompression bomb attacks
Image.MAX_IMAGE_PIXELS = 50_000_000

# Magic bytes signature dictionary
MAGIC_SIGNATURES = {
    "jpeg": [b"\xff\xd8\xff"],
    "png": [b"\x89PNG\r\n\x1a\n"],
    "gif": [b"GIF87a", b"GIF89a"],
    "webp": [b"RIFF"],
    "mp4": [b"ftyp"],
    "quicktime": [b"ftyp", b"moov", b"wide", b"mdat"]
}

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".mov", ".webm"}

class MediaValidator:
    """
    Enterprise media security validator:
    - Verifies file signatures (magic bytes) to prevent executable masquerading
    - Decompression-bomb and dimension limits
    - Filename sanitization against path traversal attacks
    - Format and size validation
    """
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        # Strip path traversal attempts like ../ or /
        base = os.path.basename(filename)
        # Remove dangerous characters
        cleaned = re.sub(r"[^a-zA-Z0-9_.-]", "_", base)
        return cleaned or "media_upload"

    @staticmethod
    def validate_file(contents: bytes, filename: str, declared_content_type: str, max_size: int = 50 * 1024 * 1024) -> Tuple[str, bool]:
        """
        Validates binary data integrity, size, and true format.
        Returns: (detected_content_type, is_video)
        """
        file_size = len(contents)
        if file_size == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        if file_size > max_size:
            raise HTTPException(status_code=400, detail=f"File exceeds maximum allowed size of {max_size / (1024*1024):.1f}MB.")

        # Check extension
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # Magic bytes signature inspection
        header = contents[:32]
        detected_type = None
        is_video = False

        if any(header.startswith(sig) for sig in MAGIC_SIGNATURES["jpeg"]):
            detected_type = "image/jpeg"
        elif any(header.startswith(sig) for sig in MAGIC_SIGNATURES["png"]):
            detected_type = "image/png"
        elif any(header.startswith(sig) for sig in MAGIC_SIGNATURES["gif"]):
            detected_type = "image/gif"
        elif header[:4] == b"RIFF" and b"WEBP" in header[:16]:
            detected_type = "image/webp"
        elif b"ftyp" in header[:16] or b"moov" in header[:16]:
            detected_type = "video/mp4" if ext != ".mov" else "video/quicktime"
            is_video = True
        elif ext == ".webm" and header.startswith(b"\x1a\x45\xdf\xa3"):
            detected_type = "video/webm"
            is_video = True

        if not detected_type:
            raise HTTPException(
                status_code=400,
                detail="Security validation failed: file signature does not match any valid image or video format."
            )

        # Validate image decoding with PIL to prevent corrupted payloads & decompression bombs
        if not is_video:
            try:
                with Image.open(io.BytesIO(contents)) as img:
                    img.verify()
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Corrupted or invalid image payload: {e}")

        return detected_type, is_video
