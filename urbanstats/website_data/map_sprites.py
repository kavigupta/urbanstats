import json

import numpy as np
from PIL import Image

from urbanstats.website_data.map_restyle import (
    GREEN_DARK,
    GREEN_LIGHT,
    SCRUB_DARK,
    SCRUB_LIGHT,
)

PATTERN_PIXELS = 256
PATTERN_CELLS = 64


def wrapping_noise(size, cells, rng):
    """Smooth random values over a `size` square, varying over `size / cells` and wrapping around its edges."""
    noise = Image.fromarray((rng.random((cells, cells)) * 255).astype(np.uint8))
    tiled = Image.new("L", (cells * 3, cells * 3))
    for x in range(3):
        for y in range(3):
            tiled.paste(noise, (x * cells, y * cells))
    return np.asarray(tiled.resize((size * 3, size * 3), Image.BICUBIC), dtype=float)[
        size : 2 * size, size : 2 * size
    ]


def blotches(size, cells, coverage, seed):
    """
    A `size` square boolean mask of blotches about `size / cells` across, covering `coverage` of the tile and
    wrapping around its edges. Coarser noise makes them denser in some places than others, which hides the repeat.
    """
    rng = np.random.default_rng(seed)
    smooth = wrapping_noise(size, cells, rng) + 0.6 * wrapping_noise(
        size, cells // 4, rng
    )
    return smooth > np.quantile(smooth, 1 - coverage)


def mottled(color, blotch_color, coverage, pixel_ratio):
    """A tile of `color` with blotches of `blotch_color` covering `coverage` of it, like the parks on print maps."""
    mask = blotches(PATTERN_PIXELS * pixel_ratio, PATTERN_CELLS, coverage, seed=0)
    pixels = np.where(mask[:, :, None], np.array(blotch_color), np.array(color)).astype(
        np.uint8
    )
    return Image.fromarray(pixels)


def hex_rgb(color):
    return tuple(int(color[i : i + 2], 16) for i in (1, 3, 5))


def write_sprite(path, images):
    """A MapLibre sprite sheet at 1x and 2x, the images side by side."""
    for pixel_ratio, suffix in ((1, ""), (2, "@2x")):
        tiles = {name: make(pixel_ratio) for name, make in images.items()}
        sheet = Image.new(
            "RGBA",
            (
                sum(t.width for t in tiles.values()),
                max(t.height for t in tiles.values()),
            ),
        )
        index, x = {}, 0
        for name, tile in tiles.items():
            sheet.paste(tile, (x, 0))
            index[name] = {
                "x": x,
                "y": 0,
                "width": tile.width,
                "height": tile.height,
                "pixelRatio": pixel_ratio,
            }
            x += tile.width
        sheet.save(f"{path}{suffix}.png")
        with open(f"{path}{suffix}.json", "w") as f:
            json.dump(index, f)


def build_sprites(path):
    write_sprite(
        path,
        {
            name: lambda ratio, coverage=coverage: mottled(
                hex_rgb(GREEN_LIGHT), hex_rgb(GREEN_DARK), coverage, ratio
            )
            for name, coverage in (("grass", 0.35), ("park", 0.55), ("wood", 0.75))
        }
        | {
            "scrub": lambda ratio: mottled(
                hex_rgb(SCRUB_LIGHT), hex_rgb(SCRUB_DARK), 0.45, ratio
            )
        },
    )
