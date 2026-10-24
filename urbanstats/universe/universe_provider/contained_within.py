from dataclasses import dataclass, field
from typing import List

import geopandas as gpd
import numpy as np

from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.geometry.shapefiles.longnames import shapefile_longnames
from urbanstats.universe.universe_list import universe_by_universe_type
from urbanstats.universe.universe_provider.universe_provider import UniverseProvider


@dataclass
class ContainedWithinUniverseProvider(UniverseProvider):
    contained_within: List[str]
    longname_filter: List[str] = None
    remove_universes: List[str] = None
    allow_self_universe: bool = field(kw_only=True)
    version: int = 4

    def relevant_shapefiles(self):
        return self.contained_within

    def universes_for_shapefile(self, names_by_key, names, table):
        remove_universes = (
            set(self.remove_universes) if self.remove_universes is not None else set()
        )
        result_all = {longname: [] for longname in table.longname}
        for c in self.contained_within:
            if (
                names_by_key[c].geometry == names.geometry
                and not self.allow_self_universe
            ):
                continue
            universe_names = shapefile_longnames(names_by_key[c])
            allowed = set(universe_names)
            if self.longname_filter is not None:
                missing = set(self.longname_filter) - allowed
                if missing:
                    raise ValueError(
                        f"Missing longnames in universe shapefile: {missing}"
                    )
                allowed = set(self.longname_filter)
            contained_in = compute_contained_in(
                names.geometry, names_by_key[c].geometry
            )
            for longname, positions in zip(table.longname, contained_in):
                universes = [universe_names[u] for u in positions]
                universes = [
                    u for u in universes if u in allowed and u not in remove_universes
                ]
                result_all[longname].extend(universes)
        return result_all


STATE_PROVIDER = ContainedWithinUniverseProvider(
    ["subnational_regions"],
    universe_by_universe_type()["state"],
    allow_self_universe=True,
)

PROVINCE_PROVIDER = ContainedWithinUniverseProvider(
    ["subnational_regions"],
    universe_by_universe_type()["province"],
    allow_self_universe=True,
)

AUSTRALIAN_STATE_PROVIDER = ContainedWithinUniverseProvider(
    ["subnational_regions"],
    universe_by_universe_type()["australian_state"],
    allow_self_universe=True,
)


@permacache_with_remapping_pickle(
    "urbanstats/universe/universe_provider/contained_within/compute_contained_in_2"
)
def compute_contained_in(geometry, universe_geometry):
    """
    For each region, in row order, the row positions of the universe regions covering at least 5%
    of its area.
    """
    print("contained_in", geometry.key, universe_geometry.key)
    universe_df = universe_geometry.load_rows().reset_index(drop=True)[["geometry"]]
    universe_df["universe_idx"] = np.arange(universe_df.shape[0])
    a_df = geometry.load_rows().reset_index(drop=True)[["geometry"]]
    a_df["idx"] = np.arange(a_df.shape[0])
    over = gpd.overlay(universe_df, a_df, how="intersection", keep_geom_type=True)
    area = over.geometry.to_crs("EPSG:2163").area
    area_elem = a_df.geometry.to_crs("EPSG:2163").area
    pct = area / np.array(area_elem[over.idx])
    over = over[pct > 0.05]
    result = [[] for _ in range(a_df.shape[0])]
    for universe, region in zip(over.universe_idx, over.idx):
        result[region].append(int(universe))
    return result
