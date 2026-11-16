#!/usr/bin/env python3
"""从 assets/icon.svg 生成 HandPick 全套图标。

用法: python script/gen_icons.py
依赖: pip install resvg-py pillow

输出:
  assets/logo/{16,32,48,64,128,256,512,1024}x{...}.png  （圆角外透明）
  assets/logo/icon.ico / icon.icns
  assets/logo/bw/32x32_black.png / 32x32_white.png       托盘单色（仅图形轮廓）
  assets/logo/bw/macIconTemplate.png / macIconTemplate@2x.png
  src/renderer/assets/logo.svg                           矢量主标（与 icon.svg 同源）

矢量源 assets/icon.svg 是唯一标准：改图标先改 SVG，再跑本脚本。
"""
import io
import re
from pathlib import Path

from PIL import Image
import resvg_py

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "icon.svg"
LOGO = ROOT / "assets" / "logo"
SIZES = [16, 32, 48, 64, 128, 256, 512, 1024]
ICO_SIZES = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def render(svg: str, size: int) -> Image.Image:
    data = resvg_py.svg_to_bytes(svg_string=svg, width=size, height=size)
    return Image.open(io.BytesIO(bytes(data))).convert("RGBA")


def glyph_svg(color: str) -> str:
    """去掉蓝色背景后的纯图形层，所有白/黄元素染成 color，用于托盘单色。"""
    svg = SRC.read_text(encoding="utf-8")
    svg = re.sub(r"<defs>.*?</defs>\s*", "", svg, flags=re.S)
    svg = re.sub(r'<rect[^>]*fill="url\(#bg\)"[^>]*/>\s*', "", svg)
    return re.sub(r"#(FFFFFF|FFD34E)", color, svg, flags=re.I)


def main() -> None:
    master_svg = SRC.read_text(encoding="utf-8")
    LOGO.mkdir(parents=True, exist_ok=True)

    master = render(master_svg, 1024)
    for size in SIZES:
        img = master.resize((size, size), Image.LANCZOS)
        out = LOGO / f"{size}x{size}.png"
        img.save(out, optimize=True)
        print("png", out.name)

    master.save(LOGO / "icon.ico", sizes=ICO_SIZES)
    print("ico")

    icns_entries = b""
    for code, size in [("ic07", 128), ("ic08", 256), ("ic09", 512), ("ic10", 1024)]:
        buf = io.BytesIO()
        master.resize((size, size), Image.LANCZOS).save(buf, format="PNG", optimize=True)
        data = buf.getvalue()
        icns_entries += code.encode("ascii") + (len(data) + 8).to_bytes(4, "big") + data
    (LOGO / "icon.icns").write_bytes(b"icns" + (8 + len(icns_entries)).to_bytes(4, "big") + icns_entries)
    print("icns")

    # 托盘单色：去掉蓝底只留图形轮廓，黑色用于浅色托盘/菜单，白色用于深色
    bw_dir = LOGO / "bw"
    bw_dir.mkdir(exist_ok=True)
    big_black = render(glyph_svg("#000000"), 256)
    big_white = render(glyph_svg("#FFFFFF"), 256)
    for name, size, src in [
        ("32x32_black.png", 32, big_black),
        ("32x32_white.png", 32, big_white),
        ("macIconTemplate.png", 16, big_black),
        ("macIconTemplate@2x.png", 32, big_black),
    ]:
        src.resize((size, size), Image.LANCZOS).save(bw_dir / name, optimize=True)
        print("bw", name)

    (ROOT / "src" / "renderer" / "assets" / "logo.svg").write_text(master_svg, encoding="utf-8")
    print("logo.svg")


if __name__ == "__main__":
    main()
