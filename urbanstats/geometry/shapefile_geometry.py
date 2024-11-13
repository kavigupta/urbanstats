import geopandas as gpd
import numpy as np
import pandas as pd
import tqdm


def overlay(x, y, keep_geom_type=False):
    for_chunk = gpd.overlay(x, y, how="intersection", keep_geom_type=keep_geom_type)
    for_chunk["area"] = for_chunk.geometry.to_crs("EPSG:2163").area
    del for_chunk["geometry"]
    return for_chunk


def overlays(a, b, a_size, b_size, **kwargs):
    """
    Get the overlays between the two shapefiles a and b
    """
    if a_size is None and b_size is None:
        return overlay(a, b, **kwargs)

    total_frac = 1
    if a_size is not None:
        total_frac *= a_size / a.shape[0]
    if b_size is not None:
        total_frac *= b_size / b.shape[0]
    size = max(5, int(total_frac * a.shape[0]))
    results = []
    for i in tqdm.trange(0, a.shape[0], size):
        x, y = a.iloc[i : i + size], b
        for_chunk = overlay(x, y, **kwargs)
        results.append(for_chunk)
    return pd.concat(results).reset_index(drop=True)


def compute_contained_in_direct(a_df, b_df, a_chunk_size, b_chunk_size):
    a_df = a_df.copy()
    a_df["idx"] = np.arange(a_df.shape[0])
    over = overlays(
        b_df,
        a_df,
        a_chunk_size,
        b_chunk_size,
        keep_geom_type=True,
    )
    area = over.area
    area_elem = a_df.set_index("idx").geometry.to_crs("EPSG:2163").area
    pct = area / np.array(area_elem[over.idx])
    over = over[pct > 0.05]
    result = {k: [] for k in a_df.longname}
    for st, reg in zip(over.longname_1, over.longname_2):
        result[reg].append(st)
    return result
