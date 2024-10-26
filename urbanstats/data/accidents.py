import io
import zipfile

import geopandas as gpd
import numpy as np
import pandas as pd
import requests
import tqdm.auto as tqdm
from permacache import permacache

accident_years = list(range(2010, 2022 + 1))

car_occupant = {
    "Driver of a Motor Vehicle In-Transport",
    "Occupant of a Motor Vehicle Not In- Transport",
    "Passenger of a Motor Vehicle In-Transport",
    "Unknown Occupant Type in a Motor Vehicle In- Transport",
}
pedestrian_plus = {
    "Bicyclist",
    "Other Cyclist",
    "Other Pedalcyclist",
    "Pedestrian",
    "Person In/On a Building",
    "Persons In/On Buildings",
    "Unknown Type of Non-Motorist",
    "Person on a Personal Conveyance",
    "Person on Personal Conveyances",
    "Persons on Personal Conveyances",
    "Person on Motorized Personal Conveyance",
    "Person on Non-Motorized Personal Conveyance",
    "Person on Personal Conveyance, Unknown if Motorized or Non-Motorized",
    "Occupant of a Non-Motor Vehicle Transport Device",
}


def is_pedestrian_plus(x):
    assert (x in car_occupant) != (x in pedestrian_plus), x
    return x in pedestrian_plus


@permacache("urbanstats/data/accidents/accidents_dataframe_for_year_3")
def accidents_dataframe_for_year(year):
    acc = pull_data(year, "accident")
    p = pedestrian_fatalities_by_case(year)
    acc["pedestrian_plus"] = np.array(p[acc.ST_CASE])
    latitude = [x for x in acc.columns if x.lower() == "latitude"]
    longitud = [x for x in acc.columns if x.lower() == "longitud"]
    assert len(latitude) == 1, acc.columns
    assert len(longitud) == 1, acc.columns
    return gpd.GeoDataFrame(
        dict(
            fatals=acc["FATALS"],
            fatals_pedestrian_plus=acc["pedestrian_plus"],
            geometry=gpd.points_from_xy(acc[longitud[0]], acc[latitude[0]]),
        ),
        crs="EPSG:4326",
    )


def pedestrian_fatalities_by_case(year):
    p = pull_data(year, "person.csv")
    # 4 is "Fatal Injury (K)"
    p = p[p.INJ_SEV == 4]
    type_key = "PER_TYPNAME"
    if type_key not in p.columns:
        assert 2010 <= year <= 2019
        p[type_key] = p.PER_TYP.map(
            {
                1: "Driver of a Motor Vehicle In-Transport",
                2: "Passenger of a Motor Vehicle In-Transport",
                3: "Occupant of a Motor Vehicle Not In- Transport",
                4: "Occupant of a Non-Motor Vehicle Transport Device",
                5: "Pedestrian",
                6: "Bicyclist",
                7: "Other Cyclist",
                8: "Person on a Personal Conveyance",
                9: "Unknown Occupant Type in a Motor Vehicle In- Transport",
                10: "Person In/On a Building",
                19: "Unknown Type of Non-Motorist",
            }
        )
    p["pedestrian_plus"] = p[type_key].apply(is_pedestrian_plus)
    return p.groupby("ST_CASE").sum().pedestrian_plus


def pull_data(year, substr):
    f = io.BytesIO(
        requests.get(
            f"https://static.nhtsa.gov/nhtsa/downloads/FARS/{year}/National/FARS{year}NationalCSV.zip"
        ).content
    )
    f = zipfile.ZipFile(f)
    paths = [x for x in f.namelist() if substr in x.lower()]
    if len(paths) == 1:
        accident_path = paths[0]
    else:
        raise ValueError(f"Could not find {substr} file in {paths}")
    acc = pd.read_csv(f.open(accident_path), encoding="latin-1")
    return acc


@permacache(
    "urbanstats/data/accidents/accidents_by_region_4",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def accidents_by_region(shapefile, years=accident_years):
    sf = shapefile.load_file().reset_index(drop=True)
    result = {}
    for year in tqdm.tqdm(years, desc="aggregating accidents"):
        joined = gpd.sjoin(sf[["geometry"]], accidents_dataframe_for_year(year))[
            ["fatals", "fatals_pedestrian_plus"]
        ]
        joined = joined.groupby(joined.index).sum()[
            ["fatals", "fatals_pedestrian_plus"]
        ]
        result[year] = {}
        for col in joined.columns:
            result[year][col] = np.zeros(len(sf))
            result[year][col][joined.index] = joined[col]
    return result
