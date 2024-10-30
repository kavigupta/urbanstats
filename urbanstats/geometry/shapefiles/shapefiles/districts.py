from urbanstats.geometry.shapefiles.shapefile import Shapefile


def districts(file_name, district_type, district_abbrev):
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
        filter=lambda x: True,
    )


CONGRESSIONAL_DISTRICTS = districts("cd118", "Congressional District", "")

district_shapefiles = dict(
    congress=CONGRESSIONAL_DISTRICTS,
    state_house=districts("sldl", "State House District", "HD"),
    state_senate=districts("sldu", "State Senate District", "SD"),
)
