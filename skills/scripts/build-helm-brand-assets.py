from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


REPO_ROOT = Path(__file__).resolve().parents[2]
BRAND_ROOT = REPO_ROOT / "skills" / "assets" / "brand"
APP_BRAND_ROOT = REPO_ROOT / "apps" / "desktop" / "src" / "assets" / "brand"
SITE_ASSET_ROOT = REPO_ROOT / "site" / "assets"
MANAGER_ASSET_ROOT = REPO_ROOT / "skills" / "manager" / "assets"
APP_REFERENCE_ROOT = APP_BRAND_ROOT / "reference"
REFERENCE_ROOT = BRAND_ROOT / "reference"
SOURCE_MARK = BRAND_ROOT / "helm-command-mark-source.png"

NAVY = (15, 31, 61, 255)
DEEP = (37, 99, 235, 255)
OCEAN = (127, 180, 255, 255)
SAIL = (191, 217, 255, 255)
MIST = (245, 248, 255, 255)
WHITE = (255, 255, 255, 255)


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def mix(a: tuple[int, int, int, int], b: tuple[int, int, int, int], t: float) -> tuple[int, int, int, int]:
    return tuple(lerp(a[i], b[i], t) for i in range(4))


def rounded_gradient(size: int, radius: int) -> Image.Image:
    gradient = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = gradient.load()
    for y in range(size):
        y_t = y / max(1, size - 1)
        for x in range(size):
            x_t = x / max(1, size - 1)
            base = mix(WHITE, MIST, y_t * 0.7)
            blue_wash = int(22 * (1 - x_t) * (1 - y_t))
            px[x, y] = (
                max(0, base[0] - blue_wash),
                min(255, base[1] + blue_wash // 3),
                min(255, base[2] + blue_wash),
                255,
            )
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.alpha_composite(gradient)
    out.putalpha(mask)
    return out


def apply_rounded_corners(image: Image.Image, radius_ratio: float = 0.18) -> Image.Image:
    image = image.convert("RGBA")
    width, height = image.size
    radius = round(min(width, height) * radius_ratio)
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, width - 1, height - 1), radius=radius, fill=255)
    alpha = ImageChops.multiply(image.getchannel("A"), mask)
    out = image.copy()
    out.putalpha(alpha)
    return out


def draw_arc_segment(
    layer: Image.Image,
    bbox: tuple[int, int, int, int],
    start: float,
    end: float,
    width: int,
    color_a: tuple[int, int, int, int],
    color_b: tuple[int, int, int, int],
) -> None:
    draw = ImageDraw.Draw(layer)
    steps = max(12, round(abs(end - start) / 2.0))
    for i in range(steps):
        t0 = i / steps
        t1 = (i + 1) / steps
        a0 = start + (end - start) * t0
        a1 = start + (end - start) * t1 + 0.75
        draw.arc(bbox, start=a0, end=a1, fill=mix(color_a, color_b, t0), width=width)


def polar(center: tuple[int, int], radius: float, angle_deg: float) -> tuple[int, int]:
    angle = math.radians(angle_deg)
    return (round(center[0] + math.cos(angle) * radius), round(center[1] + math.sin(angle) * radius))


def draw_node(layer: Image.Image, center: tuple[int, int], radius: int, fill: tuple[int, int, int, int]) -> None:
    shadow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse(
        (center[0] - radius, center[1] - radius + radius // 5, center[0] + radius, center[1] + radius + radius // 5),
        fill=(37, 99, 235, 28),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(max(2, radius // 4)))
    layer.alpha_composite(shadow)

    draw = ImageDraw.Draw(layer)
    draw.ellipse(
        (center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius),
        fill=fill,
        outline=(255, 255, 255, 235),
        width=max(2, radius // 9),
    )
    highlight_r = max(2, radius // 3)
    draw.ellipse(
        (
            center[0] - highlight_r,
            center[1] - radius + radius // 4,
            center[0] + highlight_r,
            center[1] - radius + radius // 4 + highlight_r * 2,
        ),
        fill=(255, 255, 255, 102),
    )


def draw_pointer(layer: Image.Image, size: int) -> None:
    draw = ImageDraw.Draw(layer)
    cx = cy = size // 2
    points = [
        (cx + round(size * 0.098), cy - round(size * 0.16)),
        (cx - round(size * 0.118), cy + round(size * 0.062)),
        (cx - round(size * 0.02), cy + round(size * 0.022)),
        (cx + round(size * 0.048), cy + round(size * 0.13)),
    ]
    shadow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.polygon([(x, y + round(size * 0.01)) for x, y in points], fill=(15, 31, 61, 34))
    shadow = shadow.filter(ImageFilter.GaussianBlur(round(size * 0.011)))
    layer.alpha_composite(shadow)

    draw.polygon(points, fill=DEEP)
    inner = [
        (cx + round(size * 0.063), cy - round(size * 0.1)),
        (cx - round(size * 0.006), cy + round(size * 0.014)),
        (cx + round(size * 0.046), cy + round(size * 0.1)),
    ]
    draw.polygon(inner, fill=(31, 78, 174, 215))
    shine = [
        (cx + round(size * 0.082), cy - round(size * 0.13)),
        (cx - round(size * 0.07), cy + round(size * 0.042)),
        (cx - round(size * 0.012), cy + round(size * 0.02)),
    ]
    draw.polygon(shine, fill=(144, 192, 255, 92))


def build_icon(size: int = 4096) -> Image.Image:
    source = Image.open(SOURCE_MARK).convert("RGBA")
    resized = source.resize((size, size), Image.Resampling.LANCZOS)
    if size > source.width:
        resized = resized.filter(ImageFilter.UnsharpMask(radius=1.2, percent=85, threshold=3))
    return apply_rounded_corners(resized)


def save_png(image: Image.Image, path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    resized = image.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(path, "PNG", optimize=True)


def save_ico(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    image.save(path, "ICO", sizes=sizes)


def font(size: int, serif: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/georgia.ttf" if serif else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/georgiab.ttf" if serif else "C:/Windows/Fonts/segoeuib.ttf",
        "/System/Library/Fonts/Supplemental/Georgia.ttf" if serif else "/System/Library/Fonts/SFNS.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf" if serif else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except Exception:
            continue
    return ImageFont.load_default()


def paste_fit(canvas: Image.Image, image: Image.Image, box: tuple[int, int, int, int]) -> None:
    width = box[2] - box[0]
    height = box[3] - box[1]
    fitted = image.copy()
    fitted.thumbnail((width, height), Image.Resampling.LANCZOS)
    x = box[0] + (width - fitted.width) // 2
    y = box[1] + (height - fitted.height) // 2
    canvas.alpha_composite(fitted, (x, y))


def soft_panel(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], radius: int = 34) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=(255, 255, 255, 214), outline=(191, 217, 255, 138), width=2)


def build_language_board(helm_icon: Image.Image) -> Image.Image:
    size = (2400, 1500)
    board = Image.new("RGBA", size, (250, 253, 255, 255))
    draw = ImageDraw.Draw(board)
    for y in range(size[1]):
        t = y / size[1]
        color = mix(WHITE, MIST, t * 0.82)
        draw.line((0, y, size[0], y), fill=color)

    for i, alpha in enumerate([26, 18, 12]):
        y = 300 + i * 74
        points = [(0, y)]
        for x in range(0, size[0] + 1, 48):
            points.append((x, y + int(math.sin(x / 260 + i) * 54)))
        points.append((size[0], y + 210))
        points.append((0, y + 210))
        draw.polygon(points, fill=(127, 180, 255, alpha))

    title_font = font(106, serif=True)
    ui_font = font(34)
    small_font = font(25)
    label_font = font(21)
    draw.text((118, 84), "VELA", fill=NAVY, font=title_font)
    draw.text((520, 110), "+", fill=(145, 166, 205, 255), font=font(70))
    draw.text((690, 84), "HELM", fill=NAVY, font=title_font)
    draw.text((118, 220), "One visual language. Two independent roles.", fill=(78, 101, 139, 255), font=ui_font)

    vela = Image.open(BRAND_ROOT / "vela-workflow-mark.png").convert("RGBA")
    paste_fit(board, vela, (116, 318, 496, 696))
    paste_fit(board, helm_icon, (624, 318, 1004, 696))
    draw.text((124, 728), "VELA structures workflow evidence.", fill=(53, 77, 115, 255), font=small_font)
    draw.text((632, 728), "HELM reads local project state.", fill=(53, 77, 115, 255), font=small_font)

    soft_panel(draw, (1090, 86, 2280, 510), 36)
    draw.text((1148, 140), "Color System", fill=DEEP, font=font(28))
    colors = [
        ("Mist", "#F5F8FF", (245, 248, 255, 255)),
        ("Sky", "#E6F0FF", (230, 240, 255, 255)),
        ("Sail", "#BFD9FF", SAIL),
        ("Ocean", "#7FB4FF", OCEAN),
        ("Deep", "#2563EB", DEEP),
        ("Navy", "#0F1F3D", NAVY),
    ]
    for index, (name, value, color) in enumerate(colors):
        x = 1150 + index * 178
        draw.ellipse((x, 222, x + 96, 318), fill=color, outline=(191, 217, 255, 190), width=2)
        draw.text((x, 350), name, fill=(74, 96, 134, 255), font=label_font)
        draw.text((x, 386), value, fill=(100, 116, 139, 255), font=label_font)

    soft_panel(draw, (1090, 560, 2280, 910), 36)
    draw.text((1148, 616), "Shared Motifs", fill=DEEP, font=font(28))
    motifs = [
        ("Layered sail", "workflow packaging"),
        ("Evidence trace", "visible checkpoints"),
        ("Navigation rings", "state awareness"),
        ("Soft wave layers", "calm continuity"),
    ]
    for i, (name, text) in enumerate(motifs):
        x = 1148 + i * 278
        draw.rounded_rectangle((x, 686, x + 228, 838), radius=24, fill=(245, 248, 255, 255), outline=(191, 217, 255, 120))
        draw.text((x + 24, 710), name, fill=NAVY, font=font(23))
        draw.text((x + 24, 756), text, fill=(86, 108, 145, 255), font=font(19))

    soft_panel(draw, (118, 980, 2280, 1340), 36)
    draw.text((176, 1036), "Public boundary", fill=DEEP, font=font(28))
    rules = [
        "HELM is a dashboard, not a research executor.",
        "VELA is optional local workflow context.",
        "Codex remains the place where research work continues.",
        "Public releases exclude personal data and private paths.",
    ]
    for i, rule in enumerate(rules):
        y = 1102 + i * 52
        draw.ellipse((184, y + 8, 204, y + 28), fill=OCEAN)
        draw.text((224, y), rule, fill=(48, 70, 108, 255), font=font(28))

    return board


def build_relationship_board(helm_icon: Image.Image) -> Image.Image:
    size = (2400, 1350)
    board = Image.new("RGBA", size, (250, 253, 255, 255))
    draw = ImageDraw.Draw(board)
    title_font = font(92, serif=True)
    body_font = font(30)
    small_font = font(24)

    draw.text((118, 82), "VELA + HELM", fill=NAVY, font=title_font)
    draw.text((118, 202), "Separate repositories, linked roles, one calm visual system.", fill=(78, 101, 139, 255), font=body_font)

    vela = Image.open(BRAND_ROOT / "vela-workflow-mark.png").convert("RGBA")
    panels = [
        ((118, 356, 690, 910), "VELA", "Structures workflow evidence", vela),
        ((914, 356, 1486, 910), "HELM", "Reads local project state", helm_icon),
        ((1710, 356, 2282, 910), "Codex", "Continues the research work", None),
    ]
    for box, name, subtitle, image in panels:
        soft_panel(draw, box, 42)
        if image is not None:
            paste_fit(board, image, (box[0] + 132, box[1] + 58, box[2] - 132, box[1] + 350))
        else:
            cx = (box[0] + box[2]) // 2
            cy = box[1] + 205
            draw.polygon([(cx, cy - 92), (cx + 54, cy), (cx, cy + 92), (cx - 54, cy)], fill=DEEP)
            draw.ellipse((cx - 132, cy - 132, cx + 132, cy + 132), outline=(191, 217, 255, 160), width=7)
        draw.text((box[0] + 70, box[1] + 396), name, fill=NAVY, font=font(50, serif=True))
        draw.text((box[0] + 70, box[1] + 478), subtitle, fill=(73, 96, 132, 255), font=small_font)

    for x in [746, 1542]:
        draw.line((x, 632, x + 110, 632), fill=(127, 180, 255, 210), width=8)
        draw.polygon([(x + 110, 632), (x + 82, 612), (x + 82, 652)], fill=(127, 180, 255, 230))

    soft_panel(draw, (118, 1010, 2282, 1236), 36)
    notes = [
        ("VELA can be absent.", "HELM still starts with empty or sample state."),
        ("HELM does not execute research.", "It prepares a handoff for Codex."),
        ("Release artifacts stay sanitized.", "No personal projects or local paths."),
    ]
    for i, (head, text) in enumerate(notes):
        x = 184 + i * 700
        draw.text((x, 1068), head, fill=DEEP, font=font(27))
        draw.text((x, 1112), text, fill=(78, 101, 139, 255), font=font(23))
    return board


def build_helm_board(helm_icon: Image.Image) -> Image.Image:
    size = (2400, 1350)
    board = Image.new("RGBA", size, (250, 253, 255, 255))
    draw = ImageDraw.Draw(board)
    draw.text((118, 90), "HELM", fill=NAVY, font=font(108, serif=True))
    draw.text((118, 228), "Handoff Evidence Ledger Monitor", fill=(78, 101, 139, 255), font=font(34))
    paste_fit(board, helm_icon, (126, 360, 760, 994))
    soft_panel(draw, (880, 130, 2260, 560), 42)
    draw.text((948, 198), "Symbol logic", fill=DEEP, font=font(30))
    logic = [
        ("Navigation ring", "oversight without control claims"),
        ("Direction pointer", "clear handoff to the next step"),
        ("Waypoints", "visible evidence and progress states"),
    ]
    for i, (head, text) in enumerate(logic):
        y = 274 + i * 78
        draw.ellipse((958, y + 10, 982, y + 34), fill=OCEAN)
        draw.text((1014, y), head, fill=NAVY, font=font(28))
        draw.text((1306, y + 2), text, fill=(78, 101, 139, 255), font=font(24))

    soft_panel(draw, (880, 640, 2260, 1060), 42)
    draw.text((948, 708), "Usage", fill=DEEP, font=font(30))
    usage = [
        "Use this mark for the app icon, README, Pages, and installer assets.",
        "Do not use older HELM master icons or cropped board screenshots.",
        "Keep VELA marks separate unless explaining the companion workflow model.",
    ]
    for i, text in enumerate(usage):
        y = 784 + i * 70
        draw.rounded_rectangle((958, y + 4, 998, y + 44), radius=10, fill=(230, 240, 255, 255), outline=(127, 180, 255, 160))
        draw.text((1030, y), text, fill=(53, 77, 115, 255), font=font(26))
    return board


def main() -> None:
    master = build_icon(4096)
    outputs = [
        (BRAND_ROOT / "helm-command-mark-4096.png", 4096),
        (BRAND_ROOT / "helm-command-mark.png", 1024),
        (APP_BRAND_ROOT / "helm-command-mark.png", 1024),
        (SITE_ASSET_ROOT / "helm-icon.png", 1024),
        (MANAGER_ASSET_ROOT / "helm-command-mark.png", 1024),
    ]
    for path, size in outputs:
        save_png(master, path, size)
    save_ico(master, BRAND_ROOT / "helm-command-mark.ico")
    save_ico(master, MANAGER_ASSET_ROOT / "helm-command-mark.ico")

    language_board = build_language_board(master)
    relationship_board = build_relationship_board(master)
    helm_board = build_helm_board(master)
    board_outputs = [
        (language_board, SITE_ASSET_ROOT / "vela-helm-language.png"),
        (relationship_board, SITE_ASSET_ROOT / "vela-helm-board.png"),
        (relationship_board, BRAND_ROOT / "vela-helm-brand-board.png"),
        (relationship_board, APP_BRAND_ROOT / "vela-helm-brand-board.png"),
        (relationship_board, REFERENCE_ROOT / "vela-helm-relationship-board-reference.png"),
        (relationship_board, APP_REFERENCE_ROOT / "vela-helm-relationship-board-reference.png"),
        (language_board, REFERENCE_ROOT / "vela-helm-design-language-reference.png"),
        (language_board, APP_REFERENCE_ROOT / "vela-helm-design-language-reference.png"),
        (helm_board, REFERENCE_ROOT / "helm-brand-board-reference.png"),
        (helm_board, APP_REFERENCE_ROOT / "helm-brand-board-reference.png"),
    ]
    for image, path in board_outputs:
        path.parent.mkdir(parents=True, exist_ok=True)
        image.save(path, "PNG", optimize=True)
    print(BRAND_ROOT / "helm-command-mark-4096.png")


if __name__ == "__main__":
    main()
