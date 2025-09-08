from dataclasses import dataclass
from typing import List, Tuple

import geopandas as gpd
import numpy as np
from permacache import permacache

from .compute_suos import current_suos


def join_with_suos(shapes):
    _, coords, _, _ = current_suos()
    suo_shapefile = gpd.GeoDataFrame(
        dict(
            geometry=gpd.points_from_xy(coords[:, 1], coords[:, 0]),
        ),
        crs="epsg:4326",
    )
    joined = gpd.sjoin(shapes, suo_shapefile)
    # return joined, None
    joined = joined[["index_right"]].groupby(joined.index).agg(set)
    joined = joined.rename(columns={"index_right": "suos"})
    return joined


@permacache(
    "urbanstats/geometry/historical_counties/aggregation/aggregate_to_suos_4",
    key_function=dict(
        shapefile=lambda x: x.hash_key, suo_data_source=lambda x: x.hash_key
    ),
)
def aggregate_to_suos(shapefile, suo_data_source):
    data = suo_data_source.load_fn().reset_index(drop=True)
    suos = list(data.suos)
    suo_to_index = {s: i for i, suo in enumerate(suos) for s in suo}
    data = np.array(data[suo_data_source.data_columns])
    geo = shapefile.load_file()
    joined = join_with_suos(geo)
    contents = [
        compute_county_contents(region_suos, suos, suo_to_index)
        for region_suos in joined.suos
    ]
    _, _, suo_to_pop, _ = current_suos()
    difference_over_intersection = np.array(
        [x.difference_over_intersection(suo_to_pop) for x in contents]
    )
    aggregated = np.array([x.aggregate(data) for x in contents])
    aggregated_full = np.nan + np.zeros((len(geo), data.shape[1]))
    aggregated_full[joined.index] = aggregated
    doi_full = np.ones(len(geo))
    doi_full[joined.index] = difference_over_intersection
    return aggregated_full, doi_full


@dataclass
class CountiesInRegion:
    county_indices: List[int]
    suos_overlapping: List[int]
    suos_in_counties_but_not_region: List[int]
    suos_in_region_but_not_counties: List[int]

    def difference_over_intersection(self, suo_to_pop) -> float:
        overlapping = suo_to_pop[self.suos_overlapping].sum()
        in_counties = suo_to_pop[self.suos_in_counties_but_not_region].sum()
        in_region = suo_to_pop[self.suos_in_region_but_not_counties].sum()
        return (in_counties + in_region) / (overlapping + 1e-9)

    def aggregate(self, data):
        return data[self.county_indices].sum(0)


def compute_county_contents(
    suos_in_region, county_idx_to_suo, suo_to_county_idx
) -> CountiesInRegion:
    _, _, suo_to_pop, _ = current_suos()
    overlapping = set()
    in_region_but_not_counties = set()
    in_counties_but_not_region = set()
    content_counties = []
    for s in suos_in_region:
        if s not in suo_to_county_idx:
            in_region_but_not_counties.add(s)
            continue
        if s in in_counties_but_not_region or s in overlapping:
            continue
        county_idx = suo_to_county_idx[s]
        county_suos = county_idx_to_suo[county_idx]
        this_county_overlapping = [x for x in county_suos if x in suos_in_region]
        this_county_not_in_region = [x for x in county_suos if x not in suos_in_region]
        if (
            suo_to_pop[this_county_overlapping].sum()
            > suo_to_pop[this_county_not_in_region].sum()
        ):
            content_counties.append(county_idx)
            overlapping |= set(this_county_overlapping)
            in_counties_but_not_region |= set(this_county_not_in_region)
        else:
            in_region_but_not_counties |= set(this_county_overlapping)
    return CountiesInRegion(
        county_indices=content_counties,
        suos_overlapping=sorted(overlapping),
        suos_in_counties_but_not_region=sorted(in_counties_but_not_region),
        suos_in_region_but_not_counties=sorted(in_region_but_not_counties),
    )
