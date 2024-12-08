import geopandas as gpd
from permacache import permacache

from urbanstats.geometry.shapefiles.load_canada_shapefile import (
    load_canadian_shapefile,
    pruid_to_province_abbr,
)
from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES
from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
    SUBNATIONAL_REGIONS,
)
from urbanstats.universe.universe_provider.constants import canada_domestic_provider

@permacache(
    "urbanstats/geometry/shapefiles/shapefiles/canadian_population_centers/load_pcs_2",
)
def load_pcs():
    data = load_canadian_shapefile(
        "named_region_shapefiles/canada/lpc_000a21a_e.zip",
        COUNTRIES,
        SUBNATIONAL_REGIONS,
    )
    table = []
    for pcuid in sorted(set(data.PCUID)):
        mask = data.PCUID == pcuid
        rows = data[mask]
        [pcname] = set(rows.PCNAME)
        pruids = sorted(set(rows.PRUID))
        dissolve = rows.dissolve().iloc[0]
        table.append(dict(PCNAME=pcname, geometry=dissolve.geometry, PRUID=pruids))

    table = gpd.GeoDataFrame(table)
    st_alexandre = table[table.PCNAME == "Saint-Alexandre"]
    # distance from de-Kamouraska
    dk_idx = st_alexandre.centroid.apply(
        lambda pt: (pt.x - (-69.61943)) ** 2 + (pt.y - 47.68141) ** 2
    ).argmin()
    dk_idx = st_alexandre.index[dk_idx]
    table.loc[dk_idx, "PCNAME"] = "Saint-Alexandre [de-Kamouraska]"
    return table



def shortname_extractor(row):
    return row.PCNAME + " Population Center"


def longname_extractor(row):
    provinces = "-".join([pruid_to_province_abbr[x] for x in row.PRUID])
    return f"{shortname_extractor(row)}, {provinces}, Canada"


CANADIAN_CENSUS_POPULATION_CENTERS = Shapefile(
    hash_key="census_pcs_2",
    path=load_pcs,
    shortname_extractor=shortname_extractor,
    longname_extractor=longname_extractor,
    filter=lambda x: True,
    meta=dict(
        type="CA Population Center",
        source="StatCan",
        type_category="US Subdivision",
    ),
    universe_provider=canada_domestic_provider(),
    subset_masks={"Canada": SelfSubset()},
)
