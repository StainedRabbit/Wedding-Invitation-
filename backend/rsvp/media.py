import json
import subprocess
import uuid
from pathlib import Path

from django.conf import settings
from PIL import Image, UnidentifiedImageError
from pillow_heif import register_heif_opener

register_heif_opener()


class InvalidMedia(ValueError):
    pass


def stage_file(upload):
    root = Path(settings.RSVP_PRIVATE_ROOT)
    root.mkdir(parents=True, exist_ok=True)
    key = uuid.uuid4().hex
    path = root / key
    try:
        with path.open("xb") as destination:
            for chunk in upload.chunks():
                destination.write(chunk)
        suffix = Path(upload.name).suffix.lower()
        if suffix in (".jpg", ".jpeg", ".png", ".heic"):
            with Image.open(path) as image:
                formats = {".jpg": "JPEG", ".jpeg": "JPEG", ".png": "PNG", ".heic": "HEIF"}
                if image.format != formats[suffix]:
                    raise InvalidMedia("Unsupported photo format.")
                image.verify()
            media_type = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".heic": "image/heic"}[suffix]
        elif suffix in (".mp4", ".mov"):
            result = subprocess.run(
                [settings.RSVP_FFPROBE, "-v", "error", "-protocol_whitelist", "file", "-show_entries",
                 "format=format_name:stream=codec_type:stream_disposition=attached_pic", "-of", "json", str(path)],
                capture_output=True, text=True, timeout=60, check=True,
            )
            info = json.loads(result.stdout)
            if "mov" not in info.get("format", {}).get("format_name", "").split(",") or not any(
                stream.get("codec_type") == "video" and not stream.get("disposition", {}).get("attached_pic")
                for stream in info.get("streams", [])
            ):
                raise InvalidMedia("Unsupported video format.")
            media_type = "video/mp4" if suffix == ".mp4" else "video/quicktime"
        else:
            raise InvalidMedia("Unsupported file format.")
        return {"storage_key": key, "original_name": Path(upload.name).name[:255],
                "media_type": media_type, "byte_count": path.stat().st_size}
    except (UnidentifiedImageError, OSError, ValueError, subprocess.SubprocessError) as error:
        path.unlink(missing_ok=True)
        raise InvalidMedia("The file could not be validated. Try another file.") from error


def remove_file(storage_key):
    (Path(settings.RSVP_PRIVATE_ROOT) / storage_key).unlink(missing_ok=True)
