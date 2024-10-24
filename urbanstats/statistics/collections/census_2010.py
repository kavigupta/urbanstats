from abc import abstractmethod
import numpy as np
from permacache import permacache

from urbanstats.data.census_blocks import RADII, all_densities_gpd, housing_units, racial_demographics
from urbanstats.geometry.census_aggregation import aggregate_by_census_block
from urbanstats.statistics.extra_statistics import HistogramSpec
from urbanstats.statistics.statistic_collection import (
    CensusStatisticsColection
)

from .census_basics import DENSITY_EXPLANATION_PW, CensusBasics, ad
from .race_census import RaceCensus


class CensusForPreviousYear(CensusStatisticsColection):
    @abstractmethod
    def year(self):
        pass

    def include_change(self):
        return True

    def name_for_each_statistic(self):
        year = self.year()
        ad_for_year = {f"{k}_{year}": f"{v} ({year})" for k, v in ad.items()}
        ad_change = {
            f"{k}_change_{year}": f"{v} Change ({year}-2020)" for k, v in ad.items()
        }

        result = {}
        result.update({f"population_{year}": f"Population ({year})"})
        if self.include_change():
            result.update(
                {f"population_change_{year}": f"Population Change ({year}-2020)"}
            )
        result.update(
            {
                **{f"ad_1_{year}": ad_for_year[f"ad_1_{year}"]},
            }
        )
        if self.include_change():
            result.update(
                {
                    **{f"ad_1_change_{year}": ad_change[f"ad_1_change_{year}"]},
                }
            )
        result.update(
            {
                f"sd_{year}": f"AW Density ({year})",
                **{
                    f"{k}_{year}": f"{v} ({year})"
                    for k, v in RaceCensus().name_for_each_statistic().items()
                },
                f"housing_per_pop_{year}": f"Housing Units per Adult ({year})",
                f"vacancy_{year}": f"Vacancy % ({year})",
                **{k: ad_for_year[k] for k in ad_for_year if k != f"ad_1_{year}"},
            }
        )
        if self.include_change():
            result.update(
                {
                    **{
                        k: ad_change[k] for k in ad_change if k != f"ad_1_change_{year}"
                    },
                }
            )
        return result

    def order_category_for_each_statistic(self):
        return CensusBasics.order_category_for_each_statistic(self)

    def category_for_each_statistic(self):
        return self.same_for_each_name(str(self.year()))

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name(str(self.year()))

    def quiz_question_names(self):
        year = self.year()
        assert (
            self.include_change()
        ), "if you overwrite include_change, you must also overwrite quiz_question_names"
        return {
            f"population_change_{year}": f"higher % increase in population from {year} to 2020",
            f"ad_1_change_{year}": f"higher % increase in population-weighted density (r=1km) from {year} to 2020"
            + DENSITY_EXPLANATION_PW,
        }

    def quiz_question_unused(self):
        year = self.year()
        assert (
            self.include_change()
        ), "if you overwrite include_change, you must also overwrite quiz_question_unused"
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
        from urbanstats.data.census_histogram import census_histogram

        year = self.year()
        table = aggregate_basics_of_year(shapefile, year)
        for k in table:
            statistics_table[k] = table[k]

        self.mutate_statistic_table(statistics_table, shapefile_table)

        hists_year = census_histogram(shapefile, year)
        for dens in RADII:
            statistics_table[f"pw_density_histogram_{dens}_{year}"] = [
                hists_year[x][f"ad_{dens}"] if x in hists_year else np.nan
                for x in statistics_table.longname
            ]

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        from stats_for_shapefile import density_metrics

        year = self.year()

        if self.include_change():
            statistics_table[f"population_change_{year}"] = (
                statistics_table["population"] - statistics_table[f"population_{year}"]
            ) / statistics_table[f"population_{year}"]
        for k in density_metrics:
            statistics_table[f"{k}_{year}"] /= statistics_table[f"population_{year}"]
            if self.include_change():
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


class Census2020(CensusForPreviousYear):
    # This isn't actually used for 2020, but it is used to just quickly source the 2020 data
    # for computing other statistics
    version = 0

    def year(self):
        return 2020

    def include_change(self):
        return False

    def quiz_question_names(self):
        # TODO this is a hack to avoid a crash. We need to fix this when we migrate to
        # using this for 2020 data
        return {}

    def quiz_question_unused(self):
        # TODO this is a hack to avoid a crash. We need to fix this when we migrate to
        # using this for 2020 data
        return list(self.name_for_each_statistic().keys())

    def compute_statistics(self, shapefile, statistics_table, shapefile_table):
        super().compute_statistics(shapefile, statistics_table, shapefile_table)
        for k in statistics_table:
            if k.endswith("_2020"):
                statistics_table[k.replace("_2020", "")] = statistics_table[k]
                del statistics_table[k]


class Census2010(CensusForPreviousYear):
    version = 5

    def year(self):
        return 2010


class Census2000(CensusForPreviousYear):
    version = 6

    def year(self):
        return 2000


@permacache(
    "urbanstats/statistics/collections/aggregate_basics_of_year_3",
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


def extract_state_fips_from_geoid(geoid):
    prefix = "7500000US"
    assert geoid.startswith(prefix)
    return geoid[len(prefix) :][:2]


@permacache(
    "urbanstats/statistics/collections/compute_population_for_year_3",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def compute_population_for_year(shapefile, *, no_pr):
    """
    Compute the population for a shapefile for a given year
    """
    t = all_densities_gpd(2020)[["geoid", "population"]].copy()
    if no_pr:
        mask = t.geoid.apply(lambda x: extract_state_fips_from_geoid(x)) == "72"
        t.loc[mask, "population"] = 0
    t = t[["population"]]
    agg = aggregate_by_census_block(2020, shapefile, t)
    return agg["population"]


@permacache(
    "urbanstats/statistics/collections/population_by_year_4",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def population_by_year(shapefile, *, no_pr):
    """
    If no_pr is True, then Puerto Rico is not included in the population statistics
    """
    shapefile_table = shapefile.load_file()
    statistics_table = shapefile_table[["longname"]].copy()
    for year in [2000, 2010, 2020]:
        statistics_table[year] = compute_population_for_year(
            shapefile, no_pr=no_pr
        )
    return statistics_table[[2000, 2010, 2020]]


def compute_population(pop_by_year, year):
    if year in pop_by_year.columns:
        return pop_by_year[year]
    lower = [y for y in pop_by_year.columns if y < year]
    higher = [y for y in pop_by_year.columns if y > year]
    if not lower:
        return pop_by_year[min(higher)]
    if not higher:
        return pop_by_year[max(lower)]
    year_lower, year_higher = max(lower), min(higher)
    pop_before, pop_after = pop_by_year[year_lower], pop_by_year[year_higher]
    coeff_before = (year_higher - year) / (year_higher - year_lower)
    coeff_after = 1 - coeff_before
    return pop_before * coeff_before + pop_after * coeff_after
