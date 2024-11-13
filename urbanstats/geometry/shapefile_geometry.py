import geopandas as gpd
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
