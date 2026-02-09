import os

import geopandas as gpd
import numpy as np
import pandas as pd
from permacache import drop_if_equal, permacache

from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle

census_files = [
    "98-401-X2021006_English_CSV_data_Prairies.csv",
    "98-401-X2021006_English_CSV_data_Atlantic.csv",
    "98-401-X2021006_English_CSV_data_Ontario.csv",
    "98-401-X2021006_English_CSV_data_Territories.csv",
    "98-401-X2021006_English_CSV_data_BritishColumbia.csv",
    "98-401-X2021006_English_CSV_data_Quebec.csv",
]


@permacache("urbanstats/data/canada/load_single_canada_data")
def load_single_canada_data_da(census_file):
    canada_census = pd.read_csv(
        os.path.join(
            "named_region_shapefiles/canada",
            census_file,
        ),
        encoding="latin-1",
    )
    canada_census = canada_census[canada_census.GEO_LEVEL == "Dissemination area"]
    canada_census = canada_census[
        [
            "DGUID",
            "ALT_GEO_CODE",
            "GEO_LEVEL",
            "GEO_NAME",
            "CHARACTERISTIC_ID",
            "C1_COUNT_TOTAL",
        ]
    ]
    canada_census = pd.pivot_table(
        canada_census,
        index="DGUID",
        columns="CHARACTERISTIC_ID",
        values="C1_COUNT_TOTAL",
    )
    return canada_census


@permacache_with_remapping_pickle("urbanstats/data/canada/load_canada_data_3")
def load_canada_data_da(year):
    assert year == 2021
    canada = [load_single_canada_data_da(f) for f in census_files]
    canada = pd.concat(canada)
    common_prefix = "2021S0512"
    assert all(canada.index.str.startswith(common_prefix))
    canada.index = [i[len(common_prefix) :] for i in canada.index]
    return canada


@permacache_with_remapping_pickle(
    "urbanstats/data/canada/canada_blocks/load_canada_db_shapefile_4",
    key_function=dict(pointify=drop_if_equal(True)),
)
def load_canada_db_shapefile(year, pointify=True):
    assert year == 2021
    table_by_block = pd.read_csv(
        "named_region_shapefiles/canada/2021_92-150-X_eng/DB.csv"
    )
    data_db = table_by_block[["DBuid", "DBpop_2021", "DBtdwell_2021"]]
    data_db = data_db[data_db.DBpop_2021 > 0]
    # not sure why these are missing but they have a total population of 10
    # so who cares
    missing_geographies = [10020079053, 59430125042]
    assert list(data_db.set_index("DBuid").loc[missing_geographies].DBpop_2021) == [
        5,
        5,
    ]
    data_db = data_db[data_db.DBuid.apply(lambda x: x not in missing_geographies)]
    gdf = gpd.read_file("named_region_shapefiles/canada/ldb_000b21a_e.zip")
    geometries = (
        gdf.set_index("DBUID")
        .loc[data_db.DBuid.apply(str)]
        .geometry.to_crs("epsg:4326")
    )
    if pointify:
        geometries = geometries.representative_point()
    data_db = gpd.GeoDataFrame(data_db, geometry=list(geometries))
    data_db = data_db.rename(
        columns={"DBtdwell_2021": "total_dwellings", "DBpop_2021": "population"}
    )
    return data_db.reset_index(drop=True).set_crs("epsg:4326")


def disaggregated_from_da(year, columns, disagg_universe):
    data_da = load_canada_data_da(year)[columns]
    data_db = load_canada_db_shapefile(year)
    da_id = data_db.DBuid.apply(lambda x: f"{x:011d}"[:8])
    da_total = data_db[disagg_universe].groupby(da_id).sum().loc[da_id]
    frac = np.array(data_db[disagg_universe]) / np.array(da_total)
    diaggregated = data_da.loc[da_id] * frac[:, None]
    return diaggregated
