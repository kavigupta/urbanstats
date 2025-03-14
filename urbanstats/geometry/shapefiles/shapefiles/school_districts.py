from collections import Counter

import geopandas as gpd
import pandas as pd
from permacache import permacache

from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.geometry.shapefiles.shapefiles.counties import COUNTIES
from urbanstats.universe.universe_provider.constants import us_domestic_provider


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
    counties = COUNTIES.load_file()
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


SCHOOL_DISTRICTS = Shapefile(
    hash_key="school_districts_2",
    path=school_district_shapefiles,
    shortname_extractor=lambda x: x["NAME"],
    longname_extractor=lambda x: f"{x['NAME']}{x['suffix']}, {x['STATE_NAME']}, USA",
    filter=lambda x: True,
    meta=dict(type="School District", source="Census", type_category="School"),
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
    abbreviation="SCLD",
    data_credit=dict(
        linkText="US Census",
        link="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html",
    ),
)
