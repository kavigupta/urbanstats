from dataclasses import dataclass
from typing import List


@dataclass
class Rectangle:
    """
    Represents a division of the coordinate space into rectangular sections.

    :field heirarchy_level: An integer indicating the level of 2x zoom. 0 indicates the entire world, 1 indicates a 180x90 rectangle, and so on.
    :field x_index: The horizontal index of the rectangle at the given heirarchy level.
    :field y_index: The vertical index of the rectangle at the given heirarchy level.
    """

    heirarchy_level: int
    x_index: int
    y_index: int

    def __post_init__(self):
        max_index = 2**self.heirarchy_level
        if not (0 <= self.x_index < max_index):
            raise ValueError(
                f"x_index {self.x_index} out of bounds for heirarchy_level {self.heirarchy_level}"
            )
        if not (0 <= self.y_index < max_index):
            raise ValueError(
                f"y_index {self.y_index} out of bounds for heirarchy_level {self.heirarchy_level}"
            )

    def lower_left_corner(self):
        step = 360 / (2**self.heirarchy_level)
        lon = self.x_index * step - 180
        lat = self.y_index * step - 90
        return lon, lat

    def upper_right_corner(self):
        step = 360 / (2**self.heirarchy_level)
        lon = (self.x_index + 1) * step - 180
        lat = (self.y_index + 1) * step - 90
        return lon, lat

    def center(self):
        ll_lon, ll_lat = self.lower_left_corner()
        ur_lon, ur_lat = self.upper_right_corner()
        return (ll_lon + ur_lon) / 2, (ll_lat + ur_lat) / 2

    def subrectangle(self, x_offset: int, y_offset: int) -> "Rectangle":
        return Rectangle(
            heirarchy_level=self.heirarchy_level + 1,
            x_index=self.x_index * 2 + x_offset,
            y_index=self.y_index * 2 + y_offset,
        )


def rectangle_covering(
    bbox, allow_multi_x=True, allow_multi_y=True, inside_universe=Rectangle(0, 0, 0)
) -> List[Rectangle]:
    """
    Computes a list of Rectangles that covers the given bounding box.

    :param bbox: A bounding box defined by (min_lon, min_lat, max_lon, max_lat).
    :param allow_multi_x: If True, the bbox can be split into two by x
    :param allow_multi_y: If True, the bbox can be split into two by y
    :param inside_universe: A Rectangle that defines the universe within which the bbox must fit.
    :return: A list of Rectangles that cover the bounding box.
    """
    min_lon, min_lat, max_lon, max_lat = bbox
    cbox_lon, cbox_lat = inside_universe.center()

    x_offsets = []
    if max_lon > cbox_lon:
        x_offsets.append(1)
    if min_lon < cbox_lon:
        x_offsets.append(0)

    y_offsets = []
    if max_lat > cbox_lat:
        y_offsets.append(1)
    if min_lat < cbox_lat:
        y_offsets.append(0)

    if (len(x_offsets) > 1) and not allow_multi_x:
        return [inside_universe]
    if (len(y_offsets) > 1) and not allow_multi_y:
        return [inside_universe]

    rectangles = [
        inside_universe.subrectangle(xo, yo) for xo in x_offsets for yo in y_offsets
    ]
    if len(rectangles) == 1:
        return rectangle_covering(
            bbox,
            allow_multi_x=allow_multi_x,
            allow_multi_y=allow_multi_y,
            inside_universe=rectangles[0],
        )
    return rectangles
