import calendar
import tempfile
from datetime import datetime

import cdsapi
import numpy as np
import pandas as pd
import shapely
import suncalc
import tqdm
import us
import xarray as xr
from permacache import permacache

from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
    SUBNATIONAL_REGIONS,
)
from urbanstats.weather.global_bounding_boxes import global_bounding_boxes

all_times = [
    "00:00",
    "01:00",
    "02:00",
    "03:00",
    "04:00",
    "05:00",
    "06:00",
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
    "22:00",
    "23:00",
]


def month_counts(year):
    return np.array(
        [calendar.monthrange(int(year), int(month))[1] for month in range(1, 1 + 12)]
    )


def query(bounds, *, time=None, day=None, month=None, year, variables, path):
    if time is None:
        time = all_times
    if day is None:
        day = [f"{x:02d}" for x in range(1, 1 + 31)]
    if month is None:
        month = [f"{x:02d}" for x in range(1, 1 + 12)]
    c = cdsapi.Client()

    c.retrieve(
        "reanalysis-era5-single-levels",
        {
            "product_type": "reanalysis",
            "format": "grib",
            "variable": variables,
            "year": year,
            # "month": ["01"],
            # "day": ["01"],
            "month": month,
            "day": day,
            "time": time,
            "area": [
                # NWSE
                *nwse(bounds)
            ],
        },
        path,
    )


def nwse(bounds):
    w, s, e, n = bounds
    return n + 0.25, w, s, e + 0.25


def light(time, latitude, longitude):
    """
    Returns the fraction of each hour that is light.

    Parameters
    ----------
    time: array-like, a series of numpy datetimes representing hours (T,)
    latitude: array-like, a series of latitudes (LA,)
    longitude: array-like, a series of longitudes (LO,)

    Returns
    -------
    array-like, a series of fractions of each hour that is light (T, LA, LO)
    """
    hour = 60 * 60 * 10**9

    date = np.array(time)

    assert ((date[1:] - date[:-1]).astype(np.int64) == hour).all()

    date, lat, lon = date_grid(latitude, longitude, date)

    azimuth_begin = suncalc.get_position(date, lon, lat)["altitude"]
    azimuth_end = suncalc.get_position(date + hour, lon, lat)["altitude"]
    day = (azimuth_begin > 0) & (azimuth_end > 0)
    sunrise = (azimuth_begin < 0) & (azimuth_end > 0)
    sunset = (azimuth_begin > 0) & (azimuth_end < 0)

    overall = np.zeros(day.shape)
    overall[day] = 1
    overall[sunrise] = azimuth_end[sunrise] / (
        azimuth_end[sunrise] - azimuth_begin[sunrise]
    )
    overall[sunset] = (0 - azimuth_begin[sunset]) / (
        azimuth_end[sunset] - azimuth_begin[sunset]
    )

    return overall


def date_grid(latitude, longitude, date):
    lat = np.array(latitude)
    lon = np.array(longitude)

    ndate = date.shape[0]
    nlat = lat.shape[0]
    nlon = lon.shape[0]

    date = np.repeat(np.repeat(date[:, None, None], nlat, axis=1), nlon, axis=2)
    lat = np.repeat(np.repeat(lat[None, :, None], ndate, axis=0), nlon, axis=2)
    lon = np.repeat(np.repeat(lon[None, None, :], ndate, axis=0), nlat, axis=1)
    return date, lat, lon


def collect_main_statistics(ds):
    num_hours = 24
    time = np.array(ds.time)
    time = time.reshape(-1, num_hours)
    for ts in time:
        assert len({pd.to_datetime(x).date() for x in ts}) == 1

    wind_speed = np.array((ds.u10**2 + ds.v10**2) ** 0.5)
    wind_speed = wind_speed.reshape(-1, num_hours, *wind_speed.shape[1:])
    wind_speed = wind_speed.mean(1)

    cloud_cover = np.array(ds.tcc)
    cloud_cover = cloud_cover.reshape(-1, num_hours, *cloud_cover.shape[1:])
    cloudy = cloud_cover >= 0.5
    light_pct = light(ds.time, ds.latitude, ds.longitude)
    light_pct = light_pct.reshape(-1, num_hours, *light_pct.shape[1:])

    temps = {k: np.array(ds[k]) for k in ["t2m", "d2m"]}
    temps = {k: temps[k].reshape(-1, num_hours, *temps[k].shape[1:]) for k in temps}
    stats = {
        "wind_speed": wind_speed,
    }
    for k in temps:
        stats[f"{k}_max"] = temps[k].max(1)
        stats[f"{k}_min"] = temps[k].min(1)
    stats["non_cloudy_pct"] = (~cloudy).mean(1)
    stats["non_cloudy_sunny_pct"] = (light_pct * (~cloudy)).mean(1)
    return stats


def all_statistics_for_month(bounding_box, year, month):
    main = main_statistics(bounding_box, year, month)
    precip = precipitation_statistics(bounding_box, year, month)
    return {**main, **precip}


@permacache("urbanstats/weather/era5/main_statistics_2", multiprocess_safe=True)
def main_statistics(bounding_box, year, month):
    variables = [
        "10m_u_component_of_wind",
        "10m_v_component_of_wind",
        "2m_dewpoint_temperature",
        "2m_temperature",
        "total_cloud_cover",
    ]
    with tempfile.NamedTemporaryFile() as path:
        query(
            bounding_box, year=year, month=[month], variables=variables, path=path.name
        )
        ds = xr.open_dataset(path.name, engine="cfgrib")
        stats = collect_main_statistics(ds)
    return stats


@permacache(
    "urbanstats/weather/era5/precipitation_statistics_3", multiprocess_safe=True
)
def precipitation_statistics(bounding_box, year, month):
    with tempfile.NamedTemporaryFile() as path:
        query(
            bounding_box,
            month=[month],
            year=year,
            variables=["total_precipitation"],
            path=path.name,
            # time=["06:00", "18:00"],
        )
        ds = xr.load_dataset(path.name, engine="cfgrib")
        total_precip = np.array(ds.tp)

    with tempfile.NamedTemporaryFile() as path:
        query(
            bounding_box,
            month=[month],
            year=year,
            variables=["precipitation_type"],
            path=path.name,
            # time=["06:00", "18:00"],
        )
        ds = xr.load_dataset(path.name, engine="cfgrib")
        precipitation_type = np.array(ds.ptype)

        valid_time = np.array(ds.valid_time)
        month_each = valid_time.astype("datetime64[M]").astype(np.int64) % 12 + 1
        time_mask = month_each == int(month)

    total_precip = total_precip[time_mask]
    precipitation_type = precipitation_type[time_mask]

    assert set(precipitation_type.flatten()) - {0, 1, 3, 5, 6, 7, 8} == set()

    rain = np.zeros_like(total_precip)
    snow = np.zeros_like(total_precip)
    # rain
    rain += (precipitation_type == 1) * total_precip
    # freezing rain
    rain += (precipitation_type == 3) * total_precip
    # snow
    snow += (precipitation_type == 5) * total_precip
    # wet snow
    snow += (precipitation_type == 6) * total_precip
    # mixture of rain and snow
    rain += (precipitation_type == 7) * total_precip * 0.5
    snow += (precipitation_type == 7) * total_precip * 0.5
    # ice pellets
    snow += (precipitation_type == 8) * total_precip

    result = dict(rain=rain, snow=snow)
    result = {k: v.reshape(-1, 24, *v.shape[1:]).sum(1) for k, v in result.items()}
    return result


@permacache("urbanstats/weather/era5/bounding_boxes")
def bounding_boxes():
    shape = SUBNATIONAL_REGIONS.load_file()
    shape = shape[shape[SUBNATIONAL_REGIONS.subset_mask_key("USA")]]
    shape = shape.copy()
    shape["state"] = shape.shortname.apply(us.states.lookup)
    # this is not a singleton comparison, it's a vectorized comparison
    # pylint: disable=singleton-comparison
    shape = shape[shape.state != None]
    shape = shape[
        shape.state.apply(
            lambda x: x in us.states.STATES + [us.states.DC, us.states.PR]
        )
    ]
    continental_us = set(us.states.STATES) - {us.states.AK, us.states.HI}
    continental_us = shape[
        shape.state.apply(lambda x: x in continental_us)
    ].geometry.unary_union.bounds
    hawaii = shape[
        shape.state.apply(lambda x: x == us.states.HI)
    ].geometry.unary_union.bounds
    puerto_rico = shape[
        shape.state.apply(lambda x: x == us.states.PR)
    ].geometry.unary_union.bounds
    ak = shape[shape.state.apply(lambda x: x == us.states.AK)].geometry.unary_union
    ak_west = (
        shapely.geometry.Polygon([(0, 0), (0, 100), (-1000, 100), (-1000, 0)])
        .intersection(ak)
        .bounds
    )
    ak_east = (
        shapely.geometry.Polygon([(0, 0), (0, 100), (1000, 100), (1000, 0)])
        .intersection(ak)
        .bounds
    )
    # [continental_us, hawaii, puerto_rico, ak_west, ak_east]
    return dict(
        continental_us=continental_us,
        hawaii=hawaii,
        puerto_rico=puerto_rico,
        ak_west=ak_west,
        ak_east=ak_east,
    )


def dates_in_month(year, month):
    month = int(month)
    year = int(year)
    assert 1 <= month <= 12
    res = [datetime(year, month, 1)]
    while res[-1].month == month:
        res.append(res[-1] + pd.Timedelta(days=1))
    return res[:-1]


# @permacache("urbanstats/weather/era5/all_results_2", key_function=dict(quiet=None))
def all_results(
    *, bboxes=bounding_boxes, earliest_year=1990, regions=None, quiet=False
):
    if regions is None:
        regions = list(bboxes().keys())
    dates = []
    results = {k: [] for k in regions}
    for year in range(2021, earliest_year - 1, -1):
        for month in range(1, 1 + 12):
            dates_this = dates_in_month(year, month)
            for k in tqdm.tqdm(results, desc=f"{year} {month}"):
                bounds = bboxes()[k]
                if not quiet:
                    print(year, month, k)
                results[k].append(
                    all_statistics_for_month(bounds, str(year), f"{month:02d}")
                )
                for s in results[k][-1]:
                    assert len(results[k][-1][s]) == len(dates_this)
            dates += dates_this
    results_flat = {
        region: {
            stat: np.concatenate([x[stat] for x in for_region], axis=0)
            for stat in for_region[0]
        }
        for region, for_region in results.items()
    }
    return dates, results_flat


if __name__ == "__main__":
    all_results(bboxes=lambda: {k: k for k in global_bounding_boxes()})
