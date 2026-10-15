import geopandas as gpd
import numpy as np


def overlay(x, y, keep_geom_type=False):
    for_chunk = gpd.overlay(x, y, how="intersection", keep_geom_type=keep_geom_type)
    for_chunk["area"] = for_chunk.geometry.to_crs("EPSG:2163").area
    del for_chunk["geometry"]
    return for_chunk


def compute_contained_in_direct(a_df, b_df):
    a_df = a_df.copy()
    a_df["idx"] = np.arange(a_df.shape[0])
    over = overlay(b_df, a_df, keep_geom_type=True)
    area = over.area
    area_elem = a_df.set_index("idx").geometry.to_crs("EPSG:2163").area
    pct = area / np.array(area_elem[over.idx])
    over = over[pct > 0.05]
    result = {k: [] for k in a_df.longname}
    for st, reg in zip(over.longname_1, over.longname_2):
        result[reg].append(st)
    return result
