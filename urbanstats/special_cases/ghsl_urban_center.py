from collections import Counter
from dataclasses import dataclass
from typing import Any, Tuple

import geopandas as gpd
import numpy as np
from permacache import permacache

from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.geometry.shapefiles.row_functions import TableFunction
from urbanstats.special_cases.country_names import iso_to_country


def classify_areas_by_subnational_region(snr, areas):
    joined = gpd.overlay(snr, areas[["index_", "geometry"]], keep_geom_type=False)
    pcts = joined.to_crs(dict(proj="cea")).area / np.array(
        areas.to_crs(dict(proj="cea")).area[joined.index_]
    )
    pcts_denom = pcts.groupby(joined.index_).sum()[joined.index_]
    pcts = pcts / np.array(pcts_denom)
    joined["pcts"] = pcts
    joined = joined[pcts > 0.05]
    subnationals = joined[["ISO_CC", "ISO_CODE", "index_"]].groupby("index_").agg(set)
    return subnationals


@permacache_with_remapping_pickle(
    "urbanstats/special_cases/ghsl_urban_center/load_ghsl_urban_centers"
)
def load_ghsl_urban_centers():
    areas = gpd.read_file(
        "named_region_shapefiles/GHS_STAT_UCDB2015MT_GLOBE_R2019A_V1_2.gpkg"
    )
    areas = areas[areas.QA2_1V == 1]
    return areas[areas.UC_NM_MN != "N/A"].copy()


@dataclass(frozen=True)
class SubnationalSuffixes:
    """
    Names regions after the subnational regions holding over 5% of their area: the suffix is
    their countries, and regions with the same name and suffix are told apart by their
    subnational regions (and directions, if those match too).
    """

    # Geometry of the regions named, among which names must be unique; per-country subsets of them
    # take their names from here
    regions: Any
    subnationals: Any  # Geometry
    name_column: str
    more_general_direction: bool
    # (name, ISO code) of regions whose subnational region the overlap gets wrong
    overrides: Tuple[Tuple[str, str], ...] = ()


@permacache("urbanstats/special_cases/ghsl_urban_center/compute_subnational_suffixes")
def compute_subnational_suffixes(suffixes):
    """For each region: subnationals_ISO_CC, subnationals_ISO_CODE, suffix and mid."""
    areas = suffixes.regions.load_rows().copy()
    areas["index_"] = areas.index
    snr = suffixes.subnationals.load_rows()
    subnational_classes = classify_areas_by_subnational_region(snr, areas)
    for name, iso_code in suffixes.overrides:
        [idx] = areas.index[areas[suffixes.name_column] == name]
        subnational_classes.loc[idx] = [{iso_code[:2]}, {iso_code}]
    attach_subnational_suffxes(
        areas,
        snr,
        subnational_classes,
        name_column=suffixes.name_column,
        more_general_direction=suffixes.more_general_direction,
    )
    return areas[["subnationals_ISO_CC", "subnationals_ISO_CODE", "suffix", "mid"]]


@dataclass(frozen=True)
class SubnationalSuffixedName(TableFunction):
    """part is "cleanname" (the name and any disambiguator), "shortname" or "longname"."""

    suffixes: SubnationalSuffixes
    type_name: str
    part: str

    def __call__(self, rows):
        computed = compute_subnational_suffixes(self.suffixes).loc[rows.index]
        cleanname = rows[self.suffixes.name_column] + computed.mid.apply(
            lambda x: " (" + x + ")" if x else ""
        )
        shortname = cleanname + " " + self.type_name
        return {
            "cleanname": cleanname,
            "shortname": shortname,
            "longname": shortname + ", " + computed.suffix,
        }[self.part]


def attach_subnational_suffxes(
    areas,
    snr,
    subnational_classes,
    *,
    name_column="UC_NM_MN",
    more_general_direction=False
):
    backmap = subnational_classes.loc[areas.index_].applymap(sorted)
    for col in subnational_classes.columns:
        areas["subnationals_" + col] = list(backmap[col])

    areas["suffix"] = areas.subnationals_ISO_CC.apply(
        lambda xs: "-".join([iso_to_country(x) for x in xs])
    )
    code_to_name = dict(zip(snr.ISO_CODE, snr.NAME))
    duplicates = {
        x: y
        for x, y in Counter(zip(areas[name_column], areas["suffix"])).items()
        if y > 1
    }
    # print(sorted(duplicates.items(), key=lambda x: x[1], reverse=True))
    mid_by_idx = compute_mid_by_idx(
        areas,
        duplicates,
        code_to_name,
        name_column=name_column,
        more_general_direction=more_general_direction,
    )
    areas["mid"] = areas.index_.apply(lambda x: mid_by_idx.get(x, ""))


def compute_mid_names_for_state(
    areas, idxs_for_state, state, *, more_general_direction
):
    if len(idxs_for_state) == 1:
        return {idxs_for_state[0]: state}
    if not more_general_direction:
        assert len(idxs_for_state) == 2
        idx1, idx2 = idxs_for_state
        dir1, dir2 = directions(areas, idx1, idx2)
        mid_by_idx = {}
        mid_by_idx[idx1] = dir1 + " " + state
        mid_by_idx[idx2] = dir2 + " " + state
        return mid_by_idx
    centroids = areas.geometry[idxs_for_state].centroid
    # pylint: disable=import-outside-toplevel
    from urbanstats.utils import name_points_around_center

    names = name_points_around_center(centroids)
    return {idx: state + ": " + name for idx, name in zip(idxs_for_state, names)}


def compute_mid_by_idx(
    areas, duplicates, code_to_name, *, name_column, more_general_direction
):
    mid_by_idx = {}
    for name, suffix in duplicates:
        idxs = areas.index[(areas[name_column] == name) & (areas.suffix == suffix)]
        state_summary = areas.loc[idxs].subnationals_ISO_CODE.apply(
            lambda x: "-".join(code_to_name[t] for t in x)
        )
        for state in set(state_summary):
            idxs_for_state = list(idxs[state_summary == state])
            mid_by_idx.update(
                compute_mid_names_for_state(
                    areas,
                    idxs_for_state,
                    state,
                    more_general_direction=more_general_direction,
                )
            )

    return mid_by_idx


def directions(areas, idx1, idx2):
    coord1, coord2 = areas.geometry[idx1].centroid, areas.geometry[idx2].centroid
    dlat, dlon = coord2.y - coord1.y, coord2.x - coord1.x
    # pylint: disable=no-else-return
    if abs(dlat) > abs(dlon):
        if dlat > 0:
            return "Southern", "Northern"
        else:
            return "Northern", "Southern"
    else:
        if dlon > 0:
            return "Western", "Eastern"
        else:
            return "Eastern", "Western"
