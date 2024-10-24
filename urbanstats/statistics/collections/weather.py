import pandas as pd
from permacache import permacache
from census_blocks import all_densities_gpd
from urbanstats.geometry.census_aggregation import aggregate_by_census_block
from urbanstats.statistics.statistic_collection import USWeatherStatisticsCollection
from urbanstats.weather.stats import era5_statistics
from urbanstats.weather.to_blocks import weather_block_statistics

POPULATION_WEIGHTED_EXPLANATION = (
    "!TOOLTIP Population weighted weather"
    " statistics are calculated by computing the weather statistic for"
    " each person in the region and then averaging the results."
)


class USWeatherStatistics(USWeatherStatisticsCollection):
    version = 3

    def name_for_each_statistic(self):
        return {k: stat.display_name for k, stat in era5_statistics.items()}

    def category_for_each_statistic(self):
        return self.same_for_each_name("weather")

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("weather")

    def quiz_question_names(self):
        shortnames = {
            "mean_high_temp_4": "higher mean daily high temperature (population weighted)",
            "mean_high_temp_winter_4": "higher mean daily high temperature in winter (population weighted)",
            "mean_high_temp_spring_4": "higher mean daily high temperature in spring (population weighted)",
            "mean_high_temp_summer_4": "higher mean daily high temperature in summer (population weighted)",
            "mean_high_temp_fall_4": "higher mean daily high temperature in fall (population weighted)",
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
        return {k: v + POPULATION_WEIGHTED_EXPLANATION for k, v in shortnames.items()}

    def quiz_question_unused(self):
        return [
            # middle / obscure
            "days_dewpoint_50_70_4",
            "days_between_40_and_90_4",
            "mean_high_dewpoint_4",
            "days_dewpoint_70_inf_4",
            "days_dewpoint_-inf_50_4",
        ]

    def compute_statistics(self, shapefile, statistics_table, shapefile_table):
        by_region = weather_by_region(shapefile)
        for weather_stat in self.name_for_each_statistic():
            statistics_table[weather_stat] = by_region[weather_stat]

        self.mutate_statistic_table(statistics_table, shapefile_table)

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        for weather_stat in self.name_for_each_statistic():
            statistics_table[weather_stat] = (
                statistics_table[weather_stat] / statistics_table["population"]
            )


@permacache(
    "urbanstats/statistics/collections/weather/weather_by_region",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def weather_by_region(shapefile):
    popu = all_densities_gpd().population

    weather_block = weather_block_statistics()
    result = {}
    for k in weather_block:
        result[k] = weather_block[k] * popu

    return aggregate_by_census_block(2020, shapefile, pd.DataFrame(result))
