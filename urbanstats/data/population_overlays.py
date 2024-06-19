from collections import defaultdict
from types import SimpleNamespace
import uuid

import numpy as np
import geopandas as gpd
from permacache import permacache, stable_hash

from urbanstats.data.gpw import compute_gpw_data_for_shapefile


@permacache(
    "urbanstats/data/population_overlays/compute_population_overlay",
    key_function=dict(
        shapefile=lambda x: x.hash_key,
        frame=lambda frame: stable_hash(frame.geometry.to_json()),
    ),
)
def compute_population_overlay(shapefile, frame):
    frame = frame[["geometry"]].copy().reset_index(drop=True)
    frame["original_iloc"] = np.arange(len(frame))

    countries = shapefile.load_file()[["longname", "geometry"]]
    overlays = gpd.overlay(frame, countries)
    overlays["population"] = compute_gpw_data_for_shapefile.function(
        SimpleNamespace(
            load_file=lambda: overlays, hash_key="overlays " + uuid.uuid4().hex
        ),
        collect_density=False,
        log=False,
    )["gpw_population"]
    return overlays


def relevant_regions(shapefile, frame, max_elements, min_pct):
    """
    Get a map from the original iloc to a list of longnames of regions that
       whose population adds to at least min_pct of the total population,
       sorted from largest overlap to smallest overlap, limited to max_elements
       if necessary.
    """
    overlays = compute_population_overlay(shapefile, frame).copy()
    population_by_iloc = (
        overlays[["original_iloc", "population"]].groupby("original_iloc").sum()
    )
    overlays["pop_pct"] = overlays.population / np.array(
        population_by_iloc.loc[overlays.original_iloc].population
    )
    # return overlays
    original_to_new_iloc = defaultdict(list)
    for i, row in overlays.iterrows():
        original_to_new_iloc[row.original_iloc].append(i)
    result = {}
    for original_iloc, rows in original_to_new_iloc.items():
        rows = overlays.loc[original_to_new_iloc[original_iloc], ["longname", "pop_pct"]].copy()
        rows = rows.sort_values("pop_pct", ascending=False)
        total = 0
        result[original_iloc] = []
        for i, row in rows.iterrows():
            result[original_iloc].append(row.longname)
            total += row.pop_pct
            if total >= min_pct:
                break
            if len(result[original_iloc]) >= max_elements:
                break
    return result