import os

import numpy as np
from permacache import permacache
import pandas as pd
import geopandas as gpd

POPULATION_COLUMN = 1

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


@permacache("urbanstats/data/canada/load_canada_data_3")
def load_canada_data_da():
    canada = [load_single_canada_data_da(f) for f in census_files]
    canada = pd.concat(canada)
    common_prefix = "2021S0512"
    assert all(canada.index.str.startswith(common_prefix))
    canada.index = [i[len(common_prefix) :] for i in canada.index]
    return canada


@permacache("urbanstats/data/canada/canada_blocks/load_canada_db_shapefile_3")
def load_canada_db_shapefile(year):
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
        .representative_point()
    )
    data_db = gpd.GeoDataFrame(data_db, geometry=list(geometries))
    data_db = data_db.rename(
        columns={"DBtdwell_2021": "total_dwellings", "DBpop_2021": "population"}
    )
    return data_db.reset_index(drop=True)


@permacache("urbanstats/data/canada/load_canada_shapefile_2")
def load_canada_da_shapefile():
    gdf = gpd.read_file("named_region_shapefiles/canada/lda_000b21a_e.zip")
    data = load_canada_data_da()
    extra_stat_rows = set(data.index) - set(gdf.DAUID)
    assert np.isnan(data.loc[list(extra_stat_rows)][POPULATION_COLUMN]).all()
    data = data[[x not in extra_stat_rows for x in data.index]]
    assert set(gdf.DAUID) == set(data.index)
    data = data[data[POPULATION_COLUMN] > 0]
    intpt = (
        gdf.set_index("DAUID")
        .loc[data.index]
        .geometry.to_crs("epsg:4326")
        .representative_point()
    )
    data = gpd.GeoDataFrame(data, geometry=intpt)
    return data.reset_index().rename(columns={"index": "DAUID"})
