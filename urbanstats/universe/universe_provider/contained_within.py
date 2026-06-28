from dataclasses import dataclass
from typing import List

from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.geometry.shapefile_geometry import compute_contained_in_direct
from urbanstats.universe.universe_list import universe_by_universe_type
from urbanstats.universe.universe_provider.universe_provider import UniverseProvider


@dataclass
class ContainedWithinUniverseProvider(UniverseProvider):
    contained_within: List[str]
    longname_filter: List[str] = None

    def hash_key_details(self):
        return tuple(self.contained_within), self.longname_filter, "version 2"

    def relevant_shapefiles(self):
        return self.contained_within

    def universes_for_shapefile(self, shapefiles, shapefile, shapefile_table):
        longname_filter = (
            set(self.longname_filter) if self.longname_filter is not None else set()
        )
        result_all = {longname: [] for longname in shapefile_table.longname}
        for c in self.contained_within:
            if shapefiles[c].hash_key == shapefile.hash_key:
                continue
            result_for_c = compute_contained_in(shapefile, shapefiles[c])
            for longname, universes in result_for_c.items():
                universes = [u for u in universes if u not in longname_filter]
                result_all[longname].extend(universes)
        return result_all


STATE_PROVIDER = ContainedWithinUniverseProvider(
    ["subnational_regions"], universe_by_universe_type()["state"]
)

PROVINCE_PROVIDER = ContainedWithinUniverseProvider(
    ["subnational_regions"], universe_by_universe_type()["province"]
)


@permacache_with_remapping_pickle(
    "urbanstats/universe/universe_provider/contained_within/compute_contained_in",
    key_function=dict(
        shapefile=lambda a: a.hash_key,
        universe_shapefile=lambda a: a.hash_key,
    ),
)
def compute_contained_in(shapefile, universe_shapefile):
    """
    Compute the universes for a shapefile based on the universe shapefile. Specifically, a shape S is contained in
    a universe U if the area of the intersection of S and U is at least 5% of the area of S.
    """
    print("contained_in", shapefile.hash_key, universe_shapefile.hash_key)
    universe_df = universe_shapefile.load_file()
    return compute_contained_in_direct(
        shapefile.load_file(),
        universe_df,
        universe_shapefile.chunk_size,
        shapefile.chunk_size,
    )
