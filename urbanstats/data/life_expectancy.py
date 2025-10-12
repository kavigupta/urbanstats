
import pandas as pd

def life_expectancy_data(year):
    assert year in [2014, 2015, 2016, 2017, 2018, 2019], "Data only available for 2014-2019"
    imhe = pd.read_csv(
    "./named_region_shapefiles/IHME_USA_HEALTH_CARE_PREFORMANCE_COUNTY_2014_2019_Y2025M08D22.CSV"
    )
    imhe["fips"] = imhe.fips.astype(str).str.zfill(5)
    imhe = imhe[imhe.year_id == 2019].copy()
    return imhe