import pandas as pd

from urbanstats.geometry.historical_counties.compute_suos import current_suos
from urbanstats.geometry.historical_counties.historical_county_file import (
    counties_at_date,
)
from urbanstats.geometry.historical_counties.suo_data_source import SUODataSource


def counties_at_time():
    _, _, suo_to_pop, _ = current_suos()
    df = counties_at_date("2019-03-01").copy()
    df["population"] = df.suos.apply(lambda x: suo_to_pop[x].sum())
    fips_to_pop = dict(zip(df.FIPS, df.population))
    fips_to_suos = dict(zip(df.FIPS, df.suos))
    return fips_to_pop, fips_to_suos


def life_expectancy_data(year):
    assert year in [
        2014,
        2015,
        2016,
        2017,
        2018,
        2019,
    ], "Data only available for 2014-2019"
    ihme = pd.read_csv(
        "./named_region_shapefiles/IHME_USA_HEALTH_CARE_PREFORMANCE_COUNTY_2014_2019_Y2025M08D22.CSV"
    )
    ihme["fips"] = ihme.fips.astype(str).str.zfill(5)
    ihme = ihme[ihme.year_id == 2019].copy()
    return ihme


def life_expectancy_to_aggregate(year):
    ihme = life_expectancy_data(year)
    fips_to_pop, fips_to_suos = counties_at_time()
    assert set(ihme.fips) == set(fips_to_pop)
    ihme["population"] = ihme.fips.map(fips_to_pop)
    ihme["suos"] = ihme.fips.map(fips_to_suos)
    ihme["performance_score_adj_to_agg"] = ihme.performance_score_adj * ihme.population
    ihme["life_expectancy_to_agg"] = ihme.life_expectancy_at_birth * ihme.population
    return ihme


ihme_2019 = SUODataSource(
    "imhe_2019",
    lambda: life_expectancy_to_aggregate(2019),
    ["performance_score_adj_to_agg", "life_expectancy_to_agg"],
)
