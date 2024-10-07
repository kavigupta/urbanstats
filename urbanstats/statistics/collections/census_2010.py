from permacache import permacache

from census_blocks import RADII, all_densities_gpd, housing_units, racial_demographics
from urbanstats.geometry.census_aggregation import aggregate_by_census_block
from urbanstats.statistics.extra_statistics import HistogramSpec
from urbanstats.statistics.statistic_collection import (
    ORDER_CATEGORY_MAIN,
    ORDER_CATEGORY_OTHER_DENSITIES,
    CensusStatisticsColection,
)

from .census_basics import DENSITY_EXPLANATION_PW, CensusBasics, ad
from .race_census import RaceCensus


class CensusForPreviousYear(CensusStatisticsColection):
    def name_for_each_statistic(self):
        year = self.year()
        ad_for_year = {f"{k}_{year}": f"{v} ({year})" for k, v in ad.items()}
        ad_change = {
            f"{k}_change_{year}": f"{v} Change ({year}-2020)" for k, v in ad.items()
        }

        return {
            f"population_{year}": f"Population ({year})",
            f"population_change_{year}": f"Population Change ({year}-2020)",
            **{f"ad_1_{year}": ad_for_year[f"ad_1_{year}"]},
            **{f"ad_1_change_{year}": ad_change[f"ad_1_change_{year}"]},
            f"sd_{year}": f"AW Density ({year})",
            **{
                f"{k}_{year}": f"{v} ({year})"
                for k, v in RaceCensus().name_for_each_statistic().items()
            },
            f"housing_per_pop_{year}": f"Housing Units per Adult ({year})",
            f"vacancy_{year}": f"Vacancy % ({year})",
            **{k: ad_for_year[k] for k in ad_for_year if k != f"ad_1_{year}"},
            **{k: ad_change[k] for k in ad_change if k != f"ad_1_change_{year}"},
        }

    def order_category_for_each_statistic(self):
        return CensusBasics.order_category_for_each_statistic(self)

    def category_for_each_statistic(self):
        def parent_category(k):
            if k.startswith("population") or k.startswith("sd") or k.startswith("ad_1"):
                return "main"
            if k.startswith("ad_"):
                return "other_densities"
            if k.startswith("housing_per_pop") or k.startswith("vacancy"):
                return "housing"
            if any(k.startswith(x) for x in racial_demographics):
                return "race"
            raise ValueError(f"unknown category for {k}")
            
        return {k: (parent_category(k), str(self.year())) for k in self.name_for_each_statistic()}

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name(str(self.year()))

    def quiz_question_names(self):
        year = self.year()
        return {
            f"population_change_{year}": f"higher % increase in population from {year} to 2020",
            f"ad_1_change_{year}": f"higher % increase in population-weighted density (r=1km) from {year} to 2020"
            + DENSITY_EXPLANATION_PW,
        }

    def quiz_question_unused(self):
        year = self.year()
        return [
            f"{x}_{year}"
            for x in [
                "ad_0.5_change",
                "ad_4_change",
                "ad_0.25_change",
                "ad_2_change",
                # direct copy of the 2020 statistics_tables
                "population",
                "sd",
                "ad_0.25",
                "ad_0.5",
                "ad_1",
                "ad_2",
                "ad_4",
                "housing_per_pop",
                "asian",
                "other / mixed",
                "native",
                "white",
                "vacancy",
                "hispanic",
                "black",
                "hawaiian_pi",
            ]
        ]

    def compute_statistics(self, shapefile, statistics_table, shapefile_table):
        table = aggregate_basics_of_year(shapefile, self.year())
        for k in table:
            statistics_table[k] = table[k]

        self.mutate_statistic_table(statistics_table, shapefile_table)

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        from census_blocks import racial_demographics
        from stats_for_shapefile import density_metrics

        year = self.year()

        statistics_table[f"population_change_{year}"] = (
            statistics_table["population"] - statistics_table[f"population_{year}"]
        ) / statistics_table[f"population_{year}"]
        for k in density_metrics:
            statistics_table[f"{k}_{year}"] /= statistics_table[f"population_{year}"]
            statistics_table[f"{k}_change_{year}"] = (
                statistics_table[k] - statistics_table[f"{k}_{year}"]
            ) / statistics_table[f"{k}_{year}"]
        statistics_table[f"sd_{year}"] = (
            statistics_table[f"population_{year}"] / statistics_table["area"]
        )
        for k in racial_demographics:
            statistics_table[f"{k}_{year}"] /= statistics_table[f"population_{year}"]
        statistics_table[f"other / mixed_{year}"] = (
            statistics_table[f"other_{year}"] + statistics_table[f"mixed_{year}"]
        )
        del statistics_table[f"other_{year}"]
        del statistics_table[f"mixed_{year}"]
        statistics_table[f"housing_per_pop_{year}"] = (
            statistics_table[f"total_{year}"]
            / statistics_table[f"population_18_{year}"]
        )
        statistics_table[f"vacancy_{year}"] = (
            statistics_table[f"vacant_{year}"] / statistics_table[f"total_{year}"]
        )

        del statistics_table[f"vacant_{year}"]
        del statistics_table[f"total_{year}"]
        del statistics_table[f"occupied_{year}"]

    def extra_stats(self):
        year = self.year()
        return {
            f"ad_{d}_{year}": HistogramSpec(
                0, 0.1, f"pw_density_histogram_{d}_{year}", "population"
            )
            for d in RADII
        }


class Census2010(CensusForPreviousYear):
    version = 2
    def year(self):
        return 2010


@permacache(
    "urbanstats/statistics/collections/aggregate_basics_of_year",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def aggregate_basics_of_year(shapefile, year):
    from stats_for_shapefile import density_metrics

    print("aggregating basics of", year, "for", shapefile.hash_key)
    sum_keys = [
        "population",
        "population_18",
        *[f"{k}" for k in racial_demographics],
        *[f"{k}" for k in housing_units],
        *[f"{k}" for k in density_metrics],
    ]
    sum_keys = [f"{k}_{year}" for k in sum_keys]
    t = all_densities_gpd(year).copy()
    t.columns = [f"{k}_{year}" for k in t.columns]
    return aggregate_by_census_block(year, shapefile, t[sum_keys])
