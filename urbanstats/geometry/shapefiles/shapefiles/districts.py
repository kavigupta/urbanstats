import os
import pickle
import geopandas as gpd
import tempfile
import zipfile

import numpy as np
import pandas as pd
from urbanstats.geometry.districts import consistent_district_padding
from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.geometry.temporal_stacking import collapse_unchanged
from urbanstats.universe.universe_provider.constants import us_domestic_provider

nc_leg = dict(
    linkText="NC Legislature",
    link="https://www.ncleg.gov/redistricting",
    text='Using "Current District Plans (used for 2022 election)."',
)

ga_leg = dict(
    linkText="GA Legislature",
    link="https://www.legis.ga.gov/joint-office/reapportionment",
    text='Under "House Districts- As passed Dec. 5, 2023- House Committee Chair- House Bill 1EX".',
)

al_sos = dict(
    linkText="AL Secretary of State",
    link="https://www.sos.alabama.gov/alabama-votes/state-district-maps",
    text='Under "Shape files" under "Court ordered Congressional Districts".',
)

la_leg = dict(
    linkText="LA Legislature",
    link="https://redist.legis.la.gov/",
    text='Under "Enacted Plans From the 2024 1st Extraordinary Session"',
)

mt_leg = dict(
    linkText="MT Legislature",
    link="https://mtredistricting.gov/state-legislative-maps-proposed-by-the-commission",
)

oh_sos = dict(
    linkText="OH Secretary of State",
    link="https://www.ohiosos.gov/elections/ohio-candidates/district-maps/",
)

wa_leg = dict(
    linkText="WA Government",
    link="https://geo.wa.gov/datasets/wa-ofm::washington-state-legislative-districts-2024/explore?location=46.911788%2C-120.933109%2C7.59",
)

dra = dict(
    linkText="DRA",
    link="https://davesredistricting.org/",
    text="Shapefiles are not directly linked, but can be found by searching for the specific state.",
)

mid_district_redistricting_for_2025 = {
    "cd118": dict(
        states_and_sources={
            "NY": dra,
            "NC": nc_leg,
            "GA": ga_leg,
            "AL": al_sos,
            "LA": la_leg,
        },
        prefix="named_region_shapefiles/redistricting/CD-",
    ),
    "sldl": dict(
        states_and_sources={
            "GA": ga_leg,
            "MI": dict(
                linkText="MI CRC",
                link="https://www.michigan.gov/micrc/mapping-process-2024/final-remedial-state-house-plan",
            ),
            "MT": mt_leg,
            "NC": nc_leg,
            "ND": dra,
            "OH": oh_sos,
            "SC": dra,
            "WA": wa_leg,
            "WI": dra,
        },
        prefix="named_region_shapefiles/redistricting/HD-",
    ),
    "sldu": dict(
        states_and_sources={
            "GA": ga_leg,
            "MI": dict(
                linkText="MI CRC",
                link="https://www.michigan.gov/micrc/mapping-process-2024/final-remedial-state-senate-plan",
            ),
            "MT": mt_leg,
            "NC": nc_leg,
            "ND": dra,
            "OH": oh_sos,
            "WA": wa_leg,
            "WI": dra,
        },
        prefix="named_region_shapefiles/redistricting/SD-",
    ),
}

version_tag_by_file_name = {
    "cd118": "_6",
    "sldl": "_6",
    "sldu": "_6",
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


def load_districts_all_2020s(file_name):
    with open(
        f"named_region_shapefiles/current_district_shapefiles/shapefiles/{file_name}.pkl",
        "rb",
    ) as f:
        result = pickle.load(f)

    result = result[["state", "district", "geometry"]].reset_index(drop=True)

    result["start_date"] = 2023
    result["end_date"] = 2032

    redistricted = mid_district_redistricting_for_2025[file_name]

    for state in redistricted["states_and_sources"]:
        for_state = read_shapefile(f"{redistricted['prefix']}{state}.zip").to_crs(
            "epsg:4326"
        )
        for_state["district"] = get_district_column(for_state)
        for_state["state"] = state
        for_state["start_date"] = 2025
        for_state["end_date"] = 2032
        [state_idxs] = np.where(result["state"] == state)
        result.loc[state_idxs, "end_date"] = 2024
        result = result.copy()
        for_state = for_state[list(result)]
        result = pd.concat([result, for_state]).reset_index(drop=True)
    result.district = consistent_district_padding(
        result.state, result.district.apply(str), minimum_length=2
    )
    result = collapse_unchanged(result, identity_columns=("state", "district"))
    return result


def load_shapefile(file_name, *, only_keep):
    result = load_districts_all_2020s(file_name)

    if only_keep == "up-to-date":
        return result[result["end_date"] == 2032].reset_index(drop=True)
    elif only_keep == "past":
        return result[result["end_date"] < 2032].reset_index(drop=True)
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


def get_shortname(district_abbrev, x):
    district = x["district"]
    if district == "" or district.isnumeric() and int(district) == 0:
        district = "AL"
    return f'{x["state"]}-{district_abbrev}{district} ({x["start_date"]})'


def districts(
    file_name,
    district_type,
    district_abbrev,
    *,
    abbreviation,
    overrides=None,
    data_credit,
):
    return Shapefile(
        hash_key=f"current_districts_{file_name}"
        + version_tag_by_file_name.get(file_name, ""),
        path=lambda: load_shapefile(file_name, only_keep="up-to-date"),
        shortname_extractor=lambda x: get_shortname(district_abbrev, x),
        longname_extractor=lambda x: get_shortname(district_abbrev, x) + ", USA",
        meta=dict(type=district_type, source="Census", type_category="Political"),
        filter=lambda x: True,
        universe_provider=us_domestic_provider(overrides),
        subset_masks={"USA": SelfSubset()},
        abbreviation=abbreviation,
        data_credit=[data_credit]
        + [
            {**dc, "linkText": f"{state} redistricting: {dc['linkText']}"}
            for state, dc in sorted(
                mid_district_redistricting_for_2025[file_name][
                    "states_and_sources"
                ].items()
            )
        ],
    )


CONGRESSIONAL_DISTRICTS = districts(
    "cd118",
    "Congressional District",
    "",
    abbreviation="CONG",
    data_credit=dict(
        linkText="US Census",
        link="https://www2.census.gov/geo/tiger/TIGER_RD18/LAYER/CD",
    ),
)

district_shapefiles = dict(
    congress=CONGRESSIONAL_DISTRICTS,
    state_house=districts(
        "sldl",
        "State House District",
        "HD",
        abbreviation="STHD",
        overrides={
            "HI-HD51 (2023), USA": ["Hawaii, USA"],
            "OH-HD13 (2025), USA": ["Ohio, USA"],
            "PA-HD001 (2023), USA": ["Pennsylvania, USA"],
            "RI-HD75 (2023), USA": ["Rhode Island, USA"],
        },
        data_credit=dict(
            linkText="US Census",
            link="https://www2.census.gov/geo/tiger/TIGER2018/SLDL/",
        ),
    ),
    state_senate=districts(
        "sldu",
        "State Senate District",
        "SD",
        abbreviation="STSD",
        overrides={"HI-SD25 (2023), USA": ["Hawaii, USA"]},
        data_credit=dict(
            linkText="US Census",
            link="https://www2.census.gov/geo/tiger/TIGER2018/SLDU/",
        ),
    ),
)
