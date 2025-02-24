import os
import pickle
import string
import geopandas as gpd
import tempfile
import zipfile

import numpy as np
import pandas as pd
from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import us_domestic_provider

mid_district_redistricting_for_2025 = {
    "cd118": dict(
        states=["NY", "NC", "GA", "AL", "LA"],
        prefix="named_region_shapefiles/redistricting/CD-",
    ),
    "sldl": dict(
        states=["GA", "MI", "MT", "NC", "ND", "OH", "SC", "WA", "WI"],
        prefix="named_region_shapefiles/redistricting/HD-",
    ),
    "sldu": dict(
        states=["GA", "MI", "MT", "NC", "ND", "OH", "WA", "WI"],
        prefix="named_region_shapefiles/redistricting/SD-",
    ),
}

version_tag_by_file_name = {
    "cd118": "_3",
    "sldl": "_1",
    "sldu": "_1",
}


def get_district_column(table):
    if "DISTRICT" in table.columns:
        col = "DISTRICT"
    elif "DISTRICT_I" in table.columns:
        col = "DISTRICT_I"
    elif "DISTRICTNO" in table.columns:
        col = "DISTRICTNO"
    elif "District" in table.columns:
        col = "District"
    elif "NAME" in table.columns:
        col = "NAME"
    else:
        raise ValueError("No district column found: " + str(table.columns))
    return table[col].apply(
        lambda x: f"{int(x):02d}" if not isinstance(x, str) or x.isnumeric() else x
    )


def read_shapefile(path):
    """
    path contains a zip that might contain a folder with a shapefile
    """

    with tempfile.TemporaryDirectory() as tmpdirname:
        with zipfile.ZipFile(path, "r") as zip_ref:
            zip_ref.extractall(tmpdirname)
        all_filenames = [
            os.path.join(tmpdirname, folder, path)
            for folder, _, files in os.walk(tmpdirname)
            for path in files
            if path.endswith(".shp")
        ]
        assert len(all_filenames) == 1, all_filenames
        return gpd.read_file(all_filenames[0])


def load_shapefile_direct(file_name, *, only_keep):
    with open(
        f"named_region_shapefiles/current_district_shapefiles/shapefiles/{file_name}.pkl",
        "rb",
    ) as f:
        result = pickle.load(f)

    result = result[["state", "district", "geometry"]]

    if file_name in ("sldl", "sldu"):
        # TODO fill in updated districts
        return result

    result["start_date"] = 2023
    result["end_date"] = 2032

    redistricted = mid_district_redistricting_for_2025[file_name]

    for state in redistricted["states"]:
        for_state = read_shapefile(f"{redistricted['prefix']}{state}.zip").to_crs(
            "epsg:4326"
        )
        for_state["district"] = get_district_column(for_state)
        for_state["state"] = state
        for_state["start_date"] = 2025
        for_state["end_date"] = 2032
        print(state)
        [state_idxs] = np.where(result["state"] == state)
        for_state, sub_idxs = deduplicate(for_state, result.iloc[state_idxs])
        for_state = for_state[
            ["state", "district", "geometry", "start_date", "end_date"]
        ]
        result.loc[state_idxs[sub_idxs], "end_date"] = 2024
        result = result.append(for_state, ignore_index=True)
    if only_keep == "up-to-date":
        return result[result["end_date"] == 2032]
    elif only_keep == "past":
        return result[result["end_date"] < 2032]
    else:
        raise ValueError(f"Unknown value for only_keep: {only_keep}")


def deduplicate(for_state, existing):
    districts_a = for_state.district.apply(
        lambda x: int(x) if x.isnumeric() else x.lstrip("0")
    )
    districts_existing = existing.district.apply(
        lambda x: int(x) if x.isnumeric() else x.lstrip("0")
    )
    keep_mask = []
    existing_changed_idxs = []
    for a in districts_a:
        if a not in districts_existing:
            keep_mask.append(True)
            continue
        [[idx_a]] = np.where(districts_a == a)
        [[idx_existing]] = np.where(districts_existing == a)
        geo_a = for_state.geometry.iloc[idx_a]
        geo_existing = existing.geometry.iloc[idx_existing]
        existing_changed_idxs.append(idx_existing)
        # keep only if district is not a duplicate
        keep_mask.append(
            geo_a.intersection(geo_existing).area / min(geo_a.area, geo_existing.area)
            < 1 - 0.00001
        )
    for_state = for_state[keep_mask]
    return for_state, existing_changed_idxs

def load_shapefile(file_name, *, only_keep):
    return load_shapefile_direct(file_name, only_keep=only_keep).reset_index(drop=True)


def districts(
    file_name, district_type, district_abbrev, *, abbreviation, overrides=None
):
    return Shapefile(
        hash_key=f"current_districts_{file_name}"
        + version_tag_by_file_name.get(file_name, ""),
        path=lambda: load_shapefile(file_name, only_keep="up-to-date"),
        shortname_extractor=lambda x: x["state"]
        + "-"
        + district_abbrev
        + x["district"],
        longname_extractor=lambda x: x["state"]
        + "-"
        + district_abbrev
        + x["district"]
        + ", USA",
        meta=dict(type=district_type, source="Census", type_category="Political"),
        filter=lambda x: True,
        universe_provider=us_domestic_provider(overrides),
        subset_masks={"USA": SelfSubset()},
        abbreviation=abbreviation,
    )


CONGRESSIONAL_DISTRICTS = districts(
    "cd118", "Congressional District", "", abbreviation="CONG"
)

district_shapefiles = dict(
    congress=CONGRESSIONAL_DISTRICTS,
    state_house=districts(
        "sldl",
        "State House District",
        "HD",
        abbreviation="STHD",
        overrides={
            "HI-HD051, USA": ["Hawaii, USA"],
            "OH-HD013, USA": ["Ohio, USA"],
            "PA-HD001, USA": ["Pennsylvania, USA"],
            "RI-HD075, USA": ["Rhode Island, USA"],
        },
    ),
    state_senate=districts(
        "sldu",
        "State Senate District",
        "SD",
        abbreviation="STSD",
        overrides={"HI-SD025, USA": ["Hawaii, USA"]},
    ),
)
