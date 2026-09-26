import uuid
import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from app.storage.db import save_media_asset, get_media_asset, list_media_assets
from app.services.media.validator import MediaValidator
from app.services.media.storage import media_storage
from app.services.media.metadata import media_metadata

logger = logging.getLogger("media_subsystem")

router = APIRouter(prefix="/media", tags=["Media Subsystem"])

@router.post("/upload")
async def upload_media(request: Request, file: UploadFile = File(...)):
    """
    Enterprise Media Upload:
    - Verifies magic byte file signatures (JPEG, PNG, WebP, GIF, MP4, MOV)
    - Enforces decompression bomb limits & sanitizes filenames
    - Stores file via MediaStorageService with public HTTPS URL mapping
    - Persists asset record in media_assets DB table
    """
    raw_filename = file.filename or "media_file.jpg"
    sanitized_filename = MediaValidator.sanitize_filename(raw_filename)
    declared_type = (file.content_type or "").lower()

    # Read binary content
    contents = await file.read()
    
    # Run enterprise security validation
    detected_content_type, is_video = MediaValidator.validate_file(
        contents=contents,
        filename=sanitized_filename,
        declared_content_type=declared_type
    )

    # Save via storage service
    request_base_url = str(request.base_url).rstrip("/")
    storage_res = media_storage.save_file(
        contents=contents,
        filename=sanitized_filename,
        content_type=detected_content_type,
        request_base_url=request_base_url
    )

    # Extract metadata & dimensions
    width, height = (None, None)
    duration = None
    if not is_video:
        width, height = media_metadata.extract_image_dimensions(contents)

    asset_id = f"media_{uuid.uuid4().hex[:12]}"
    asset_record = {
        "id": asset_id,
        "filename": storage_res["unique_filename"],
        "storage_path": storage_res["storage_path"],
        "public_url": storage_res["public_url"],
        "content_type": detected_content_type,
        "size": storage_res["size"],
        "width": width,
        "height": height,
        "duration": duration,
        "status": "ready"
    }

    saved = save_media_asset(asset_record)
    logger.info(f"Enterprise media asset registered: {asset_id} -> {saved['public_url']}")

    return {
        "id": saved["id"],
        "url": saved["public_url"],
        "filename": saved["filename"],
        "content_type": saved["content_type"],
        "size": saved["size"],
        "width": saved["width"],
        "height": saved["height"],
        "duration": saved["duration"],
        "status": "ready"
    }

@router.get("/")
def get_media_library(limit: int = 50):
    """Retrieves uploaded media library assets."""
    return {"assets": list_media_assets(limit)}

@router.get("/{asset_id}")
def get_single_media(asset_id: str):
    """Retrieves metadata for a specific media asset."""
    asset = get_media_asset(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Media asset not found")
    return asset
