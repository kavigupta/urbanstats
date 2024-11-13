import geopandas as gpd
import pandas as pd
import tqdm.auto as tqdm
import us
from permacache import permacache

from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefiles.counties import COUNTIES
from urbanstats.geometry.shapefiles.shapefiles.districts import CONGRESSIONAL_DISTRICTS
from urbanstats.universe.universe_provider import us_domestic_provider


@permacache("population_density/shapefiles/county_cross_cd_3")
def county_cross_cd():
    cds = CONGRESSIONAL_DISTRICTS.load_file()
    counties = COUNTIES.load_file()
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
    db["shortname"] = db["shortname_1"] + " in " + db["shortname_2"]
    db["longname"] = db["shortname"] + ", USA"
    return db


COUNTY_CROSS_CD = Shapefile(
    hash_key="county_cross_cd_3",
    path=county_cross_cd,
    shortname_extractor=lambda x: x["shortname"],
    longname_extractor=lambda x: x["longname"],
    filter=lambda x: True,
    meta=dict(type="County Cross CD", source="Census", type_category="Political"),
    chunk_size=100,
    universe_provider=us_domestic_provider(),
)
