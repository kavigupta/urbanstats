import io
import requests
import zipfile

import pandas as pd
import geopandas as gpd

from permacache import permacache
import tqdm.auto as tqdm

accident_years = list(range(2010, 2022 + 1))


@permacache("urbanstats/data/accidents/accidents_dataframe_for_year_1")
def accidents_dataframe_for_year(year):
    f = io.BytesIO(
        requests.get(
            f"https://static.nhtsa.gov/nhtsa/downloads/FARS/{year}/National/FARS{year}NationalCSV.zip"
        ).content
    )
    f = zipfile.ZipFile(f)
    paths = [x for x in f.namelist() if "accident" in x.lower()]
    if len(paths) == 1:
        accident_path = paths[0]
    else:
        raise ValueError(f"Could not find accident file in {paths}")
    acc = pd.read_csv(f.open(accident_path), encoding="latin-1")
    latitude = [x for x in acc.columns if x.lower() == "latitude"]
    longitud = [x for x in acc.columns if x.lower() == "longitud"]
    assert len(latitude) == 1, acc.columns
    assert len(longitud) == 1, acc.columns
    return gpd.GeoDataFrame(
        dict(
            fatals=acc["FATALS"],
            geometry=gpd.points_from_xy(acc[longitud[0]], acc[latitude[0]]),
        ),
        crs="EPSG:4326",
    )


@permacache(
    "urbanstats/data/accidents/accidents_by_region_1",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def accidents_by_region(shapefile, years=accident_years):
    sf = shapefile.load_file().reset_index(drop=True)
    result = {}
    for year in tqdm.tqdm(years, desc="aggregating accidents"):
        joined = gpd.sjoin(sf[["geometry"]], accidents_dataframe_for_year(year))[
            ["fatals"]
        ]
        result[year] = joined.groupby(joined.index).sum().fatals
    return result
