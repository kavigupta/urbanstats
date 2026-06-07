import tqdm.auto as tqdm
from permacache import permacache

from urbanstats.geometry.rasterize import rasterize_using_lines
from urbanstats.geometry.rle import (
    RESOLUTION_3ARCSEC,
    merge_rle_runs,
    rle_dict_from_arrays,
)
from urbanstats.special_cases.country import subnational_regions_raw


@permacache("urbanstats/special_cases/country/coastlines_rle_3")
def coastlines_rle():
    """
    Build a single run-length encoding of "land" at 3 arcsecond resolution
    (same as GHS), by rasterizing each raw subnational shape and merging
    all runs into one RLE. Returns dict {row: [(lon_start, lon_end), ...]}.
    """
    data = subnational_regions_raw()
    print("read subnational regions (raw) for land RLE")
    resolution = RESOLUTION_3ARCSEC
    list_of_rles = []
    for geom in tqdm.tqdm(data.geometry, desc="rasterize to RLE"):
        rows, lon_starts, lon_ends = rasterize_using_lines(geom, resolution=resolution)
        if len(rows) > 0:
            list_of_rles.append(rle_dict_from_arrays(rows, lon_starts, lon_ends))
    print("merge RLE runs")
    return merge_rle_runs(list_of_rles)
