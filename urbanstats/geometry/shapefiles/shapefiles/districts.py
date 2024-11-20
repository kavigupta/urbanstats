from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import us_domestic_provider


def districts(
    file_name, district_type, district_abbrev, overrides=None, special_data_sources=()
):
    return Shapefile(
        hash_key=f"current_districts_{file_name}",
        path=f"named_region_shapefiles/current_district_shapefiles/shapefiles/{file_name}.pkl",
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
        special_data_sources=special_data_sources,
        filter=lambda x: True,
        universe_provider=us_domestic_provider(overrides),
        subset_masks={"USA": SelfSubset()},
    )


CONGRESSIONAL_DISTRICTS = districts(
    "cd118",
    "Congressional District",
    "",
    special_data_sources=["international_gridded_data"],
)

district_shapefiles = dict(
    congress=CONGRESSIONAL_DISTRICTS,
    state_house=districts(
        "sldl",
        "State House District",
        "HD",
        {
            "HI-HD051, USA": ["Hawaii, USA"],
            "OH-HD013, USA": ["Ohio, USA"],
            "PA-HD001, USA": ["Pennsylvania, USA"],
            "RI-HD075, USA": ["Rhode Island, USA"],
        },
    ),
    state_senate=districts(
        "sldu", "State Senate District", "SD", {"HI-SD025, USA": ["Hawaii, USA"]}
    ),
)
