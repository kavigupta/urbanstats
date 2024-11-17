from functools import lru_cache

import numpy as np

from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles
from urbanstats.statistics.collections_list import statistic_collections
from urbanstats.statistics.output_statistics_metadata import internal_statistic_names


@lru_cache(maxsize=None)
def get_index_lists():
    real_names = internal_statistic_names()

    def filter_names(filt):
        names = [
            x
            for collection in statistic_collections
            if filt(collection)
            for x in collection.name_for_each_statistic()
        ]
        return sorted([real_names.index(x) for x in names])

    universal_idxs = filter_names(lambda c: c.for_america() and c.for_international())
    usa_idxs = filter_names(lambda c: c.for_america() and not c.for_international())
    gpw_idxs = filter_names(lambda c: c.for_international() and not c.for_america())
    return {
        "index_lists": {
            "universal": universal_idxs,
            "gpw": gpw_idxs,
            "usa": usa_idxs,
        },
        "type_to_has_gpw": {
            s.meta["type"]: ("international_gridded_data" in s.special_data_sources)
            for s in shapefiles.values()
        },
    }


# FIXME better framework for indices for more than just international/USA
def index_list_for_longname(longname, typ, strict_display=False):
    lists = get_index_lists()["index_lists"]
    result = []
    result += lists["universal"]
    is_american = longname.endswith(", USA") or longname == "USA"
    if get_index_lists()["type_to_has_gpw"][typ]:
        if not strict_display or not is_american:
            result += lists["gpw"]
    # else:
    if is_american:
        result += lists["usa"]
    return sorted(result)


def index_bitvector_for_longname(longname, typ, strict_display=False):
    idxs = index_list_for_longname(longname, typ, strict_display)
    bool_array = np.zeros(max(idxs) + 1, dtype=np.bool_)
    bool_array[idxs] = True
    return np.packbits(bool_array, bitorder="little").tolist()
