from datetime import date, datetime

import numpy as np

# copied from https://stackoverflow.com/a/28688724/1549476
Y = 2000  # dummy leap year to allow input X-02-29 (leap day)
seasons = [
    ("winter", (date(Y, 1, 1), date(Y, 3, 20))),
    ("spring", (date(Y, 3, 21), date(Y, 6, 20))),
    ("summer", (date(Y, 6, 21), date(Y, 9, 22))),
    ("fall", (date(Y, 9, 23), date(Y, 12, 20))),
    ("winter", (date(Y, 12, 21), date(Y, 12, 31))),
]


def get_season(date_obj):
    if isinstance(date_obj, datetime):
        date_obj = date_obj.date()
    date_obj = date_obj.replace(year=Y)
    return next(season for season, (start, end) in seasons if start <= date_obj <= end)


def f_to_k(f):
    return (f - 32) * 5 / 9 + 273.15


def k_to_f(k):
    return (k - 273.15) * 9 / 5 + 32


def compute_relative_humidity(temp_k, dew_temp_k):
    # https://bmcnoldy.earth.miami.edu/Humidity.html
    temp_c = temp_k - 273.15
    dew_temp_c = dew_temp_k - 273.15
    rh = 100 * (
        np.exp((17.625 * dew_temp_c) / (243.04 + dew_temp_c))
        / np.exp((17.625 * temp_c) / (243.04 + temp_c))
    )
    rh = np.clip(rh, 0, 100)
    return rh


def compute_heat_index(temp_k, dew_temp_k):
    # https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml
    # The computation of the heat index is a refinement of a result
    # obtained by multiple regression analysis carried out by Lans P.
    # Rothfusz and described in a 1990 National Weather Service
    # (NWS) Technical Attachment (SR 90-23).  The regression equation
    # of Rothfusz is

    temp_f = k_to_f(temp_k)
    rh = compute_relative_humidity(temp_k, dew_temp_k)

    hi = (
        -42.379
        + 2.04901523 * temp_f
        + 10.14333127 * rh
        - 0.22475541 * temp_f * rh
        - 0.00683783 * temp_f * temp_f
        - 0.05481717 * rh * rh
        + 0.00122874 * temp_f * temp_f * rh
        + 0.00085282 * temp_f * rh * rh
        - 0.00000199 * temp_f * temp_f * rh * rh
    )

    # where T is temperature in degrees F and RH is relative humidity
    # in percent.  HI is the heat index expressed as an apparent
    # temperature in degrees F.  If the RH is less than 13% and the
    # temperature is between 80 and 112 degrees F, then the following
    # adjustment is subtracted from HI:

    adjustment_1 = ((13 - rh) / 4) * np.sqrt((17 - np.abs(temp_f - 95.0)) / 17)
    mask_1 = (rh < 13) & (temp_f >= 80) & (temp_f <= 112)
    hi[mask_1] -= adjustment_1[mask_1]

    # where ABS and SQRT are the absolute value and square root functions,
    # respectively.  On the other hand, if the RH is greater than 85% and
    # the temperature is between 80 and 87 degrees F, then the following
    # adjustment is added to HI:

    adjustment_2 = ((rh - 85) / 10) * ((87 - temp_f) / 5)
    mask = (rh > 85) & (temp_f >= 80) & (temp_f <= 87)
    hi[mask] += adjustment_2[mask]

    # The Rothfusz regression is not appropriate when conditions of
    # temperature and humidity warrant a heat index value below
    # about 80 degrees F. In those cases, a simpler formula is
    # applied to calculate values consistent with Steadman's results:

    hi_2 = 0.5 * (temp_f + 61.0 + ((temp_f - 68.0) * 1.2) + (rh * 0.094))

    # In practice, the simple formula is computed first and the result averaged
    # with the temperature. If this heat index value is 80 degrees F or higher,
    # the full regression equation along with any adjustment as described above is applied.

    hi_2[hi_2 >= 80] = hi[hi_2 >= 80]
    return hi_2
