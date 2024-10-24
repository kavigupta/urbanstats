from shapefiles import shapefiles
from urbanstats.statistics.collections_list import statistic_collections
from urbanstats.statistics.output_statistics_metadata import internal_statistic_names


from functools import lru_cache


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
            s.meta["type"]: s.include_in_gpw for s in shapefiles.values()
        },
    }