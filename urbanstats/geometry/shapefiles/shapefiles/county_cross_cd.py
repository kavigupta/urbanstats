import re
import geopandas as gpd
import pandas as pd
import tqdm.auto as tqdm
import us
from permacache import permacache, stable_hash

from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.geometry.shapefiles.shapefiles.counties import COUNTIES
from urbanstats.geometry.shapefiles.shapefiles.districts import CONGRESSIONAL_DISTRICTS
from urbanstats.universe.universe_provider.constants import us_domestic_provider


@permacache(
    "population_density/shapefiles/county_cross_cd_3",
    key_function=dict(
        cds_sf=lambda cds_sf: cds_sf.hash_key,
        counties_sf=lambda counties_sf: counties_sf.hash_key,
    ),
)
def county_cross_cd(cds_sf=CONGRESSIONAL_DISTRICTS, counties_sf=COUNTIES):
    cds = cds_sf.load_file()
    counties = counties_sf.load_file()
    county_areas = dict(zip(counties.longname, counties.to_crs({"proj": "cea"}).area))

    db_all = []
    for state in tqdm.tqdm(us.STATES, desc="cross county CD"):
        cds_state = cds[
            cds.longname.apply(lambda x, state=state: x.startswith(state.abbr))
        ]
        counties_state = counties[
            counties.longname.apply(
                lambda x, state=state: x.endswith(state.name + ", USA")
            )
        ]
        db_state = gpd.overlay(
            cds_state, counties_state, keep_geom_type=True
        ).reset_index(drop=True)
        frac = db_state.to_crs({"proj": "cea"}).area / db_state.longname_2.apply(
            lambda x: county_areas[x]
        )
        mask = frac >= 0.003
        db_state = db_state[mask]
        db_all.append(db_state)
    db = pd.concat(db_all)
    db = db.reset_index(drop=True)
    db["shortname_sans_date"] = db["shortname_1"] + " in " + db["shortname_2"]
    # This is kinda a hack but it'll work.
    db["shortname_sans_date"] = db["shortname_sans_date"].apply(
        lambda x: re.sub(r" \([0-9]{4}\)", "", x)
    )
    db["longname_sans_date"] = db["shortname_sans_date"] + ", USA"
    db["start_date"] = db.start_date_1
    db["end_date"] = db.end_date_1
    db["shortname"] = db.apply(
        lambda x: f"{x.shortname_sans_date} ({x.start_date})", axis=1
    )
    db["longname"] = db["shortname"] + ", USA"
    return db


COUNTY_CROSS_CD = Shapefile(
    hash_key="county_cross_cd_4_"
    + stable_hash((COUNTIES.hash_key, CONGRESSIONAL_DISTRICTS.hash_key))[:6],
    path=county_cross_cd,
    shortname_extractor=lambda x: x["shortname"],
    longname_extractor=lambda x: x["longname"],
    longname_sans_date_extractor=lambda x: x["longname_sans_date"],
    filter=lambda x: True,
    meta=dict(type="County Cross CD", source="Census", type_category="Political"),
    chunk_size=100,
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
    abbreviation="CXCD",
    data_credit=dict(
        text="We take the intersection of the county and congressional district shapefiles.",
        linkText="US Census",
        link="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html",
    ),
)
