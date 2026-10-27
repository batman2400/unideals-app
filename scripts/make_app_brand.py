"""Build app icon, splash, login mark, and Play listing images from the two-colour UD.

Source: assets/new finalized logo with 2 colours.jpeg
U is black, D is teal. Apple and Play icons are RGB with no transparency.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
PLAY = ROOT / "play-store"
SRC = ASSETS / "new finalized logo with 2 colours.jpeg"

THEME = (41, 105, 91)
THEME_LIGHT = (114, 178, 162)
WHITE = (255, 255, 255, 255)
INK_DARKNESS = 18


def load_glyph() -> Image.Image:
    src = Image.open(SRC).convert("RGB")
    px = src.load()
    width, height = src.size
    min_x, min_y, max_x, max_y = width, height, 0, 0
    for y in range(height):
        for x in range(width):
            r, g, b = px[x, y]
            if max(255 - r, 255 - g, 255 - b) < INK_DARKNESS:
                continue
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
    if max_x <= min_x:
        raise SystemExit(f"No logo pixels found in {SRC}")

    pad = 8
    crop = src.crop(
        (
            max(0, min_x - pad),
            max(0, min_y - pad),
            min(width, max_x + 1 + pad),
            min(height, max_y + 1 + pad),
        )
    )
    out = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    sp = crop.load()
    dp = out.load()
    for y in range(crop.size[1]):
        for x in range(crop.size[0]):
            r, g, b = sp[x, y]
            darkness = max(255 - r, 255 - g, 255 - b)
            if darkness < INK_DARKNESS:
                continue
            alpha = 255 if darkness >= 36 else int(darkness / 36 * 255)
            dp[x, y] = (r, g, b, alpha)
    return out


def square_icon(glyph: Image.Image, size: int, fraction: float) -> Image.Image:
    gw, gh = glyph.size
    scale = (size * fraction) / max(gw, gh)
    nw = max(1, int(round(gw * scale)))
    nh = max(1, int(round(gh * scale)))
    scaled = glyph.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), WHITE)
    canvas.paste(scaled, ((size - nw) // 2, (size - nh) // 2), scaled)
    return canvas.convert("RGB")


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True)
    print(f"Wrote {path.relative_to(ROOT)} {image.size} {image.mode}")


def feature_graphic(glyph: Image.Image) -> Image.Image:
    width, height = 1024, 500
    canvas = Image.new("RGB", (width, height))
    px = canvas.load()
    for x in range(width):
        t = x / (width - 1)
        color = tuple(int(THEME[i] + (THEME_LIGHT[i] - THEME[i]) * t) for i in range(3))
        for y in range(height):
            px[x, y] = color

    plate = 320
    plate_img = Image.new("RGBA", (plate, plate), (0, 0, 0, 0))
    ImageDraw.Draw(plate_img).rounded_rectangle(
        (0, 0, plate - 1, plate - 1),
        radius=56,
        fill=(255, 255, 255, 255),
    )
    gw, gh = glyph.size
    scale = (plate * 0.70) / max(gw, gh)
    nw = max(1, int(round(gw * scale)))
    nh = max(1, int(round(gh * scale)))
    mark = glyph.resize((nw, nh), Image.Resampling.LANCZOS)
    plate_img.paste(mark, ((plate - nw) // 2, (plate - nh) // 2), mark)
    plate_x, plate_y = 72, (height - plate) // 2
    canvas.paste(plate_img, (plate_x, plate_y), plate_img)

    bold = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 72)
    regular = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 32)
    draw = ImageDraw.Draw(canvas)
    text_x = plate_x + plate + 48
    title = "Uni Deals"
    lines = ("Verified student discounts", "in Sri Lanka")
    title_box = draw.textbbox((0, 0), title, font=bold)
    line_boxes = [draw.textbbox((0, 0), line, font=regular) for line in lines]
    title_h = title_box[3] - title_box[1]
    line_h = max(box[3] - box[1] for box in line_boxes)
    gap = 16
    line_gap = 6
    block_h = title_h + gap + line_h * 2 + line_gap
    title_top = (height - block_h) // 2
    draw.text((text_x, title_top - title_box[1]), title, font=bold, fill=(255, 255, 255))
    y = title_top + title_h + gap
    for line, box in zip(lines, line_boxes):
        draw.text((text_x, y - box[1]), line, font=regular, fill=(232, 244, 240))
        y += line_h + line_gap
    return canvas


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source logo: {SRC}")
    glyph = load_glyph()
    save_png(square_icon(glyph, 1024, 0.68), ASSETS / "icon.png")
    # Android shows only the centre of this image, so the mark is smaller
    # here than on the iOS icon. 0.48 lands on the in-between home-screen size.
    save_png(square_icon(glyph, 1024, 0.48), ASSETS / "adaptive-icon.png")
    save_png(glyph, ASSETS / "splash-icon.png")
    save_png(glyph, ASSETS / "logo.png")
    save_png(square_icon(glyph, 512, 0.70), PLAY / "icon-512.png")
    save_png(feature_graphic(glyph), PLAY / "feature-graphic.png")
    print(f"Glyph {glyph.size[0]}x{glyph.size[1]}")


if __name__ == "__main__":
    main()
