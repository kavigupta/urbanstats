import numpy as np

from .utils import compute_heat_index, f_to_k, k_to_f
from .weather_statistic import ERA5WeatherStatistic, for_season_mask

era5_statistics = []
era5_statistics += [
    ERA5WeatherStatistic(
        "mean_high_temp",
        "Mean high temp",
        lambda dates, weather: k_to_f(weather["t2m_max"].mean(0)),
    )
]

era5_statistics += [
    ERA5WeatherStatistic(
        "mean_high_heat_index",
        "Mean high heat index",
        lambda dates, weather: compute_heat_index(
            weather["t2m_max"], weather["d2m_max"]
        ).mean(0),
    )
]

era5_statistics += [
    ERA5WeatherStatistic(
        "mean_high_dewpoint",
        "Mean high dewpt",
        lambda dates, weather: k_to_f(weather["d2m_max"].mean(0)),
    )
]

temperature_bands = [
    (90, float("inf"), "Above 90"),
    (40, 90, "Between 40 and 90"),
    (-float("inf"), 40, "Below 40"),
]


for low, high, display_name in temperature_bands:
    era5_statistics += [
        ERA5WeatherStatistic(
            f"days_{display_name.lower().replace(' ', '_')}",
            f"High temperature {display_name}°F %",
            lambda dates, weather, low=low, high=high: (
                (weather["t2m_max"] >= f_to_k(low))
                & (weather["t2m_max"] < f_to_k(high))
            ).mean(0),
        )
    ]

dewpoint_bands = [
    (70, float("inf"), "Humid days (dewpt > 70°F) %"),
    (50, 70, "Non-humid days (50°F < dewpt < 70°F) %"),
    (-float("inf"), 50, "Dry days (dewpt < 50°F) %"),
]

for low, high, display_name in dewpoint_bands:
    era5_statistics += [
        ERA5WeatherStatistic(
            f"days_dewpoint_{low}_{high}",
            f"{display_name}",
            lambda dates, weather, low=low, high=high: (
                (weather["d2m_max"] >= f_to_k(low))
                & (weather["d2m_max"] < f_to_k(high))
            ).mean(0),
        )
    ]

era5_statistics += [
    ERA5WeatherStatistic(
        "hours_sunny",
        "Mean sunny hours",
        lambda dates, weather: weather["non_cloudy_sunny_pct"].mean(0) * 24,
    )
]

era5_statistics += [
    ERA5WeatherStatistic(
        "rainfall", "Rainfall", lambda dates, weather: weather["rain"].mean(0) * 365
    )
]
era5_statistics += [
    ERA5WeatherStatistic(
        "snowfall",
        "Snowfall [rain-equivalent]",
        lambda dates, weather: weather["snow"].mean(0) * 365,
    )
]

era5_statistics += [
    ERA5WeatherStatistic(
        "wind_speed_over_10mph",
        "High windspeed (>10mph) days %",
        lambda dates, weather: (weather["wind_speed"] >= 4.4704).mean(0),
    )
]

for season in "summer", "winter", "fall", "spring":
    era5_statistics += [
        ERA5WeatherStatistic(
            f"mean_high_temp_{season}",
            f"Mean high temperature in {season}",
            lambda dates, weather, season=season: k_to_f(
                weather["t2m_max"][for_season_mask(dates, season)].mean(0)
            ),
        )
    ]

era5_statistics = {s.internal_name: s for s in era5_statistics}
