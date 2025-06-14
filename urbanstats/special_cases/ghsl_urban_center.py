from collections import Counter

import geopandas as gpd
import numpy as np
from permacache import permacache

from urbanstats.special_cases.country import subnational_regions
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


@permacache("urbanstats/special_cases/ghsl_urban_center/load_ghsl_urban_center_10")
def load_ghsl_urban_center():
    # pylint: disable=unsupported-assignment-operation
    areas = load_ghsl_urban_center_no_names()
    areas["shortname"] = (
        areas.UC_NM_MN
        + areas.mid.apply(lambda x: " (" + x + ")" if x else "")
        + " Urban Center"
    )
    areas["longname"] = areas.shortname + ", " + areas.suffix
    return areas


@permacache(
    "urbanstats/special_cases/ghsl_urban_center/load_ghsl_urban_center_no_names_4"
)
def load_ghsl_urban_center_no_names():
    areas = gpd.read_file(
        "named_region_shapefiles/GHS_STAT_UCDB2015MT_GLOBE_R2019A_V1_2.gpkg"
    )
    areas = areas[areas.QA2_1V == 1]
    areas = areas[areas.UC_NM_MN != "N/A"]
    areas = areas.copy()
    areas["index_"] = areas.index
    snr = subnational_regions()
    subnational_classes = classify_areas_by_subnational_region(snr, areas)
    [idx_venice] = areas.index[areas.UC_NM_MN == "Venice"]
    # add idx_venice with ISO_CC = {"IT"} and ISO_CODE = {"IT34"}
    subnational_classes.loc[idx_venice] = [{"IT"}, {"IT34"}]

    return attach_subnational_suffxes(areas, snr, subnational_classes)


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
