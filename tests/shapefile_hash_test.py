import unittest

from permacache import stable_hash

from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles


class TestShapefileHash(unittest.TestCase):
    def test_every_shapefile_can_be_stable_hashed(self):
        for name, shapefile in shapefiles.items():
            with self.subTest(name):
                stable_hash(shapefile)
