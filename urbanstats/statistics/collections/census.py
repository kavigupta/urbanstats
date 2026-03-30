from abc import abstractmethod

import numpy as np

from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.data.census_blocks import (
    RADII,
    all_densities_gpd,
    format_radius,
    housing_units,
    racial_demographics,
)
from urbanstats.data.census_histogram import census_histogram
from urbanstats.games.quiz_question_metadata import (
    HOUSING,
    POPULATION,
    POPULATION_DENSITY,
    POPULATION_OR_DENSITY_CHANGE,
    RACE,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.geometry.census_aggregation import aggregate_by_census_block
from urbanstats.statistics.extra_statistics import HistogramSpec
from urbanstats.statistics.statistic_collection import USAStatistics

DENSITY_EXPLANATION_PW = (
    "!TOOLTIP Population-weighted density is computed by computing the density"
    " within the given radius for each person in the region and then averaging the results."
    " This is a better measure of the density that people actually experience."
)

race_names = {
    "white": "White %",
    "hispanic": "Hispanic %",
    "black": "Black %",
    "asian": "Asian %",
    "native": "Native %",
    "hawaiian_pi": "Hawaiian / PI %",
    "other / mixed": "Other / Mixed %",
}


ad = {f"ad_{k}": f"PW Density (r={format_radius(k)})" for k in RADII}
density_metrics = [f"ad_{k}" for k in RADII]


class CensusForPreviousYear(USAStatistics):
    @abstractmethod
    def year(self):
        pass

    def ysk(self, key):
        """
        Year suffix for key
        """
        return f"{key}_{self.year()}"

    def ysn(self, name):
        """
        Year suffix for name
        """
        return f"{name} ({self.year()})"

    def name_for_each_statistic(self):
        result = {}
        result.update({"population": "Population"})
        result.update(ad)
        result.update(
            {
                "sd": "AW Density",
                **race_names,
                "housing_per_pop": "Housing Units per Adult",
                "housing_per_person": "Housing Units per Person",
                "vacancy": "Vacancy %",
            }
        )
        return {self.ysk(k): self.ysn(v) for k, v in result.items()}

    def varname_for_each_statistic(self):
        result = {}
        result.update({"population": "population"})
        result.update({f"ad_{k}": f"density_pw_{format_radius(k)}" for k in RADII})
        result.update(
            {
                "sd": "density_aw",
                "white": "white",
                "hispanic": "hispanic",
                "black": "black",
                "asian": "asian",
                "native": "native",
                "hawaiian_pi": "hawaiian_pi",
                "other / mixed": "other_mixed",
                "housing_per_pop": "housing_per_adult",
                "housing_per_person": "housing_per_person",
                "vacancy": "vacancy_rate",
            }
        )
        for_each_stat = {self.ysk(k): self.ysk(v) for k, v in result.items()}
        return for_each_stat

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name(str(self.year()))

    def quiz_question_descriptors(self):
        return {k: QuizQuestionSkip() for k in self.internal_statistic_names_list()}

    def dependencies(self):
        return ["area"]

    def compute_statistics_dictionary_usa(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        statistics_table = {}
        year = self.year()
        table = aggregate_basics_of_year(shapefile, year)
        for k in table:
            suffix = f"_{year}"
            assert k.endswith(suffix)
            k_fixed = self.ysk(k[: -len(suffix)])

            statistics_table[k_fixed] = table[k]

        for k in density_metrics:
            statistics_table[self.ysk(k)] /= statistics_table[self.ysk("population")]
        statistics_table[self.ysk("sd")] = (
            statistics_table[self.ysk("population")] / existing_statistics["area"]
        )
        for k in racial_demographics:
            statistics_table[self.ysk(k)] /= statistics_table[self.ysk("population")]
        statistics_table[self.ysk("other / mixed")] = (
            statistics_table[self.ysk("other")] + statistics_table[self.ysk("mixed")]
        )
        del statistics_table[self.ysk("other")]
        del statistics_table[self.ysk("mixed")]
        statistics_table[self.ysk("housing_per_pop")] = (
            statistics_table[self.ysk("total")]
            / statistics_table[self.ysk("population_18")]
        )
        statistics_table[self.ysk("housing_per_person")] = (
            statistics_table[self.ysk("total")]
            / statistics_table[self.ysk("population")]
        )
        statistics_table[self.ysk("vacancy")] = (
            statistics_table[self.ysk("vacant")] / statistics_table[self.ysk("total")]
        )

        del statistics_table[self.ysk("vacant")]
        del statistics_table[self.ysk("total")]
        del statistics_table[self.ysk("occupied")]

        hists_year = census_histogram(shapefile, year)
        for dens in RADII:
            statistics_table[self.ysk(f"pw_density_histogram_{dens}")] = [
                hists_year[x][f"ad_{dens}"] if x in hists_year else np.nan
                for x in shapefile_table.longname
            ]
        return statistics_table

    def extra_stats(self):
        return {
            self.ysk(f"ad_{d}"): HistogramSpec(
                0, 0.1, self.ysk(f"pw_density_histogram_{d}"), "population"
            )
            for d in RADII
        }


class CensusChange(USAStatistics):
    @abstractmethod
    def year(self):
        pass

    def name_for_each_statistic(self):
        year = self.year()
        ad_change = {
            f"{k}_change_{year}": f"{v} Change ({year}-2020)" for k, v in ad.items()
        }

        result = {}
        result.update({f"population_change_{year}": f"Population Change ({year}-2020)"})
        result.update({f"ad_1_change_{year}": ad_change[f"ad_1_change_{year}"]})
        result.update(
            {k: ad_change[k] for k in ad_change if k != f"ad_1_change_{year}"}
        )
        return result

    def varname_for_each_statistic(self):
        year = self.year()
        result = {}
        result.update({f"population_change_{year}": f"population_change_{year}_2020"})
        result.update(
            {
                f"ad_{k}_change_{year}": f"density_pw_{format_radius(k)}_change_{year}_2020"
                for k in RADII
            }
        )
        return result

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name(str(self.year()))

    def quiz_question_descriptors(self):
        year = self.year()
        return {
            f"population_change_{year}": QuizQuestionDescriptor(
                f"higher % increase in population from {year} to 2020",
                POPULATION_OR_DENSITY_CHANGE,
            ),
            f"ad_1_change_{year}": QuizQuestionDescriptor(
                f"higher % increase in population-weighted density (r=1km) from {year} to 2020"
                + DENSITY_EXPLANATION_PW,
                POPULATION_OR_DENSITY_CHANGE,
            ),
            **{
                f"{k}_change_{year}": QuizQuestionSkip()
                for k in density_metrics
                if k != "ad_1"
            },
        }

    def dependencies(self):
        return [
            ky
            for k in ["population", *density_metrics]
            for ky in [k, f"{k}_{self.year()}"]
        ]

    def compute_statistics_dictionary_usa(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        year = self.year()

        statistics_table = {}

        statistics_table[f"population_change_{year}"] = (
            existing_statistics["population"]
            - existing_statistics[f"population_{year}"]
        ) / existing_statistics[f"population_{year}"]
        for k in density_metrics:
            statistics_table[f"{k}_change_{year}"] = (
                existing_statistics[k] - existing_statistics[f"{k}_{year}"]
            ) / existing_statistics[f"{k}_{year}"]

        return statistics_table

    def extra_stats(self):
        return {}


class Census2020(CensusForPreviousYear):
    # This isn't actually used for 2020, but it is used to just quickly source the 2020 data
    # for computing other statistics
    version = 2

    def year(self):
        return 2020

    def ysk(self, key):
        return key

    def ysn(self, name):
        return name

    def explanation_page_for_statistic(self, k):
        if k == "population":
            return "population"
        if k == "sd" or k.startswith("ad_"):
            return "density"
        if k in ["housing_per_pop", "vacancy", "housing_per_person"]:
            return "housing-census"
        if k in race_names:
            return "race"
        raise NotImplementedError(k)

    def explanation_page_for_each_statistic(self):
        return {
            k: self.explanation_page_for_statistic(k)
            for k in self.internal_statistic_names_list()
        }

    def quiz_question_descriptors(self):
        return {
            "population": QuizQuestionDescriptor("higher population", POPULATION),
            "ad_1": QuizQuestionDescriptor(
                "higher population-weighted density (r=1km)" + DENSITY_EXPLANATION_PW,
                POPULATION_DENSITY,
            ),
            # duplicate
            **{k: QuizQuestionSkip() for k in density_metrics if k != "ad_1"},
            # no sd because it's antithetical to the purpose of this site
            "sd": QuizQuestionSkip(),
            "white": QuizQuestionDescriptor("higher % of people who are White", RACE),
            "hispanic": QuizQuestionDescriptor(
                "higher % of people who are Hispanic", RACE
            ),
            "black": QuizQuestionDescriptor("higher % of people who are Black", RACE),
            "asian": QuizQuestionDescriptor("higher % of people who are Asian", RACE),
            # too small
            "native": QuizQuestionSkip(),
            "hawaiian_pi": QuizQuestionSkip(),
            "other / mixed": QuizQuestionSkip(),
            "housing_per_pop": QuizQuestionDescriptor(
                "higher number of housing units per adult",
                HOUSING,
            ),
            "housing_per_person": QuizQuestionSkip(),
            "vacancy": QuizQuestionDescriptor(
                "higher % of units that are vacant"
                "!TOOLTIP Vacancy is the % of housing units that were not occupied on April 1, 2020 (census night)."
                " This includes vacation homes but does *not* include units that were not occupied due to the pandemic"
                ", the census attempted to account for this.",
                HOUSING,
            ),
        }


class Census2010(CensusForPreviousYear):
    version = 8

    def year(self):
        return 2010


class Census2000(CensusForPreviousYear):
    version = 9

    def year(self):
        return 2000


class CensusChange2010(CensusChange):
    version = 1

    def year(self):
        return 2010


class CensusChange2000(CensusChange):
    version = 1

    def year(self):
        return 2000


@permacache_with_remapping_pickle(
    "urbanstats/statistics/collections/aggregate_basics_of_year_4",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def aggregate_basics_of_year(shapefile, year):
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


@permacache_with_remapping_pickle(
    "urbanstats/statistics/collections/compute_population_for_year_3",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def compute_population_for_year(shapefile, *, no_pr):
    """
    Compute the population for a shapefile for a given year
    """
    t = all_densities_gpd(2020)[["geoid", "population"]].copy()
    if no_pr:
        mask = t.geoid.apply(extract_state_fips_from_geoid) == "72"
        t.loc[mask, "population"] = 0
    t = t[["population"]]
    agg = aggregate_by_census_block(2020, shapefile, t)
    return agg["population"]


@permacache_with_remapping_pickle(
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
        statistics_table[year] = compute_population_for_year(shapefile, no_pr=no_pr)
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
