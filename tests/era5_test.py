import unittest

import requests

from urbanstats.weather.all_stats import all_stats
from urbanstats.weather.era5_global import LATEST_COMMIT, url_for_path


class ERA5Test(unittest.TestCase):
    def test_sanity(self):
        result = requests.get(url_for_path(LATEST_COMMIT, "stats_listing.json")).json()
        self.assertEqual(all_stats, result)
