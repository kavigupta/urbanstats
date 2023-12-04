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


def urban_area(name, *, is_shortname):
    name = name.replace("--", "-")
    assert name.endswith("Urban Area")
    name = name[: -len(" Urban Area")]
    *name, state = name.split(",")
    name = ", ".join(name)
    if is_shortname:
        return name + " Urban Area"
    name = name + " [Urban Area]," + state + ", USA"
    return name


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


def judicial_districts():
    data = gpd.read_file("named_region_shapefiles/US_District_Court_Jurisdictions.zip")
    data = data[data.STATE.apply(lambda x: us.states.lookup(x) is not None)]
    return data


def judicial_circuits():
    data = judicial_districts().dissolve(by="DISTRICT_N")

    def ordinalize(district_n):
        if district_n == "DC":
            return "DC Circuit"
        district_n = int(district_n)
        suffix = "th"
        if district_n == 1:
            suffix = "st"
        elif district_n == 2:
            suffix = "nd"
        elif district_n == 3:
            suffix = "rd"
        return f"{district_n}{suffix} Circuit"

    data["shortname"] = data.index.map(ordinalize)
    return data


shapefiles = dict(
    states=Shapefile(
        hash_key="census_states_3",
        path="named_region_shapefiles/cb_2022_us_state_500k.zip",
        shortname_extractor=lambda x: x["NAME"],
        longname_extractor=lambda x: x["NAME"] + ", USA",
        filter=lambda x: True,
        meta=dict(type="State", source="Census"),
        include_in_gpw=True,
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
    urban_areas=Shapefile(
        hash_key="urban_areas",
        path="named_region_shapefiles/tl_rd22_us_uac20.zip",
        shortname_extractor=lambda x: urban_area(x.NAMELSAD20, is_shortname=True),
        longname_extractor=lambda x: urban_area(x.NAMELSAD20, is_shortname=False),
        filter=lambda x: True,
        meta=dict(type="Urban Area", source="Census"),
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
    judicial_districts=Shapefile(
        hash_key="judicial_districts",
        path=judicial_districts,
        shortname_extractor=lambda x: x["NAME"]
        + ", "
        + us.states.lookup(x["STATE"]).abbr,
        longname_extractor=lambda x: x["NAME"]
        + ", "
        + us.states.lookup(x["STATE"]).abbr
        + ", USA",
        filter=lambda x: True,
        meta=dict(type="Judicial District", source="HIFLD"),
    ),
    judicial_circuits=Shapefile(
        hash_key="judicial_circuits_2",
        path=judicial_circuits,
        shortname_extractor=lambda x: x["shortname"],
        longname_extractor=lambda x: x["shortname"] + ", USA",
        filter=lambda x: True,
        meta=dict(type="Judicial Circuit", source="HIFLD"),
    ),
    media_markets=Shapefile(
        hash_key="media_markets_2",
        path="named_region_shapefiles/NatDMA.zip",
        shortname_extractor=lambda x: x["NAME"] + " Media Market",
        longname_extractor=lambda x: x["NAME"] + " Media Market, USA",
        filter=lambda x: x.NAME != "National",
        meta=dict(type="Media Market", source="Nielsen via Kenneth C Black"),
    ),
    countries=Shapefile(
        hash_key="countries",
        path="named_region_shapefiles/World_Countries_Generalized.zip",
        shortname_extractor=lambda x: x["name"],
        longname_extractor=lambda x: x["name"],
        filter=lambda x: True,
        meta=dict(type="Country", source="OpenDataSoft"),
        american=False,
        include_in_gpw=True,
    ),
    subnational_regions=Shapefile(
        hash_key="subnational_regions",
        path="named_region_shapefiles/World_Administrative_Divisions.zip",
        shortname_extractor=lambda x: x["NAME"] + ", " + str(x["COUNTRY"]),
        longname_extractor=lambda x: x["NAME"],
        filter=lambda x: x.COUNTRY is not None,
        meta=dict(type="Subnational Region", source="ESRI"),
        american=False,
        include_in_gpw=True,
    ),
)
