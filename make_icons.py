"""Genera los iconos del sitio (favicon, apple-touch-icon, PWA 192/512)."""
import math
from PIL import Image, ImageDraw

BG_TOP = (27, 32, 41)      # #1b2029 (theme-color)
BG_BOT = (15, 76, 92)      # teal oscuro
SUN = (250, 204, 21)       # amarillo
WIND = (186, 230, 253)     # azul claro


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def draw_icon(size, rounded=True):
    img = Image.new("RGB", (size, size), BG_TOP)
    d = ImageDraw.Draw(img)
    for y in range(size):
        d.line([(0, y), (size, y)], fill=lerp(BG_TOP, BG_BOT, y / size))

    # Sol (dentro de la zona segura maskable: 80% central)
    cx, cy, r = size * 0.5, size * 0.40, size * 0.16
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=SUN)
    for i in range(8):
        a = math.radians(i * 45)
        x1, y1 = cx + math.cos(a) * r * 1.35, cy + math.sin(a) * r * 1.35
        x2, y2 = cx + math.cos(a) * r * 1.75, cy + math.sin(a) * r * 1.75
        d.line([(x1, y1), (x2, y2)], fill=SUN, width=max(2, int(size * 0.03)))

    # Líneas de viento/aire
    lw = max(2, int(size * 0.045))
    for i, (y, x0, x1) in enumerate([
        (0.66, 0.22, 0.78),
        (0.76, 0.30, 0.86),
        (0.86, 0.22, 0.66),
    ]):
        yy = size * y
        d.line([(size * x0, yy), (size * x1, yy)], fill=WIND, width=lw)
        # gancho curvado al final de cada ráfaga
        gr = size * 0.05
        d.arc([size * x1 - gr * 2, yy - gr, size * x1, yy + gr], start=-90, end=90, fill=WIND, width=lw)

    if rounded:
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(img, (0, 0), rounded_mask(size, int(size * 0.18)))
        return out
    return img.convert("RGBA")


# PWA / Android
draw_icon(512).save("icon-512.png", optimize=True)
draw_icon(192).save("icon-192.png", optimize=True)
# Apple touch icon: 180x180, sin transparencia (fondo sólido)
draw_icon(180, rounded=False).convert("RGB").save("apple-touch-icon.png", optimize=True)
# Favicon PNG 48px
draw_icon(48).save("favicon.png", optimize=True)
# favicon.ico multi-tamaño
draw_icon(256).save(
    "favicon.ico",
    sizes=[(16, 16), (32, 32), (48, 48)],
)
print("OK")
