from abc import abstractmethod

import numpy as np
import pandas as pd

from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.data.census_blocks import (
    RADII,
    all_densities_gpd,
    format_radius,
    housing_units,
    load_raw_census,
    racial_demographics,
)
from urbanstats.data.census_histogram import census_histogram
from urbanstats.data.gpw import median_from_histogram
from urbanstats.games.quiz_question_metadata import (
    HOUSING,
    POPULATION_OR_DENSITY_CHANGE,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.geometry.census_aggregation import Crosswalk, aggregate_by_census_block
from urbanstats.statistics.extra_statistics import HistogramSpec
from urbanstats.statistics.statistic_collection import (
    USAStatistics,
    statcan_legacy_names,
)

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
median_density_metrics = {"md_1": "PW Median Density (r=1km)"}


DENSITY_KEYS = ["population", *density_metrics, *median_density_metrics, "sd"]


class CensusForPreviousYear(USAStatistics):
    # statistics computed for both countries by census_national, so not here
    merged_keys = ()

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
        result.update(median_density_metrics)
        result.update(
            {
                "sd": "AW Density",
                **race_names,
                "housing_per_pop": "Housing Units per Adult",
                "housing_per_person": "Housing Units per Person",
                "vacancy": "Vacancy %",
            }
        )
        return {
            self.ysk(k): self.ysn(v)
            for k, v in result.items()
            if k not in self.merged_keys
        }

    def unit_for_each_statistic(self):
        result = {"population": "population", "sd": "density"}
        result.update({k: "density" for k in density_metrics})
        result.update({k: "density" for k in median_density_metrics})
        result.update({k: "percentage" for k in race_names})
        result.update(
            {
                "housing_per_pop": "number",
                "housing_per_person": "number",
                "vacancy": "percentage",
            }
        )
        return {self.ysk(k): v for k, v in result.items() if k not in self.merged_keys}

    def varname_for_each_statistic(self):
        result = {}
        result.update({"population": "population"})
        result.update({f"ad_{k}": f"density_pw_{format_radius(k)}" for k in RADII})
        result.update({"md_1": "density_pw_median_1km"})
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
        return {
            self.ysk(k): self.ysk(v)
            for k, v in result.items()
            if k not in self.merged_keys
        }

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
        table = aggregate_basics_of_year(shapefile.geometry, year)
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

        hists_year = census_histogram(shapefile.geometry, year)
        for dens in RADII:
            statistics_table[self.ysk(f"pw_density_histogram_{dens}")] = [
                np.nan if h is None else h[f"ad_{dens}"] for h in hists_year
            ]
        statistics_table[self.ysk("md_1")] = [
            median_from_histogram(h)
            for h in statistics_table[self.ysk("pw_density_histogram_1")]
        ]
        # population_18 is for other collections, e.g. the CDC's, to divide by
        kept = (
            set(self.name_for_each_statistic())
            | {self.ysk("population_18")}
            | {
                self.ysk(f"pw_density_histogram_{dens}")
                for dens in RADII
                if self.ysk(f"ad_{dens}") in self.name_for_each_statistic()
            }
        )
        return {k: v for k, v in statistics_table.items() if k in kept}

    def extra_stats(self):
        return {
            self.ysk(f"ad_{d}"): HistogramSpec(
                0, 0.1, self.ysk(f"pw_density_histogram_{d}"), "population"
            )
            for d in RADII
            if self.ysk(f"ad_{d}") in self.name_for_each_statistic()
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
        result.update(
            {
                f"{k}_abs_change_{year}": f"{v} Absolute Change ({year}-2020)"
                for k, v in ad.items()
            }
        )
        return result

    def unit_for_each_statistic(self):
        return {
            k: "densityChange" if "_abs_change_" in k else "percentageChange"
            for k in self.name_for_each_statistic()
        }

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
        result.update(
            {
                f"ad_{k}_abs_change_{year}": f"density_pw_{format_radius(k)}_abs_change_{year}_2020"
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
            **{f"{k}_abs_change_{year}": QuizQuestionSkip() for k in density_metrics},
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
            statistics_table[f"{k}_abs_change_{year}"] = (
                existing_statistics[k] - existing_statistics[f"{k}_{year}"]
            )
            statistics_table[f"{k}_change_{year}"] = (
                statistics_table[f"{k}_abs_change_{year}"]
                / existing_statistics[f"{k}_{year}"]
            )

        return statistics_table

    def extra_stats(self):
        return {}


class Census2020(CensusForPreviousYear):
    """The 2020 statistics the Canadian census doesn't have."""

    version = 6
    merged_keys = (
        *DENSITY_KEYS,
        *race_names,
        "housing_per_pop",
        "housing_per_person",
    )

    def year(self):
        return 2020

    def ysk(self, key):
        return key

    def ysn(self, name):
        return name

    def explanation_page_for_statistic(self, k):
        if k == "population":
            return "population"
        if k == "sd" or k.startswith("ad_") or k.startswith("md_"):
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
            "vacancy": QuizQuestionDescriptor(
                "higher % of units that are vacant"
                "!TOOLTIP Vacancy is the % of housing units that were not occupied on April 1, 2020 (census night)."
                " This includes vacation homes but does *not* include units that were not occupied due to the pandemic"
                ", the census attempted to account for this.",
                HOUSING,
            ),
        }


class Census2010(CensusForPreviousYear):
    """The 2010 statistics the Canadian census doesn't have."""

    version = 11
    merged_keys = tuple(DENSITY_KEYS)

    def year(self):
        return 2010


class Census2000(CensusForPreviousYear):
    version = 11

    def year(self):
        return 2000


class CensusChange2010(CensusChange):
    """From the merged statistics, with Canada's 2011 values as 2010."""

    version = 3
    data_source_country = None

    def legacy_statistic_names(self):
        # Canada's, from before the two countries' statistics were merged
        return statcan_legacy_names(self)

    def countries_for_each_statistic(self):
        return self.same_for_each_name(("USA", "Canada"))

    def year(self):
        return 2010

    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        if existing_statistics["population"] is None:
            return {}
        return self.compute_statistics_dictionary_usa(
            shapefile=shapefile,
            existing_statistics=existing_statistics,
            shapefile_table=shapefile_table,
        )


class CensusChange2000(CensusChange):
    version = 2

    def year(self):
        return 2000


@permacache_with_remapping_pickle(
    "urbanstats/statistics/collections/aggregate_basics_of_year_4",
)
def aggregate_basics_of_year(geometry, year):
    print("aggregating basics of", year, "for", geometry.key)
    sum_keys = [
        "population",
        "population_18",
        *[f"{k}" for k in racial_demographics],
        *[f"{k}" for k in housing_units],
        *[f"{k}" for k in density_metrics],
    ]
    sum_keys = [f"{k}_{year}" for k in sum_keys]
    t = all_densities_gpd(year)
    t.columns = [f"{k}_{year}" for k in t.columns]
    return aggregate_by_census_block(year, geometry, t[sum_keys])


@permacache_with_remapping_pickle(
    "urbanstats/statistics/collections/population_median_point_usa_2",
)
def population_median_point_usa(geometry):
    _, population, _, _, coordinates = load_raw_census(2020)
    return Crosswalk.compute_usa(2020, geometry).compute_geometric_median_dataframe(
        geometry, population[:, 0], coordinates[:, 0], coordinates[:, 1]
    )


def extract_state_fips_from_geoid(geoid):
    prefix = "7500000US"
    assert geoid.startswith(prefix)
    return geoid[len(prefix) :][:2]


@permacache_with_remapping_pickle(
    "urbanstats/statistics/collections/compute_population_for_year_3",
)
def compute_population_for_year(geometry, *, no_pr):
    """
    Compute the population for a geometry for a given year
    """
    geoid, population, *_ = load_raw_census(2020)
    t = pd.DataFrame(
        dict(geoid=geoid, population=population[:, 0]), index=np.arange(len(geoid))
    )
    if no_pr:
        mask = t.geoid.apply(extract_state_fips_from_geoid) == "72"
        t.loc[mask, "population"] = 0
    t = t[["population"]]
    agg = aggregate_by_census_block(2020, geometry, t)
    return agg["population"]


@permacache_with_remapping_pickle(
    "urbanstats/statistics/collections/population_by_year_4",
)
def population_by_year(geometry, *, no_pr):
    """
    If no_pr is True, then Puerto Rico is not included in the population statistics
    """
    statistics_table = pd.DataFrame(index=geometry.load_rows().index)
    for year in [2000, 2010, 2020]:
        statistics_table[year] = compute_population_for_year(geometry, no_pr=no_pr)
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
