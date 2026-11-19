from permacache import permacache

from .all_counties import get_all_counties
from .compute_suos import current_suos


@permacache(
    "urbanstats/geometry/historical_counties/historical_county_file/historical_counties_5"
)
def historical_counties():
    data = get_all_counties()
    data = data[[x for x in data if x != "geometry"]].copy()
    suos_per_datum, _, _, _ = current_suos()
    data["suos"] = suos_per_datum
    return data


def counties_at_date(date):
    data = historical_counties()
    return data[(data["START_DATE"] <= date) & (data["END_DATE"] >= date)].copy()
