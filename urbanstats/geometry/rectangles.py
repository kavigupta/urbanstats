from collections import defaultdict
from dataclasses import dataclass
from typing import List

import numpy as np
import shapely
import tqdm.auto as tqdm
from permacache import permacache


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
        lat = self.y_index * step / 2 - 90
        return lon, lat

    def upper_right_corner(self):
        step = 360 / (2**self.heirarchy_level)
        lon = (self.x_index + 1) * step - 180
        lat = (self.y_index + 1) * step / 2 - 90
        return lon, lat

    def to_shapely(self):
        ll_lon, ll_lat = self.lower_left_corner()
        ur_lon, ur_lat = self.upper_right_corner()
        return shapely.geometry.box(ll_lon, ll_lat, ur_lon, ur_lat)

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

    def parent_rectangle(self) -> "Rectangle":
        if self.heirarchy_level == 0:
            raise ValueError("Root rectangle has no parent")
        return Rectangle(
            heirarchy_level=self.heirarchy_level - 1,
            x_index=self.x_index // 2,
            y_index=self.y_index // 2,
        )

    def all_ancestors(self) -> List["Rectangle"]:
        ancestors = []
        current = self
        while current.heirarchy_level > 0:
            current = current.parent_rectangle()
            ancestors.append(current)
        return ancestors

    def __hash__(self):
        return hash((self.heirarchy_level, self.x_index, self.y_index))


def rectangle_covering(
    bbox, allow_multi_x=1, allow_multi_y=1, inside_universe=Rectangle(0, 0, 0)
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

    if len(x_offsets) > 1:
        if not allow_multi_x:
            return [inside_universe]
        allow_multi_x = allow_multi_x - 1
    if len(y_offsets) > 1:
        if not allow_multi_y:
            return [inside_universe]
        allow_multi_y = allow_multi_y - 1

    rectangles = [
        inside_universe.subrectangle(xo, yo) for xo in x_offsets for yo in y_offsets
    ]
    return [
        r
        for rect in rectangles
        for r in rectangle_covering(
            bbox, allow_multi_x, allow_multi_y, inside_universe=rect
        )
    ]


@permacache(
    "urbanstats/geometry/rectangles/compute_rectangles_for_shapefile_2",
    key_function=dict(shapefile=lambda shapefile: shapefile.hash_key),
)
def compute_rectangles_for_shapefile(shapefile, *, allow_multi):
    sf = shapefile.load_file()
    return dict(
        zip(
            sf.longname,
            sf.geometry.apply(
                lambda x: rectangle_covering(
                    x.bounds, allow_multi_x=allow_multi, allow_multi_y=allow_multi
                )
            ),
        )
    )


def compute_rectangles_for_shapefiles(shapefiles, allow_multi=1):
    result = {}
    for shapefile in tqdm.tqdm(shapefiles):
        result.update(
            compute_rectangles_for_shapefile(shapefile, allow_multi=allow_multi)
        )
    return result


@permacache(
    "urbanstats/geometry/rectangles/compute_bounding_boxes_for_shapefile",
    key_function=dict(shapefile=lambda shapefile: shapefile.hash_key),
)
def compute_bounding_boxes_for_shapefile(shapefile):
    sf = shapefile.load_file()
    return dict(zip(sf.longname, sf.geometry.apply(lambda x: x.bounds)))


def compute_bounding_boxes_for_shapefiles(shapefiles):
    result = {}
    for shapefile in tqdm.tqdm(shapefiles):
        result.update(compute_bounding_boxes_for_shapefile(shapefile))
    return result


def maximum_bounding_box_cover(boxes):
    """
    Given a list of bounding boxes, find the point that is covered by the maximum number of boxes.
    """
    events = []
    for min_lon, min_lat, max_lon, max_lat in boxes:
        if (
            np.isnan(min_lon)
            or np.isnan(min_lat)
            or np.isnan(max_lon)
            or np.isnan(max_lat)
        ):
            continue
        assert min_lon < max_lon, f"Invalid box: {(min_lon, min_lat, max_lon, max_lat)}"
        events.append((min_lon, "start", min_lat, max_lat))
        events.append((max_lon, "end", min_lat, max_lat))
    events.sort()

    active_intervals = defaultdict(int)
    max_coverage = 0
    best_point = None

    for lon, event_type, min_lat, max_lat in tqdm.tqdm(events):
        if event_type == "start":
            active_intervals[(min_lat, max_lat)] += 1
        else:
            active_intervals[(min_lat, max_lat)] -= 1
            if active_intervals[(min_lat, max_lat)] == 0:
                del active_intervals[(min_lat, max_lat)]

        if active_intervals:
            lat_events = []
            for a_min_lat, a_max_lat in active_intervals:
                lat_events.append((a_min_lat, "start"))
                lat_events.append((a_max_lat, "end"))
            lat_events.sort()

            current_coverage = 0
            for lat, lat_event_type in lat_events:
                if lat_event_type == "start":
                    current_coverage += 1
                    if current_coverage > max_coverage:
                        max_coverage = current_coverage
                        best_point = (lon, lat)
                else:
                    current_coverage -= 1

    return best_point


def covers_point(box, point):
    min_lon, min_lat, max_lon, max_lat = box
    lon, lat = point
    return min_lon <= lon <= max_lon and min_lat <= lat <= max_lat
