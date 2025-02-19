import numpy as np
from PIL import Image, ImageDraw, ImageFont

from urbanstats.geometry.relationship import type_to_type_category

hue_colors = {
    "blue": "#5a7dc3",
    "orange": "#f7aa41",
    "darkOrange": "#af6707",
    "purple": "#975ac3",
    "red": "#f96d6d",
    "grey": "#8e8e8e",
    "darkGrey": "#4e525a",
    "pink": "#c767b0",
    "yellow": "#b8a32f",
    "green": "#8ac35a",
    "cyan": "#07a5af",
}

related_button_colors = {
    "International": "red",
    "US Subdivision": "blue",
    "Census": "cyan",
    "Political": "purple",
    "Oddball": "darkGrey",
    "Kavi": "darkOrange",
    "School": "yellow",
    "Small": "pink",
    "Native": "green",
}


def compute_text_size(text, font):
    """
    Compute the size of the text when rendered in the given font.
    """
    width, height = font.getsize(text)
    width *= 10
    height *= 10

    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)
    draw.text((0, 0), text, font=font, fill="black")
    img = np.array(img)
    img = img.mean(axis=2)
    img = img < 200
    # return img
    row, col = np.where(img)
    min_row, max_row = row.min(), row.max()
    min_col, max_col = col.min(), col.max()
    return max_col + min_col, max_row + min_row


def search_flag(abbrev, color):
    """
    Make a "search flag", which is a square with a series of letters in it.

    Use the resolution 200x100 for the flag.
    """
    img_width = 200
    img_height = 100
    ttf_path = "icons/fonts/Jost/static/Jost-SemiBold.ttf"
    font = ImageFont.truetype(ttf_path, 60)
    # Create a blank image
    flag = Image.new("RGB", (img_width, img_height), color)
    draw = ImageDraw.Draw(flag)
    # Draw the letters centered in the image
    text_width, text_height = compute_text_size(abbrev, font)
    _, text_height = compute_text_size(abbrev.replace("J", "I"), font)
    x = (img_width - text_width) / 2
    y = (img_height - text_height) / 2
    assert x >= 0 and y >= 0, f"Text too big: {text_width}, {text_height}"
    draw.text((x, y), abbrev, font=font, fill="white")
    return flag


def compute_search_flag(shapefile):
    """
    Compute the search flag for a given shapefile.
    """
    abbrev = shapefile.abbreviation
    color = hue_colors[
        related_button_colors[type_to_type_category[shapefile.meta["type"]]]
    ]
    return search_flag(abbrev, color)
