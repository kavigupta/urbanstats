import glob
import us

from functools import lru_cache

from stats_for_shapefile import Shapefile


def current_state(x):
    if "-" in x:
        return all(current_state(t) for t in x.split("-"))
    x = us.states.lookup(x)
    if x is None:
        return False
    return not x.is_territory


def abbr_to_state(x):
    if "-" in x:
        return "-".join(abbr_to_state(t) for t in x.split("-"))
    return us.states.lookup(x).name


def name_components(x, row, abbreviate=False):
    name, state = row.NAME.split(", ")
    return (name + " " + x, (state if abbreviate else abbr_to_state(state)), "USA")


@lru_cache(None)
def county_fips_map():
    with open("named_region_shapefiles/county_map.txt") as f:
        contents = [x.strip() for x in list(f)]
    contents = [[t.strip() for t in x.split("     ")][:2] for x in contents if x]
    assert all(len(x) == 2 for x in contents)
    fs, cs = zip(*contents)
    result = dict(zip(fs, cs))
    result["02105"] = "Hoonah-Angoon Census Area"
    result["02158"] = "Kusilvak Census Area"
    result["02195"] = "Petersburg Census Area"
    result["02198"] = "Prince of Wales-Hyder Census Area"
    result["02230"] = "Skagway Municipality"
    result["02275"] = "Wrangell City and Borough"

    result["08014"] = "Broomfield County"
    result["12086"] = "Miami-Dade County"
    result["46102"] = "Oglala Lakota"
    return result


def county_name(row):
    m = county_fips_map()
    f = row.STATEFP + row.COUNTYFP
    f = m[f]
    if f.lower().endswith("city"):
        f = f + "-County"
    return f


shapefiles = dict(
    states=Shapefile(
        hash_key="census_states",
        path="named_region_shapefiles/cb_2018_us_state_500k.zip",
        shortname_extractor=lambda x: x["NAME"],
        longname_extractor=lambda x: x["NAME"] + ", USA",
        filter=lambda x: current_state(x["NAME"]),
        meta=dict(type="State", source="Census"),
    ),
    counties=Shapefile(
        hash_key="census_counties_5",
        path="named_region_shapefiles/cb_2018_us_county_500k.zip",
        shortname_extractor=lambda x: county_name(x),
        longname_extractor=lambda x: county_name(x)
        + ", "
        + us.states.lookup(x["STATEFP"]).name
        + ", USA",
        filter=lambda x: current_state(x["STATEFP"]),
        meta=dict(type="County", source="Census"),
    ),
    msas=Shapefile(
        hash_key="census_msas_3",
        path="named_region_shapefiles/cb_2018_us_cbsa_500k.zip",
        shortname_extractor=lambda x: name_components("MSA", x)[0],
        longname_extractor=lambda x: ", ".join(
            name_components("MSA", x, abbreviate=True)
        ),
        filter=lambda x: current_state(x["NAME"].split(", ")[-1]),
        meta=dict(type="MSA", source="Census"),
    ),
    csas=Shapefile(
        hash_key="census_csas_3",
        path="named_region_shapefiles/cb_2018_us_csa_500k.zip",
        shortname_extractor=lambda x: name_components("CSA", x)[0],
        longname_extractor=lambda x: ", ".join(
            name_components("CSA", x, abbreviate=True)
        ),
        filter=lambda x: current_state(x["NAME"].split(", ")[-1]),
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
        hash_key="census_cousub_6",
        path="named_region_shapefiles/cb_2020_us_cousub_500k.zip",
        shortname_extractor=lambda x: f"{x.NAMELSAD}",
        longname_extractor=lambda x: f"{x.NAMELSAD} [CCD], {x.NAMELSADCO}, {x.STATE_NAME}, USA",
        filter=lambda x: current_state(x["STUSPS"]),
        meta=dict(type="CCD", source="Census"),
    ),
    cities=Shapefile(
        hash_key="census_places_2",
        path=sorted(glob.glob("named_region_shapefiles/place/*.zip")),
        shortname_extractor=lambda x: x.NAMELSAD,
        longname_extractor=lambda x: f"{x.NAMELSAD}, {us.states.lookup(x.STATEFP).name}, USA",
        filter=lambda x: current_state(x.STATEFP),
        meta=dict(type="City", source="Census"),
        drop_dup=True,
    ),
    neighborhoods=Shapefile(
        hash_key="zillow_neighborhoods_2",
        path="named_region_shapefiles/Zillow_Neighborhoods/zillow.shp",
        shortname_extractor=lambda x: x["Name"] + ", " + x["City"],
        longname_extractor=lambda x: x["Name"]
        + " Neighborhood, "
        + x["City"]
        + " City, "
        + us.states.lookup(x["State"]).name
        + ", USA",
        filter=lambda x: current_state(x["State"]),
        meta=dict(type="Neighborhood", source="Zillow"),
        drop_dup=True,
    ),
)
