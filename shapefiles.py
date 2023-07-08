from collections import Counter
import pandas as pd
import us

import geopandas as gpd
from permacache import permacache

from stats_for_shapefile import Shapefile


def abbr_to_state(x):
    if "-" in x:
        return "-".join(abbr_to_state(t) for t in x.split("-"))
    return us.states.lookup(x).name


def name_components(x, row, abbreviate=False):
    name, state = row.NAME.split(", ")
    return (name + " " + x, (state if abbreviate else abbr_to_state(state)), "USA")


def county_name(row):
    f = row["NAMELSAD"]
    if f.lower().endswith("city"):
        f = f + "-County"
    return f


def render_ordinal(x):
    if x % 100 in {11, 12, 13}:
        return f"{x}th"
    if x % 10 == 1:
        return f"{x}st"
    if x % 10 == 2:
        return f"{x}nd"
    if x % 10 == 3:
        return f"{x}rd"
    return f"{x}th"


def render_start_and_end(row):
    start, end = row.start, row.end
    if start == end:
        return f"{render_ordinal(start)}"
    else:
        return f"{render_ordinal(start)}-{render_ordinal(end)}"


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
        meta=dict(type=district_type, source="Census"),
        filter=lambda x: True,
    )


@permacache("population_density/ce_to_name")
def ce_to_name():
    table = gpd.read_file("named_region_shapefiles/cb_2022_us_aiannh_500k.zip")
    return dict(zip(table.AIANNHCE, table.NAMELSAD))


def is_native_statistical_area(row):
    x = ce_to_name()[row.AIANNHCE]
    return "OTSA" in x or "SDTSA" in x or "ANVSA" in x or "TDSA" in x


@permacache("population_density/shapefiles/school_district_shapefiles")
def school_district_shapefiles():
    paths = [
        f"named_region_shapefiles/cb_2022_us_{ident}_500k.zip"
        for ident in ["elsd", "scsd", "unsd"]
    ]
    frame = gpd.GeoDataFrame(
        pd.concat([gpd.read_file(path) for path in paths]).reset_index(drop=True)
    )
    full_names = frame.NAME + ", " + frame.STATE_NAME
    u = Counter(full_names)
    duplicated = {x for x in u if u[x] > 1}
    duplicated_mask = full_names.apply(lambda x: x in duplicated)
    duplicated_districts = frame[duplicated_mask]
    counties = shapefiles["counties"].load_file()
    joined = gpd.overlay(counties, duplicated_districts.to_crs("epsg:4326"))
    areas = joined.area
    geoid_to_county = {}
    for geoid in set(joined.GEOID):
        filt = joined[joined.GEOID == geoid]
        geoid_to_county[geoid] = filt.iloc[areas[filt.index].argmax()].shortname
    frame["suffix"] = frame.GEOID.apply(
        lambda x: "" if x not in geoid_to_county else f" ({geoid_to_county[x]})"
    )
    return frame


shapefiles = dict(
    states=Shapefile(
        hash_key="census_states_3",
        path="named_region_shapefiles/cb_2022_us_state_500k.zip",
        shortname_extractor=lambda x: x["NAME"],
        longname_extractor=lambda x: x["NAME"] + ", USA",
        filter=lambda x: True,
        meta=dict(type="State", source="Census"),
    ),
    counties=Shapefile(
        hash_key="census_counties_7",
        path="named_region_shapefiles/cb_2022_us_county_500k.zip",
        shortname_extractor=lambda x: county_name(x),
        longname_extractor=lambda x: county_name(x)
        + ", "
        + us.states.lookup(x["STATEFP"]).name
        + ", USA",
        filter=lambda x: True,
        meta=dict(type="County", source="Census"),
    ),
    msas=Shapefile(
        hash_key="census_msas_4",
        path="named_region_shapefiles/cb_2018_us_cbsa_500k.zip",
        shortname_extractor=lambda x: name_components("MSA", x)[0],
        longname_extractor=lambda x: ", ".join(
            name_components("MSA", x, abbreviate=True)
        ),
        filter=lambda x: True,
        meta=dict(type="MSA", source="Census"),
    ),
    csas=Shapefile(
        hash_key="census_csas_4",
        path="named_region_shapefiles/cb_2018_us_csa_500k.zip",
        shortname_extractor=lambda x: name_components("CSA", x)[0],
        longname_extractor=lambda x: ", ".join(
            name_components("CSA", x, abbreviate=True)
        ),
        filter=lambda x: True,
        meta=dict(type="CSA", source="Census"),
    ),
    zctas=Shapefile(
        hash_key="census_zctas",
        path="named_region_shapefiles/cb_2018_us_zcta510_500k.zip",
        shortname_extractor=lambda x: f"{x.ZCTA5CE10}",
        longname_extractor=lambda x: f"{x.ZCTA5CE10}, USA",
        filter=lambda x: True,
        meta=dict(type="ZIP", source="Census"),
    ),
    cousub=Shapefile(
        hash_key="census_cousub_8",
        path="named_region_shapefiles/cb_2022_us_cousub_500k.zip",
        shortname_extractor=lambda x: f"{x.NAMELSAD}",
        longname_extractor=lambda x: f"{x.NAMELSAD} [CCD], {x.NAMELSADCO}, {x.STATE_NAME}, USA",
        filter=lambda x: True,
        meta=dict(type="CCD", source="Census"),
    ),
    cities=Shapefile(
        hash_key="census_places_4",
        path="named_region_shapefiles/cb_2022_us_place_500k.zip",
        shortname_extractor=lambda x: x.NAMELSAD,
        longname_extractor=lambda x: f"{x.NAMELSAD}, {us.states.lookup(x.STATEFP).name}, USA",
        filter=lambda x: True,
        meta=dict(type="City", source="Census"),
        drop_dup=True,
    ),
    neighborhoods=Shapefile(
        hash_key="zillow_neighborhoods_3",
        path="named_region_shapefiles/Zillow_Neighborhoods/zillow.shp",
        shortname_extractor=lambda x: x["Name"] + ", " + x["City"],
        longname_extractor=lambda x: x["Name"]
        + " Neighborhood, "
        + x["City"]
        + " City, "
        + us.states.lookup(x["State"]).name
        + ", USA",
        filter=lambda x: True,
        meta=dict(type="Neighborhood", source="Zillow"),
        drop_dup=True,
    ),
    congress=districts("cd118", "Congressional District", ""),
    state_house=districts("sldl", "State House District", "HD"),
    state_senate=districts("sldu", "State Senate District", "SD"),
    historical_congressional=Shapefile(
        hash_key="historical_congressional_5",
        path="named_region_shapefiles/congressional_districts/combo/historical.pkl",
        shortname_extractor=lambda x: f'{x["state"]}-{int(x["district"]):02d} [{render_start_and_end(x)} Congress]',
        longname_extractor=lambda x: f"Historical Congressional District"
        + f" {x['state']}-{x['district']}, {render_start_and_end(x)} Congress, USA",
        filter=lambda x: True,
        meta=dict(type="Historical Congressional District", source="Census"),
        chunk_size=100,
    ),
    native_areas=Shapefile(
        hash_key="native_areas_2",
        path="named_region_shapefiles/cb_2022_us_aiannh_500k.zip",
        shortname_extractor=lambda x: f"{x.NAMELSAD}",
        longname_extractor=lambda x: f"{x.NAMELSAD}, USA",
        filter=lambda x: not is_native_statistical_area(x),
        meta=dict(type="Native Area", source="Census"),
    ),
    native_statistical_areas=Shapefile(
        hash_key="native_statistical_areas",
        path="named_region_shapefiles/cb_2022_us_aiannh_500k.zip",
        shortname_extractor=lambda x: f"{x.NAMELSAD}",
        longname_extractor=lambda x: f"{x.NAMELSAD}, USA",
        filter=lambda x: is_native_statistical_area(x),
        meta=dict(type="Native Statistical Area", source="Census"),
    ),
    native_subdivisions=Shapefile(
        hash_key="native_subdivisions_2",
        path="named_region_shapefiles/cb_2022_us_aitsn_500k.zip",
        shortname_extractor=lambda x: f"{x.NAMELSAD}",
        longname_extractor=lambda x: f"{x.NAMELSAD}, {ce_to_name()[x.AIANNHCE]}, USA",
        filter=lambda x: True,
        meta=dict(type="Native Subdivision", source="Census"),
    ),
    school_districts=Shapefile(
        hash_key="school_districts_2",
        path=school_district_shapefiles,
        shortname_extractor=lambda x: x["NAME"],
        longname_extractor=lambda x: f"{x['NAME']}{x['suffix']}, {x['STATE_NAME']}, USA",
        filter=lambda x: True,
        meta=dict(type="School District", source="Census"),
    ),
)
