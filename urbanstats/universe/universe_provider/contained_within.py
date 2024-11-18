from dataclasses import dataclass
from typing import List

from permacache import drop_if_equal, permacache

from urbanstats.geometry.shapefile_geometry import compute_contained_in_direct
from urbanstats.universe.universe_list import universe_by_universe_type
from urbanstats.universe.universe_provider.universe_provider import UniverseProvider


@dataclass
class ContainedWithinUniverseProvider(UniverseProvider):
    contained_within: List[str]
    longname_filter: List[str] = None

    def hash_key_details(self):
        return tuple(self.contained_within), self.longname_filter

    def relevant_shapefiles(self):
        return self.contained_within

    def universes_for_shapefile(self, shapefiles, shapefile, shapefile_table):
        result_all = {longname: [] for longname in shapefile_table.longname}
        for c in self.contained_within:
            result_for_c = compute_contained_in(
                shapefile, shapefiles[c], self.longname_filter
            )
            for longname, universes in result_for_c.items():
                result_all[longname].extend(universes)
        return result_all


STATE_PROVIDER = ContainedWithinUniverseProvider(
    ["subnational_regions"], universe_by_universe_type()["state"]
)


@permacache(
    "urbanstats/universe/universe_provider/contained_within/compute_contained_in",
    key_function=dict(
        shapefile=lambda a: a.hash_key,
        universe_shapefile=lambda a: a.hash_key,
        longname_filter=drop_if_equal(None),
    ),
)
def compute_contained_in(shapefile, universe_shapefile, longname_filter=None):
    """
    Compute the universes for a shapefile based on the universe shapefile. Specifically, a shape S is contained in
    a universe U if the area of the intersection of S and U is at least 5% of the area of S.
    """
    print("contained_in", shapefile.hash_key, universe_shapefile.hash_key)
    universe_df = universe_shapefile.load_file()
    if longname_filter is not None:
        universe_df_longnames = set(universe_df.longname)
        missing = set(longname_filter) - universe_df_longnames
        if missing:
            raise ValueError(f"Missing longnames in universe shapefile: {missing}")
        universe_df = universe_df[universe_df.longname.isin(longname_filter)]
    return compute_contained_in_direct(
        shapefile.load_file(),
        universe_df,
        universe_shapefile.chunk_size,
        shapefile.chunk_size,
    )
