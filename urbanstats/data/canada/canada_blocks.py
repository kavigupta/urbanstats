import os
import zipfile

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
    base_dir_by_year = {
        2021: "canada",
        2016: "canada_2016",
        2011: "canada_2011",
    }
    db_csv_by_year = {
        2021: "2021_92-150-X_eng/DB.csv",
        2016: "2016_92-151_XBB_csv.zip",
        2011: "2011_92-151_XBB_xlsx.zip",
    }
    db_zip_by_year = {
        2021: "ldb_000b21a_e.zip",
        2016: "ldb_000a16a_e.zip",
        2011: "gdb_000a11a_e.zip",
    }
    pop_col_by_year = {
        2021: "DBpop_2021",
        2016: "DBpop2016",
        2011: "DBpop2011",
    }
    dwell_col_by_year = {
        2021: "DBtdwell_2021",
        2016: "DBtdwell2016",
        2011: "DBtdwell2011",
    }
    if year not in base_dir_by_year:
        raise ValueError(f"Unsupported Canada census year: {year}")
    base_dir = os.path.join("named_region_shapefiles", base_dir_by_year[year])
    db_csv_path = os.path.join(base_dir, db_csv_by_year[year])
    if db_csv_path.endswith("_xlsx.zip"):
        with zipfile.ZipFile(db_csv_path, "r") as zf:
            xlsx_name = [n for n in zf.namelist() if n.lower().endswith(".xlsx")][0]
            table_by_block = pd.read_excel(
                zf.open(xlsx_name),
                header=None,
                usecols=[0, 1, 2],
            )
        table_by_block.columns = ["DBuid", "DBpop2011", "DBtdwell2011"]
    elif db_csv_path.endswith(".zip"):
        with zipfile.ZipFile(db_csv_path, "r") as zf:
            csv_name = [n for n in zf.namelist() if n.lower().endswith(".csv")][0]
            table_by_block = pd.read_csv(
                zf.open(csv_name),
                encoding="latin-1",
            )
        table_by_block = table_by_block.rename(
            columns=lambda c: c.strip().split("/")[0]
        )
    else:
        table_by_block = pd.read_csv(db_csv_path)
    pop_col = pop_col_by_year[year]
    dwell_col = dwell_col_by_year[year]
    data_db = table_by_block[["DBuid", pop_col, dwell_col]]
    for col in (pop_col, dwell_col):
        data_db[col] = pd.to_numeric(data_db[col], errors="coerce")
    data_db = data_db[data_db[pop_col] > 0]
    if year == 2021:
        # not sure why these are missing but they have a total population of 10
        # so who cares
        missing_geographies = [10020079053, 59430125042]
        assert list(
            data_db.set_index("DBuid").loc[missing_geographies][pop_col]
        ) == [
            5,
            5,
        ]
        data_db = data_db[data_db.DBuid.apply(lambda x: x not in missing_geographies)]
    gdf = gpd.read_file(os.path.join(base_dir, db_zip_by_year[year]))
    geometries = (
        gdf.set_index("DBUID")
        .loc[data_db.DBuid.apply(str)]
        .geometry.to_crs("epsg:4326")
    )
    if pointify:
        geometries = geometries.representative_point()
    data_db = gpd.GeoDataFrame(data_db, geometry=list(geometries))
    data_db = data_db.rename(
        columns={dwell_col: "total_dwellings", pop_col: "population"}
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
