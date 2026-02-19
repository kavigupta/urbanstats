import numpy as np

from urbanstats.data.aggregate_gridded_data import disaggregate_gridded_data
from urbanstats.games.quiz_question_metadata import (
    WEATHER,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.extra_statistics import (
    MonthlyTimeSeriesSpec,
    TemperatureHistogramSpec,
)
from urbanstats.statistics.statistic_collection import GeographicStatistics
from urbanstats.weather.era5_global import weather_stats
from urbanstats.weather.utils import k_to_f

MIN_BIN = -40
MAX_BIN = 140
BIN_SIZE = 10

POPULATION_WEIGHTED_EXPLANATION = (
    "!TOOLTIP Population weighted weather"
    " statistics are calculated by computing the weather statistic for"
    " each person in the region and then averaging the results."
)


class GlobalWeatherStatistics(GeographicStatistics):
    version = 5

    def name_for_each_statistic(self):
        return {
            "mean_high_temp_4": "Mean high temp",
            "mean_low_temp": "Mean low temp",
            "mean_high_heat_index_4": "Mean high heat index",
            "mean_high_dewpoint_4": "Mean high dewpt",
            "days_above_90_4": "High temperature Above 90°F %",
            "days_between_40_and_90_4": "High temperature Between 40 and 90°F %",
            "days_below_40_4": "High temperature Below 40°F %",
            "days_dewpoint_70_inf_4": "Humid days (dewpt > 70°F) %",
            "days_dewpoint_50_70_4": "Non-humid, Non-dry days (50°F < dewpt < 70°F) %",
            "days_dewpoint_-inf_50_4": "Dry days (dewpt < 50°F) %",
            "hours_sunny_4": "Mean sunny hours",
            "rainfall_4": "Rainfall",
            "snowfall_4": "Snowfall [rain-equivalent]",
            "wind_speed_over_10mph_4": "High windspeed (>10mph) days %",
            "mean_high_temp_summer_4": "Mean high temperature in summer",
            "mean_high_temp_winter_4": "Mean high temperature in winter",
            "mean_high_temp_fall_4": "Mean high temperature in fall",
            "mean_high_temp_spring_4": "Mean high temperature in spring",
            "mean_high_temp_djf": "Mean high temperature in Dec/Jan/Feb",
            "mean_high_temp_mam": "Mean high temperature in Mar/Apr/May",
            "mean_high_temp_jja": "Mean high temperature in Jun/Jul/Aug",
            "mean_high_temp_son": "Mean high temperature in Sep/Oct/Nov",
            "mean_low_temp_djf": "Mean low temperature in Dec/Jan/Feb",
            "mean_low_temp_mam": "Mean low temperature in Mar/Apr/May",
            "mean_low_temp_jja": "Mean low temperature in Jun/Jul/Aug",
            "mean_low_temp_son": "Mean low temperature in Sep/Oct/Nov",
        }

    def legacy_statistic_names(self):
        return {
            "Non-humid days (50°F < dewpt < 70°F) %": "Non-humid, Non-dry days (50°F < dewpt < 70°F) %",
        }

    def varname_for_each_statistic(self):
        return {
            "mean_high_temp_4": "high_temp",
            "mean_low_temp": "low_temp",
            "mean_high_temp_winter_4": "high_temp_winter",
            "mean_high_temp_spring_4": "high_temp_spring",
            "mean_high_temp_summer_4": "high_temp_summer",
            "mean_high_temp_fall_4": "high_temp_fall",
            "mean_high_heat_index_4": "high_heat_index",
            "mean_high_dewpoint_4": "high_dewpoint",
            "days_dewpoint_70_inf_4": "humid_days",
            "days_dewpoint_50_70_4": "moderate_humidity_days",
            "days_dewpoint_-inf_50_4": "dry_days",
            "days_above_90_4": "hot_days",
            "days_below_40_4": "cold_days",
            "days_between_40_and_90_4": "moderate_temp_days",
            "wind_speed_over_10mph_4": "windy_days",
            "snowfall_4": "snowfall",
            "rainfall_4": "rainfall",
            "hours_sunny_4": "sunny_hours",
            "mean_high_temp_djf": "high_temp_djf",
            "mean_high_temp_mam": "high_temp_mam",
            "mean_high_temp_jja": "high_temp_jja",
            "mean_high_temp_son": "high_temp_son",
            "mean_low_temp_djf": "low_temp_djf",
            "mean_low_temp_mam": "low_temp_mam",
            "mean_low_temp_jja": "low_temp_jja",
            "mean_low_temp_son": "low_temp_son",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("weather")

    def deprecation_for_each_statistic(self):
        result = self.same_for_each_name(None)
        vname = self.varname_for_each_statistic()
        nname = self.name_for_each_statistic()
        replaced_by = {
            "mean_high_temp_winter_4": "mean_high_temp_djf",
            "mean_high_temp_spring_4": "mean_high_temp_mam",
            "mean_high_temp_summer_4": "mean_high_temp_jja",
            "mean_high_temp_fall_4": "mean_high_temp_son",
        }
        for old, new in replaced_by.items():
            result[old] = (
                f"Use {vname[new]} ({nname[new]}) instead,"
                " which uses month-based seasons instead and is valid in the southern hemisphere"
            )
        return result

    def quiz_question_descriptors(self):
        shortnames = {
            "mean_high_temp_4": "higher mean daily high temperature (population weighted)",
            "mean_high_temp_djf": "higher mean daily high temperature in Dec/Jan/Feb (population weighted)",
            "mean_high_temp_mam": "higher mean daily high temperature in Mar/Apr/May (population weighted)",
            "mean_high_temp_jja": "higher mean daily high temperature in Jun/Jul/Aug (population weighted)",
            "mean_high_temp_son": "higher mean daily high temperature in Sep/Oct/Nov (population weighted)",
            "mean_high_heat_index_4": "higher mean daily high heat index (population weighted)",
            # "mean_high_dewpoint_4": "more humid (higher mean daily high dewpoint, population weighted)",
            # "days_dewpoint_70_inf_4": "higher % of humid days (days with dewpoint over 70°F, population weighted)",
            # "days_dewpoint_-inf_50_4": "higher % of dry days (days with dewpoint under 50°F, population weighted)",
            "days_above_90_4": "higher % of hot days (days with high temp over 90°F, population weighted)",
            "days_below_40_4": "higher % of cold days (days with high temp under 40°F, population weighted)",
            "wind_speed_over_10mph_4": "higher % of days with wind speed over 10mph (population weighted)",
            "snowfall_4": "higher snowfall (population weighted)",
            "rainfall_4": "higher rainfall (population weighted)",
            "hours_sunny_4": "!FULL Which has more hours of sun per day on average? (population weighted)",
        }
        return {
            **QuizQuestionDescriptor.several(
                WEATHER,
                {k: v + POPULATION_WEIGHTED_EXPLANATION for k, v in shortnames.items()},
                {
                    "mean_high_temp_4": 0.075,
                    "mean_high_temp_djf": 0.075,
                    "mean_high_temp_mam": 0.075,
                    "mean_high_temp_jja": 0.075,
                    "mean_high_temp_son": 0.075,
                },
            ),
            **QuizQuestionSkip.several(
                # deprecated
                "mean_high_temp_winter_4",
                "mean_high_temp_spring_4",
                "mean_high_temp_summer_4",
                "mean_high_temp_fall_4",
                # low temps
                "mean_low_temp",
                "mean_low_temp_djf",
                "mean_low_temp_mam",
                "mean_low_temp_jja",
                "mean_low_temp_son",
                # middle / obscure
                "days_dewpoint_50_70_4",
                "days_between_40_and_90_4",
                "mean_high_dewpoint_4",
                "days_dewpoint_70_inf_4",
                "days_dewpoint_-inf_50_4",
            ),
        }

    def dependencies(self):
        return ["population"]

    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        result = disaggregate_gridded_data(
            gridded_data_sources=weather_stats,
            shapefile=shapefile,
            existing_statistics=existing_statistics,
            shapefile_table=shapefile_table,
        )
        result = {k: np.array(v) for k, v in result.items()}
        actual_result = {
            "mean_high_temp_4": k_to_f(result["maxdaily_temp"]),
            "mean_low_temp": k_to_f(result["mindaily_temp"]),
            "mean_high_temp_winter_4": k_to_f(result["maxdaily_temp_seasonal_astro_1"]),
            "mean_high_temp_spring_4": k_to_f(result["maxdaily_temp_seasonal_astro_2"]),
            "mean_high_temp_summer_4": k_to_f(result["maxdaily_temp_seasonal_astro_3"]),
            "mean_high_temp_fall_4": k_to_f(result["maxdaily_temp_seasonal_astro_4"]),
            "mean_high_temp_djf": k_to_f(result["maxdaily_temp_seasonal_month_1"]),
            "mean_high_temp_mam": k_to_f(result["maxdaily_temp_seasonal_month_2"]),
            "mean_high_temp_jja": k_to_f(result["maxdaily_temp_seasonal_month_3"]),
            "mean_high_temp_son": k_to_f(result["maxdaily_temp_seasonal_month_4"]),
            "mean_low_temp_djf": k_to_f(result["mindaily_temp_seasonal_month_1"]),
            "mean_low_temp_mam": k_to_f(result["mindaily_temp_seasonal_month_2"]),
            "mean_low_temp_jja": k_to_f(result["mindaily_temp_seasonal_month_3"]),
            "mean_low_temp_son": k_to_f(result["mindaily_temp_seasonal_month_4"]),
            "mean_high_heat_index_4": k_to_f(result["mean_heat_index"]),
            "mean_high_dewpoint_4": k_to_f(result["mean_high_dewpoint"]),
            "days_dewpoint_70_inf_4": result["high_dewpoint_over_70f"],
            "days_dewpoint_50_70_4": result["high_dewpoint_over_50f"]
            - result["high_dewpoint_over_70f"],
            "days_dewpoint_-inf_50_4": 1 - result["high_dewpoint_over_50f"],
            "days_above_90_4": result["maxdaily_temp_gt_+090"],
            "days_between_40_and_90_4": result["maxdaily_temp_gt_+040"]
            - result["maxdaily_temp_gt_+090"],
            "days_below_40_4": 1 - result["maxdaily_temp_gt_+040"],
            "wind_speed_over_10mph_4": result["windspeed_over_10mph"],
            "snowfall_4": sum(
                result[f"precipitation_snow_{i:02d}"] for i in range(1, 1 + 12)
            ),
            "rainfall_4": sum(
                result[f"precipitation_rain_{i:02d}"] for i in range(1, 1 + 12)
            ),
            "hours_sunny_4": result["sunniness"] * 24 - 0.5,
            "rainfall_by_month": self.columnize(
                [result[f"precipitation_rain_{i:02d}"] for i in range(1, 1 + 12)]
            ),
            "snowfall_by_month": self.columnize(
                [result[f"precipitation_snow_{i:02d}"] for i in range(1, 1 + 12)]
            ),
            "mean_high_temp_by_month": self.columnize(
                [
                    k_to_f(result[f"maxdaily_temp_month_{i:02d}"])
                    for i in range(1, 1 + 12)
                ]
            ),
            "mean_low_temp_by_month": self.columnize(
                [
                    k_to_f(result[f"mindaily_temp_month_{i:02d}"])
                    for i in range(1, 1 + 12)
                ]
            ),
            "high_temp_histogram": self.compute_histogram(result, "maxdaily_temp"),
            "low_temp_histogram": self.compute_histogram(result, "mindaily_temp"),
        }
        assert set(self.internal_statistic_names_list()).issubset(set(actual_result))
        return actual_result

    def columnize(self, lst):
        lst = np.array(lst).T
        return lst.tolist()

    def compute_histogram(self, results, key):
        gts = np.array(
            [results[f"{key}_gt_{i:+04d}"] for i in range(MIN_BIN, MAX_BIN + 1, 10)]
        )
        # pylint: disable=invalid-unary-operand-type
        hist = -np.diff(
            np.concatenate(([np.ones(gts.shape[1])], gts, [np.zeros(gts.shape[1])])),
            axis=0,
        )
        return hist.T.tolist()

    def extra_stats(self):
        return {
            "mean_high_temp_4": TemperatureHistogramSpec(
                min_value=MIN_BIN,
                max_value=MAX_BIN,
                bin_size=BIN_SIZE,
                key="high_temp_histogram",
            ),
            "mean_low_temp": TemperatureHistogramSpec(
                min_value=MIN_BIN,
                max_value=MAX_BIN,
                bin_size=BIN_SIZE,
                key="low_temp_histogram",
            ),
            "rainfall_4": MonthlyTimeSeriesSpec(
                name="Rainfall by month", key="rainfall_by_month"
            ),
            "snowfall_4": MonthlyTimeSeriesSpec(
                name="Snowfall by month", key="snowfall_by_month"
            ),
        }
