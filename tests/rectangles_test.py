import unittest

import numpy as np
import shapely
from parameterized import parameterized

from urbanstats.geometry.rectangles import Rectangle, rectangle_covering


class TestRectangleBounds(unittest.TestCase):
    def test_global_rectangle_bounds(self):
        self.assertEqual(Rectangle(0, 0, 0).to_shapely().bounds, (-180, -90, 180, 90))

    def test_first_level_rectangle_bounds(self):
        self.assertEqual(Rectangle(1, 0, 0).to_shapely().bounds, (-180, -90, 0, 0))
        self.assertEqual(Rectangle(1, 1, 0).to_shapely().bounds, (0, -90, 180, 0))
        self.assertEqual(Rectangle(1, 0, 1).to_shapely().bounds, (-180, 0, 0, 90))
        self.assertEqual(Rectangle(1, 1, 1).to_shapely().bounds, (0, 0, 180, 90))

    def test_lack_of_overlap(self):
        depth = 4
        rectangles = []
        for x in range(2**depth):
            for y in range(2**depth):
                rectangles.append(Rectangle(depth, x, y).to_shapely())
        # check area each
        for rect in rectangles:
            self.assertAlmostEqual(rect.area, 180 * 360 / (4**depth))
        # check pairwise intersections are empty
        for i in range(len(rectangles)):
            for j in range(i + 1, len(rectangles)):
                self.assertEqual(rectangles[i].intersection(rectangles[j]).area, 0)
        # check it covers the whole globe more or less
        self.assertEqual(
            shapely.unary_union(rectangles)
            .difference(Rectangle(0, 0, 0).to_shapely())
            .area,
            0,
        )

    def sample_bbox(self, rng: np.random.Generator):
        width = 360 * np.exp(-rng.random() * 5)
        height = 180 * np.exp(-rng.random() * 5)
        lon1 = rng.uniform(-180, 180 - width)
        lat1 = rng.uniform(-90, 90 - height)
        return (lon1, lat1, lon1 + width, lat1 + height)

    def evaluate_covering(self, bbox):
        print(bbox)
        rect = shapely.geometry.box(*bbox)
        cover = rectangle_covering(bbox)
        self.assertLessEqual(len(cover), 4)
        print(cover)
        union = shapely.unary_union([r.to_shapely() for r in cover])
        self.assertTrue(union.covers(rect))
        rects_at_one_level_more = [
            r.subrectangle(i, j) for r in cover for i in range(2) for j in range(2)
        ]
        overlap_one_more = [
            r for r in rects_at_one_level_more if r.to_shapely().intersects(rect)
        ]
        print(overlap_one_more)
        self.assertGreaterEqual(len(overlap_one_more), 4)
        # non-intersecting
        for i in range(len(cover)):
            for j in range(i + 1, len(cover)):
                self.assertEqual(
                    cover[i].to_shapely().intersection(cover[j].to_shapely()).area, 0
                )
        return cover

    def test_covering_simple(self):
        self.evaluate_covering(((-10, 70, 20, 85)))

    def test_small_box_around_origin(self):
        self.assertEqual(
            self.evaluate_covering(((-1, -1, 1, 1))),
            [
                Rectangle(heirarchy_level=7, x_index=64, y_index=64),
                Rectangle(heirarchy_level=7, x_index=64, y_index=63),
                Rectangle(heirarchy_level=7, x_index=63, y_index=64),
                Rectangle(heirarchy_level=7, x_index=63, y_index=63),
            ],
        )

    @parameterized.expand([(seed,) for seed in range(1000)])
    def test_covering_bbox(self, seed):
        rng = np.random.default_rng(seed)
        bbox = self.sample_bbox(rng)
        self.evaluate_covering(bbox)
