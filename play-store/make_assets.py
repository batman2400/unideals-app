"""Create Play Console 512 icon and 1024x500 feature graphic from brand assets."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent
PRIMARY = (41, 105, 91)
PRIMARY_CONTAINER = (175, 239, 221)
ON_PRIMARY = (222, 255, 244)
WHITE = (255, 255, 255)
ON_BG = (50, 50, 51)


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    names = (
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    )
    for name in names:
        path = Path(name)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def flatten_white(im: Image.Image) -> Image.Image:
    rgb = Image.new("RGB", im.size, WHITE)
    if im.mode in ("RGBA", "LA"):
        rgb.paste(im, mask=im.split()[-1])
        return rgb
    return im.convert("RGB")


def make_icon() -> None:
    src = flatten_white(Image.open(ROOT / "assets" / "icon.png"))
    icon = src.resize((512, 512), Image.Resampling.LANCZOS)
    dest = OUT / "icon-512.png"
    icon.save(dest, "PNG")
    print(f"wrote {dest} {icon.size} {icon.mode}")


def make_feature_graphic() -> None:
    w, h = 1024, 500
    img = Image.new("RGB", (w, h), PRIMARY)
    draw = ImageDraw.Draw(img)
    for x in range(w):
        t = x / (w - 1)
        r = int(PRIMARY[0] + (PRIMARY_CONTAINER[0] - PRIMARY[0]) * t * 0.55)
        g = int(PRIMARY[1] + (PRIMARY_CONTAINER[1] - PRIMARY[1]) * t * 0.55)
        b = int(PRIMARY[2] + (PRIMARY_CONTAINER[2] - PRIMARY[2]) * t * 0.55)
        draw.line([(x, 0), (x, h)], fill=(r, g, b))

    mark = flatten_white(Image.open(ROOT / "assets" / "splash-icon.png"))
    mark = mark.resize((280, 280), Image.Resampling.LANCZOS)
    card = Image.new("RGB", (320, 320), WHITE)
    card.paste(mark, (20, 20))
    # Rounded card via mask
    mask = Image.new("L", (320, 320), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 319, 319), radius=36, fill=255)
    card = card.filter(ImageFilter.SMOOTH)
    img.paste(card, (72, (h - 320) // 2), mask)

    title = font(64, bold=True)
    subtitle = font(28, bold=False)
    draw.text((430, 168), "Uni Deals", font=title, fill=WHITE)
    draw.text(
        (430, 250),
        "Verified student discounts\nin Sri Lanka",
        font=subtitle,
        fill=ON_PRIMARY,
        spacing=6,
    )
    dest = OUT / "feature-graphic.png"
    img.save(dest, "PNG")
    print(f"wrote {dest} {img.size} {img.mode}")


if __name__ == "__main__":
    make_icon()
    make_feature_graphic()
