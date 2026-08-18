"""Rebuild launcher/splash/logo: smaller black UD on white (no transparent plate)."""

from pathlib import Path

from PIL import Image

assets = Path(__file__).resolve().parents[1] / "assets"
src = Image.open(assets / "unideals final logo .png").convert("RGBA")

ink = Image.new("L", src.size, 0)
px_src = src.load()
px_ink = ink.load()
w, h = src.size

for y in range(h):
    for x in range(w):
        r, g, b, a = px_src[x, y]
        if a < 20:
            continue
        if (r + g + b) / 3 < 180:
            px_ink[x, y] = 255

bbox = ink.getbbox()
if not bbox:
    raise SystemExit("No logo ink found")

cropped = ink.crop(bbox)
cw, ch = cropped.size
canvas = 1024  # Expo/Android icon size


def make_icon(scale_of_canvas: float) -> Image.Image:
    """White background + black UD, mark sized for adaptive safe zone."""
    target = int(canvas * scale_of_canvas)
    scale = target / max(cw, ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    mark = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (canvas - nw) // 2
    oy = (canvas - nh) // 2
    out = Image.new("RGB", (canvas, canvas), (255, 255, 255))
    black = Image.new("RGB", (nw, nh), (0, 0, 0))
    out.paste(black, (ox, oy), mark)
    return out


def make_transparent(scale_of_canvas: float) -> Image.Image:
    """Transparent background + black UD for in-app login mark."""
    target = int(canvas * scale_of_canvas)
    scale = target / max(cw, ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    mark = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (canvas - nw) // 2
    oy = (canvas - nh) // 2
    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    black = Image.new("RGBA", (nw, nh), (0, 0, 0, 255))
    out.paste(black, (ox, oy), mark)
    return out


# ~34% of canvas keeps mark inside adaptive safe zone with padding like other apps
launcher = make_icon(0.34)
splash = make_icon(0.40)
login = make_transparent(0.55)

launcher.save(assets / "icon.png", "PNG")
launcher.save(assets / "adaptive-icon.png", "PNG")
splash.save(assets / "splash-icon.png", "PNG")
login.save(assets / "logo.png", "PNG")

for name in ("_emu_dock.png", "_emu_shot.png", "_preview_foreground.png"):
    p = assets / name
    if p.exists():
        p.unlink()

print("icon/adaptive: 34% black UD on white")
print("splash: 40% black UD on white")
print("logo (in-app): transparent + black UD")
