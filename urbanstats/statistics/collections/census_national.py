from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd

from urbanstats.data.census_blocks import RADII, format_radius
from urbanstats.data.census_histogram import (
    census_histogram,
    census_histogram_australia,
    census_histogram_canada,
)
from urbanstats.data.gpw import median_from_histogram
from urbanstats.games.quiz_question_metadata import (
    HOUSING,
    POPULATION,
    POPULATION_DENSITY,
    RACE,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.collections import census_australia
from urbanstats.statistics.collections.census import (
    DENSITY_EXPLANATION_PW,
    aggregate_basics_of_year,
    population_median_point_usa,
    race_names,
)
from urbanstats.statistics.collections.census_canada import (
    compute_census_median_point,
    compute_census_stats,
)
from urbanstats.statistics.collections.census_canada_housing_rent import (
    CanadianHousingCounts,
)
from urbanstats.statistics.collections.census_canada_race import CanadianRaceCounts
from urbanstats.statistics.extra_statistics import HistogramSpec
from urbanstats.statistics.national_census import NationalCensusStatistics
from urbanstats.statistics.statistic_collection import compute_subset_statistics
from urbanstats.statistics.utils import fractionalize


@dataclass(frozen=True)
class USCensusBlocks:
    year: int

    def compute(self, shapefile):
        """Population and population-times-density at each radius, summed over each region."""
        t = aggregate_basics_of_year(shapefile.geometry, self.year)
        return pd.DataFrame(
            {
                "population": t[f"population_{self.year}"],
                **{f"ad_{r}": t[f"ad_{r}_{self.year}"] for r in RADII},
            }
        )

    def histograms(self, shapefile):
        """Each region's density histogram at each radius, or None for one with no blocks."""
        return [
            None if h is None else {r: h[f"ad_{r}"] for r in RADII}
            for h in census_histogram(shapefile.geometry, self.year)
        ]


@dataclass(frozen=True)
class CanadianCensusBlocks:
    year: int

    def compute(self, shapefile):
        t = compute_census_stats(self.year, shapefile.geometry)
        return pd.DataFrame(
            {
                "population": t["population"],
                **{f"ad_{r}": t[f"canada_density_{self.year}_{r}"] for r in RADII},
            }
        )

    def histograms(self, shapefile):
        return [
            None
            if h is None
            else {r: h[f"canada_density_{self.year}_{r}"] for r in RADII}
            for h in census_histogram_canada(shapefile.geometry, self.year)
        ]


@dataclass(frozen=True)
class AustralianCensusBlocks:
    """The 2021 census's mesh blocks."""

    def compute(self, shapefile):
        t = census_australia.compute_census_stats(shapefile.geometry)
        return pd.DataFrame(
            {
                "population": t["population"],
                **{f"ad_{r}": t[f"australia_density_2021_{r}"] for r in RADII},
            }
        )

    def histograms(self, shapefile):
        return [
            None if h is None else {r: h[f"australia_density_2021_{r}"] for r in RADII}
            for h in census_histogram_australia(shapefile.geometry)
        ]


def add_histograms(a, b):
    """Histograms share bins from the lowest one up, so the shorter is padded with zeros."""
    if a is None:
        return b
    if b is None:
        return a
    a, b = np.asarray(a, dtype=np.float64), np.asarray(b, dtype=np.float64)
    result = np.zeros(max(len(a), len(b)))
    result[: len(a)] += a
    result[: len(b)] += b
    return result


class CensusDensity(NationalCensusStatistics):
    """Population and density, from the census blocks of each country's census nearest year."""

    year: int
    canada_year: int
    # None where there is no Australian census near the year
    australia_year: Optional[int]

    def ysk(self, key):
        return key if self.year == 2020 else f"{key}_{self.year}"

    def ysn(self, name):
        return name if self.year == 2020 else f"{name} ({self.year})"

    def legacy_statistic_names(self):
        # Canada's, from before the two countries' statistics were merged
        label = "" if self.canada_year == 2021 else f" ({self.canada_year})"
        return {
            f"Population{label} [StatCan]": self.ysn("Population"),
            **{
                f"PW Density ({format_radius(r)}){label} [StatCan]": self.ysn(
                    f"PW Density (r={format_radius(r)})"
                )
                for r in RADII
            },
            f"Area-weighted Density{label} [StatCan]": self.ysn("AW Density"),
            f"PW Median Density (1km){label} [StatCan]": self.ysn(
                "PW Median Density (r=1km)"
            ),
        }

    def name_for_each_statistic(self):
        return {
            self.ysk("population"): self.ysn("Population"),
            **{
                self.ysk(f"ad_{r}"): self.ysn(f"PW Density (r={format_radius(r)})")
                for r in RADII
            },
            self.ysk("md_1"): self.ysn("PW Median Density (r=1km)"),
            self.ysk("sd"): self.ysn("AW Density"),
        }

    def unit_for_each_statistic(self):
        return {
            k: "population" if k == self.ysk("population") else "density"
            for k in self.name_for_each_statistic()
        }

    def varname_for_each_statistic(self):
        suffix = "" if self.year == 2020 else f"_{self.year}"
        return {
            self.ysk("population"): f"population{suffix}",
            **{
                self.ysk(f"ad_{r}"): f"density_pw_{format_radius(r)}{suffix}"
                for r in RADII
            },
            self.ysk("md_1"): f"density_pw_median_1km{suffix}",
            self.ysk("sd"): f"density_aw{suffix}",
        }

    def explanation_page_for_each_statistic(self):
        if self.year != 2020:
            return self.same_for_each_name(str(self.year))
        return {
            k: "population" if k == "population" else "density"
            for k in self.name_for_each_statistic()
        }

    def quiz_question_descriptors(self):
        result = QuizQuestionSkip.several(*self.name_for_each_statistic())
        if self.year == 2020:
            result["population"] = QuizQuestionDescriptor(
                "higher population",
                POPULATION,
                exclude_geography_types=("Subnational Region",),
            )
            result["ad_1"] = QuizQuestionDescriptor(
                "higher population-weighted density (r=1km)" + DENSITY_EXPLANATION_PW,
                POPULATION_DENSITY,
            )
        return result

    def dependencies(self):
        return ["area"]

    def country_inputs(self):
        result = {
            "USA": USCensusBlocks(self.year),
            "Canada": CanadianCensusBlocks(self.canada_year),
        }
        if self.australia_year is not None:
            result["Australia"] = AustralianCensusBlocks()
        return result

    def mutate_counts(self, counts):
        raise NotImplementedError("compute_statistics_dictionary is overridden")

    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        computed = self.summed_counts(shapefile)
        if computed is None:
            return {}
        counts, countries = computed
        covered = counts["population"].notna()
        inputs = self.country_inputs()
        histograms = [None] * len(counts)
        for country in countries:
            histograms = [
                (
                    None
                    if a is None and b is None
                    else {r: add_histograms(a and a[r], b and b[r]) for r in RADII}
                )
                for a, b in zip(histograms, inputs[country].histograms(shapefile))
            ]
        histograms = [h if c else None for h, c in zip(histograms, covered)]
        population = counts["population"]
        result = {
            self.ysk("population"): population,
            self.ysk("sd"): population / existing_statistics["area"],
        }
        for r in RADII:
            result[self.ysk(f"ad_{r}")] = counts[f"ad_{r}"] / population
            result[self.ysk(f"pw_density_histogram_{r}")] = [
                np.nan if h is None else h[r] for h in histograms
            ]
        result[self.ysk("md_1")] = [
            median_from_histogram(h) for h in result[self.ysk("pw_density_histogram_1")]
        ]
        if self.year == 2020:
            result.update(
                self.median_points(shapefile, existing_statistics, shapefile_table)
            )
        return result

    def median_points(self, shapefile, existing_statistics, shapefile_table):
        """Each country's median point, for regions in that country, as PopulationMedianStatistics reads them."""
        result = {}
        for country, suffix, compute in [
            ("USA", "usa", population_median_point_usa),
            ("Canada", "canada", lambda g: compute_census_median_point(2021, g)),
            ("Australia", "australia", census_australia.compute_census_median_point),
        ]:

            def median(
                shapefile, existing_statistics, shapefile_table, compute=compute
            ):
                del existing_statistics, shapefile_table
                m = compute(shapefile.geometry)
                return {"lat": m["lat"], "lon": m["lon"]}

            _, stats = compute_subset_statistics(
                shapefile,
                existing_statistics,
                shapefile_table,
                subset=country,
                compute_function=median,
            )
            for k, v in stats.items():
                result[f"population_median_{k}_{suffix}"] = v
        return result

    def extra_stats(self):
        return {
            self.ysk(f"ad_{r}"): HistogramSpec(
                0, 0.1, self.ysk(f"pw_density_histogram_{r}"), "population"
            )
            for r in RADII
        }


class CensusDensity2020(CensusDensity):
    version = 2
    year = 2020
    canada_year = 2021
    australia_year = 2021


class CensusDensity2010(CensusDensity):
    version = 1
    year = 2010
    canada_year = 2011
    australia_year = None


@dataclass(frozen=True)
class USCensusRace:
    def compute(self, shapefile):
        t = aggregate_basics_of_year(shapefile.geometry, 2020)
        result = {k: t[f"{k}_2020"] for k in race_names if k != "other / mixed"}
        result["other / mixed"] = t["other_2020"] + t["mixed_2020"]
        return pd.DataFrame(result)


class CensusRace2020(NationalCensusStatistics):
    version = 1

    def name_for_each_statistic(self):
        return dict(race_names)

    def unit_for_each_statistic(self):
        return self.same_for_each_name("percentage")

    def varname_for_each_statistic(self):
        return {k: k.replace(" / ", "_") for k in race_names}

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("race")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                RACE,
                {
                    "white": "higher % of people who are White",
                    "hispanic": "higher % of people who are Hispanic",
                    "black": "higher % of people who are Black",
                    "asian": "higher % of people who are Asian",
                },
            ),
            # too small
            **QuizQuestionSkip.several("native", "hawaiian_pi", "other / mixed"),
        }

    def country_inputs(self):
        return {"USA": USCensusRace(), "Canada": CanadianRaceCounts()}

    def mutate_counts(self, counts):
        fractionalize(counts, *race_names)


@dataclass(frozen=True)
class USCensusHousing:
    def compute(self, shapefile):
        t = aggregate_basics_of_year(shapefile.geometry, 2020)
        return pd.DataFrame(
            {
                "housing_units": t["total_2020"],
                "housing_population": t["population_2020"],
                "housing_adults": t["population_18_2020"],
            }
        )


class CensusHousing2020(NationalCensusStatistics):
    version = 1

    def name_for_each_statistic(self):
        return {
            "housing_per_pop": "Housing Units per Adult",
            "housing_per_person": "Housing Units per Person",
        }

    def unit_for_each_statistic(self):
        return self.same_for_each_name("number")

    def varname_for_each_statistic(self):
        return {
            "housing_per_pop": "housing_per_adult",
            "housing_per_person": "housing_per_person",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("housing-census")

    def quiz_question_descriptors(self):
        return {
            "housing_per_pop": QuizQuestionDescriptor(
                "higher number of housing units per adult",
                HOUSING,
            ),
            "housing_per_person": QuizQuestionSkip(),
        }

    def country_inputs(self):
        return {"USA": USCensusHousing(), "Canada": CanadianHousingCounts()}

    def mutate_counts(self, counts):
        counts["housing_per_pop"] = counts["housing_units"] / counts["housing_adults"]
        counts["housing_per_person"] = (
            counts["housing_units"] / counts["housing_population"]
        )
