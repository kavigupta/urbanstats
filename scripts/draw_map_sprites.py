"""
Draws the map's transit icons into icons/map_style/sprites, which is committed since drawing them needs inkscape.
Run from the repo root after changing an icon:

    python -m scripts.draw_map_sprites
"""

import json
import os
import subprocess
import tempfile

from PIL import Image

SPRITES = "icons/map_style/sprites/transiticons"
ICONS = ["train", "bus", "ferry"]
ICON_PIXELS = 20


def svg_icon(path, pixel_ratio):
    with tempfile.TemporaryDirectory() as directory:
        png = os.path.join(directory, "icon.png")
        size = str(ICON_PIXELS * pixel_ratio)
        subprocess.run(
            [
                "inkscape",
                path,
                "--export-type=png",
                f"--export-filename={png}",
                "-w",
                size,
                "-h",
                size,
            ],
            check=True,
            capture_output=True,
        )
        return Image.open(png).convert("RGBA")


def write_sprite(path, names):
    """A MapLibre sprite sheet at 1x and 2x, the icons side by side."""
    for pixel_ratio, suffix in ((1, ""), (2, "@2x")):
        sheet = Image.new(
            "RGBA", (ICON_PIXELS * pixel_ratio * len(names), ICON_PIXELS * pixel_ratio)
        )
        index = {}
        for i, name in enumerate(names):
            icon = svg_icon(f"icons/map_style/map_icons/{name}.svg", pixel_ratio)
            sheet.paste(icon, (i * icon.width, 0))
            index[name] = {
                "x": i * icon.width,
                "y": 0,
                "width": icon.width,
                "height": icon.height,
                "pixelRatio": pixel_ratio,
            }
        sheet.save(f"{path}{suffix}.png")
        with open(f"{path}{suffix}.json", "w") as f:
            json.dump(index, f)


if __name__ == "__main__":
    os.makedirs(os.path.dirname(SPRITES), exist_ok=True)
    write_sprite(SPRITES, ICONS)
