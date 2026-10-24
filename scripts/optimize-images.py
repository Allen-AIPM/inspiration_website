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
photos = sorted(path for path in PHOTOS.iterdir() if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".avif"})
expected = {f"{path.stem}.webp" for path in photos}
for stale in THUMBS.iterdir():
    if stale.is_file() and stale.suffix == ".webp" and stale.name not in expected:
        stale.unlink()

for path in photos:
    with Image.open(path) as original:
        image = ImageOps.exif_transpose(original)
        manifest[path.name] = {"width": image.width, "height": image.height}
        save_webp(image, THUMBS / f"{path.stem}.webp", 720, 78)
        if path.name == HERO_NAME:
            save_webp(image, HERO, 1440, 82)

MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
total = sum(path.stat().st_size for path in THUMBS.glob("*.webp"))
print(f"Generated {len(manifest)} gallery thumbnails ({total / 1024 / 1024:.2f} MiB total).")
