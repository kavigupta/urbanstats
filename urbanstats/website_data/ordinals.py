from urbanstats.ordinals.ordinal_info import fully_complete_ordinals
from urbanstats.website_data.table import shapefile_without_ordinals


import numpy as np


from functools import lru_cache


@lru_cache(maxsize=None)
def all_ordinals():
    full = shapefile_without_ordinals()

    full["index_order"] = np.arange(len(full))
    sorted_by_name = full.sort_values("longname")[::-1].reset_index(drop=True)
    universe_typ = {
        (u, t)
        for us, t in zip(sorted_by_name.universes, sorted_by_name.type)
        for u in us
    }
    universe_typ |= {(u, "overall") for u, _ in universe_typ}
    universe_typ = sorted(universe_typ)
    ordinal_info = fully_complete_ordinals(sorted_by_name, universe_typ)
    return ordinal_info