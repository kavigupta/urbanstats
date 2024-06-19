import attr
import numpy as np
from permacache import permacache, stable_hash

from .era5 import all_results
from .utils import get_season


@attr.s
class ERA5WeatherStatistic:
    _internal_name = attr.ib()
    display_name = attr.ib()
    compute = attr.ib()
    version = attr.ib(default=4)

    @property
    def internal_name(self):
        return self._internal_name + f"_{self.version}"

    def __permacache_hash__(self):
        return stable_hash((self.internal_name, self.version))


def for_season_mask(dates, season):
    return np.array([get_season(d) == season for d in dates])


@permacache(
    "urbanstats/weather/weather_statistics/compute_statistics_3",
    key_function=dict(stats_dict=stable_hash),
)
def compute_statistics(stats_dict, earliest_year):
    dates, res = all_results(earliest_year=earliest_year)
    return {
        region: {k: v.compute(dates, res[region]) for k, v in stats_dict.items()}
        for region in res
    }
