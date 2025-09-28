import io
from dataclasses import dataclass
from functools import lru_cache

import numpy as np
import requests

from urbanstats.data.aggregate_gridded_data import GriddedDataSource

from .all_stats import all_stats

LATEST_COMMIT = "24f3767f70d27412f9dd776789eefe6d1cdefc56"


def url_for_path(commit_hash, path):
    return f"https://raw.githubusercontent.com/kavigupta/weather-agg-ee/{commit_hash}/{path}"


@dataclass(frozen=True)
class GlobalWeatherData(GriddedDataSource):
    column_name: str
    commit_hash: str

    # pylint: disable=method-cache-max-size-none
    @lru_cache(maxsize=None)
    def load_gridded_data(self, resolution: int | str = "most_detailed"):
        array = self.download_array()
        # ignoring resolution, just assuming it'll be bilinearly interpolated later.
        return array

    def download_array(self):
        url = url_for_path(self.commit_hash, f"output/{self.column_name}.npz")
        with requests.get(url) as response:
            response.raise_for_status()
            with np.load(io.BytesIO(response.content)) as data:
                return data["arr"]


weather_stats = {k: GlobalWeatherData(k, LATEST_COMMIT) for k in all_stats}
