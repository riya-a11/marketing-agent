import io
from typing import Tuple, Optional, Dict, Any
from PIL import Image

class MediaMetadataService:
    @staticmethod
    def extract_image_dimensions(contents: bytes) -> Tuple[Optional[int], Optional[int]]:
        try:
            with Image.open(io.BytesIO(contents)) as img:
                return img.width, img.height
        except Exception:
            return None, None

    @staticmethod
    def probe_video_metadata(storage_path: str) -> Dict[str, Any]:
        return {"duration": None}

media_metadata = MediaMetadataService()
