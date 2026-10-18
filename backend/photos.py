import io
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

router = APIRouter()

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_BYTES = 8 * 1024 * 1024  # 8 MB
ICON_SIZE = 256
WORK_SIZE = 1024   # shrink big photos first so background removal is fast
PADDING = 0.08     # empty space around the object, as a fraction of the icon

# "u2netp" is small and fast. "isnet-general-use" gives cleaner edges but is much bigger.
REMBG_MODEL = "u2netp"
_session = None


def _get_session():
    # Load the model the first time it's needed, not when the server starts
    global _session
    if _session is None:
        from rembg import new_session
        _session = new_session(REMBG_MODEL)
    return _session


def _center_crop_icon(img: Image.Image) -> Image.Image:
    # Fallback: plain square crop, background kept
    return ImageOps.fit(img.convert("RGB"), (ICON_SIZE, ICON_SIZE), Image.LANCZOS)


def _cutout_icon(img: Image.Image) -> Image.Image:
    from rembg import remove

    cut = remove(img, session=_get_session(), post_process_mask=True).convert("RGBA")

    # Find the object: the box around every pixel that isn't (almost) transparent
    alpha = cut.getchannel("A").point(lambda a: 255 if a > 20 else 0)
    box = alpha.getbbox()
    if box is None:
        raise ValueError("No object found")
    obj = cut.crop(box)

    # Center the object on a transparent square with some padding
    side = int(max(obj.size) / (1 - 2 * PADDING))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(obj, ((side - obj.width) // 2, (side - obj.height) // 2), obj)

    return canvas.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS)


def _make_icon(data: bytes) -> tuple[Image.Image, bool]:
    try:
        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img)  # fixes sideways phone photos
        img = img.convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(400, "That file isn't a readable image")

    img.thumbnail((WORK_SIZE, WORK_SIZE), Image.LANCZOS)

    try:
        return _cutout_icon(img), True
    except Exception as e:
        print(f"Background removal failed, using center crop: {e}")
        return _center_crop_icon(img), False


@router.post("/icons")
async def make_icon(file: UploadFile = File(...)):
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(400, "Please upload an image")

    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Image is too large (max 8 MB)")

    # Background removal is slow CPU work, so run it off the main thread
    icon, cutout = await run_in_threadpool(_make_icon, data)

    name = f"{uuid.uuid4().hex}.webp"
    # Saving a new image drops the original metadata, including GPS location
    icon.save(UPLOAD_DIR / name, "WEBP", quality=90)

    return {"icon_path": f"/uploads/{name}", "background_removed": cutout}