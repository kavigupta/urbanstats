import geopandas as gpd
import us

from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import us_domestic_provider


def judicial_districts():
    data = gpd.read_file("named_region_shapefiles/US_District_Court_Jurisdictions.zip")
    data = data[data.STATE.apply(lambda x: us.states.lookup(x) is not None)]
    return data


JUDICIAL_DISTRICTS = Shapefile(
    hash_key="judicial_districts",
    path=judicial_districts,
    shortname_extractor=lambda x: x["NAME"] + ", " + us.states.lookup(x["STATE"]).abbr,
    longname_extractor=lambda x: x["NAME"]
    + ", "
    + us.states.lookup(x["STATE"]).abbr
    + ", USA",
    filter=lambda x: True,
    meta=dict(type="Judicial District", source="HIFLD", type_category="Oddball"),
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
    abbreviation="JDIS",
)


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


JUDICIAL_CIRCUITS = Shapefile(
    hash_key="judicial_circuits_2",
    path=judicial_circuits,
    shortname_extractor=lambda x: x["shortname"],
    longname_extractor=lambda x: x["shortname"] + ", USA",
    filter=lambda x: True,
    meta=dict(type="Judicial Circuit", source="HIFLD", type_category="Oddball"),
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
    abbreviation="JCIR",
)
judicial_shapefiles = dict(
    judicial_districts=JUDICIAL_DISTRICTS,
    judicial_circuits=JUDICIAL_CIRCUITS,
)
