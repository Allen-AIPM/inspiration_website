"""Create small gallery images while preserving the originals for detail views."""

import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent.parent
PHOTOS = ROOT / "public" / "photo"
THUMBS = ROOT / "public" / "thumb"
HERO = ROOT / "public" / "hero.webp"
MANIFEST = ROOT / "src" / "image-manifest.json"
HERO_NAME = "20261021183200669137.jpg"


def save_webp(image, destination, max_width, quality):
    resized = image.copy()
    if resized.width > max_width:
        resized.thumbnail((max_width, max_width * 3), Image.Resampling.LANCZOS)
    resized.convert("RGB").save(destination, "WEBP", quality=quality, method=6)


THUMBS.mkdir(parents=True, exist_ok=True)
manifest = {}
photos = sorted(path for path in PHOTOS.rglob("*") if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".bmp"})
if not photos:
    raise SystemExit(f"No images found in {PHOTOS}")
hero_source = next((path for path in photos if path.relative_to(PHOTOS).as_posix() == HERO_NAME), photos[0])
expected = {path.relative_to(PHOTOS).with_suffix(".webp").as_posix() for path in photos}
for stale in THUMBS.rglob("*.webp"):
    if stale.is_file() and stale.relative_to(THUMBS).as_posix() not in expected:
        stale.unlink()

for path in photos:
    with Image.open(path) as original:
        image = ImageOps.exif_transpose(original)
        relative = path.relative_to(PHOTOS)
        manifest[relative.as_posix()] = {"width": image.width, "height": image.height}
        target = THUMBS / relative.with_suffix(".webp")
        target.parent.mkdir(parents=True, exist_ok=True)
        save_webp(image, target, 720, 78)
        if path == hero_source:
            save_webp(image, HERO, 1440, 82)

MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
total = sum(path.stat().st_size for path in THUMBS.rglob("*.webp"))
print(f"Generated {len(manifest)} gallery thumbnails ({total / 1024 / 1024:.2f} MiB total).")
