import glob
import us

from stats_for_shapefile import Shapefile


def current_state(x):
    x = us.states.lookup(x)
    if x is None:
        return False
    return not x.is_territory


def name_components(x, row):
    name, state = row.NAME.split(", ")
    return (name + " " + x, us.states.lookup(state).name, "USA")


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
        hash_key="census_counties",
        path="named_region_shapefiles/cb_2018_us_county_500k.zip",
        shortname_extractor=lambda x: x["NAME"] + " County",
        longname_extractor=lambda x: x["NAME"]
        + " County, "
        + us.states.lookup(x["STATEFP"]).name
        + ", USA",
        filter=lambda x: current_state(x["STATEFP"]),
        meta=dict(type="County", source="Census"),
    ),
    msas=Shapefile(
        hash_key="census_msas",
        path="named_region_shapefiles/cb_2018_us_cbsa_500k.zip",
        shortname_extractor=lambda x: name_components("MSA", x)[0],
        longname_extractor=lambda x: ", ".join(name_components("MSA", x)),
        filter=lambda x: current_state(x["NAME"].split(", ")[-1]),
        meta=dict(type="MSA", source="Census"),
    ),
    csas=Shapefile(
        hash_key="census_csas",
        path="named_region_shapefiles/cb_2018_us_csa_500k.zip",
        shortname_extractor=lambda x: name_components("CSA", x)[0],
        longname_extractor=lambda x: ", ".join(name_components("CSA", x)),
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
        hash_key="census_cousub",
        path="named_region_shapefiles/cb_2022_us_cousub_500k.zip",
        shortname_extractor=lambda x: f"{x.NAME} CCD",
        longname_extractor=lambda x: f"{x.NAME} CCD, {x.NAMELSADCO}, {x.STATE_NAME}, USA",
        filter=lambda x: current_state(x["STUSPS"]),
        meta=dict(type="CCD", source="Census"),
    ),
    cities=Shapefile(
        hash_key="census_places",
        path=sorted(glob.glob("named_region_shapefiles/place/*.zip")),
        shortname_extractor=lambda x: x.NAMELSAD,
        longname_extractor=lambda x: f"{x.NAMELSAD}, {us.states.lookup(x.STATEFP).name}, USA",
        filter=lambda x: current_state(x.STATEFP),
        meta=dict(type="City", source="Census"),
    ),
    neighborhoods=Shapefile(
        hash_key="zillow_neighborhoods",
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
    ),
)
