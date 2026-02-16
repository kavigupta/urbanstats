from abc import abstractmethod

import numpy as np

from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.data.canada.canada_density import canada_shapefile_with_densities
from urbanstats.data.census_blocks import RADII, format_radius
from urbanstats.data.census_histogram import census_histogram_canada
from urbanstats.games.quiz_question_metadata import (
    POPULATION,
    POPULATION_DENSITY,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.geometry.census_aggregation import aggregate_by_census_block_canada
from urbanstats.statistics.collections.census import DENSITY_EXPLANATION_PW
from urbanstats.statistics.extra_statistics import HistogramSpec
from urbanstats.statistics.statistic_collection import CanadaStatistics


class CensusCanada(CanadaStatistics):
    version = 7

    canada_years = (2021, 2011)

    def _year_label(self, year):
        return "" if year == 2021 else f" ({year})"

    def name_for_each_statistic(self):
        result = {}
        for year in self.canada_years:
            label = self._year_label(year)
            result[f"population_{year}_canada"] = f"Population{label} [StatCan]"
            result.update(
                {
                    f"density_{year}_pw_{r}_canada": f"PW Density ({format_radius(r)}){label} [StatCan]"
                    for r in RADII
                }
            )
            result[f"sd_{year}_canada"] = f"Area-weighted Density{label} [StatCan]"
        return result

    def varname_for_each_statistic(self):
        result = {}
        for year in self.canada_years:
            # Map Canadian census years to variable names
            # 2021 -> no suffix (matches current US census pattern)
            # 2011 -> _2010 suffix (matches US Census 2010 for MultiSource compatibility)
            if year == 2021:
                var_year_suffix = ""
            elif year == 2011:
                var_year_suffix = "_2010"
            else:
                var_year_suffix = f"_{year}"

            population_name = f"population{var_year_suffix}"
            density_name = (
                lambda r, suffix=var_year_suffix: f"density_pw_{format_radius(r)}{suffix}"
            )
            sd_name = f"density_aw{var_year_suffix}"

            result[f"population_{year}_canada"] = population_name
            result.update(
                {f"density_{year}_pw_{r}_canada": density_name(r) for r in RADII}
            )
            result[f"sd_{year}_canada"] = sd_name
        return result

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census")

    def quiz_question_descriptors(self):
        result = {}
        for year in self.canada_years:
            population_key = f"population_{year}_canada"
            density_key = f"density_{year}_pw_1_canada"
            if year == 2021:
                result[population_key] = QuizQuestionDescriptor(
                    "higher population", POPULATION
                )
                result[density_key] = QuizQuestionDescriptor(
                    "higher population-weighted density (r=1km)" + DENSITY_EXPLANATION_PW,
                    POPULATION_DENSITY,
                )
            else:
                result[population_key] = QuizQuestionSkip()
                result[density_key] = QuizQuestionSkip()
            result.update(
                {
                    f"density_{year}_pw_{r}_canada": QuizQuestionSkip()
                    for r in RADII
                    if r not in (1,)
                }
            )
            result[f"sd_{year}_canada"] = QuizQuestionSkip()
        return result

    def dependencies(self):
        return ["area"]

    def compute_statistics_dictionary_canada(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        results = {}
        for year in self.canada_years:
            st = compute_census_stats(year, shapefile)
            results[f"population_{year}_canada"] = st["population"]
            results[f"sd_{year}_canada"] = (
                st["population"] / existing_statistics["area"]
            )
            for r in RADII:
                results[f"density_{year}_pw_{r}_canada"] = (
                    st[f"canada_density_{year}_{r}"] / st["population"]
                )
            histos = census_histogram_canada(shapefile, year)
            results.update(
                {f"pw_density_{year}_histogram_{r}_canada": [] for r in RADII}
            )
            for idx, longname in enumerate(shapefile_table.longname):
                for r in RADII:
                    if longname not in histos:
                        assert st["population"][idx] == 0
                        results[f"pw_density_{year}_histogram_{r}_canada"].append(
                            np.nan
                        )
                    else:
                        results[f"pw_density_{year}_histogram_{r}_canada"].append(
                            histos[longname][f"canada_density_{year}_{r}"]
                        )
        for k in self.name_for_each_statistic():
            assert k in results, f"Missing statistic {k}"
        return results

    def extra_stats(self):
        return {
            f"density_{year}_pw_{r}_canada": HistogramSpec(
                0,
                0.1,
                f"pw_density_{year}_histogram_{r}_canada",
                f"population_{year}_canada",
            )
            for r in RADII
            for year in self.canada_years
        }


@permacache_with_remapping_pickle(
    "urbanstats/statistics/collections/census_canada/compute_census_stats_2",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def compute_census_stats(year, shapefile):
    dens = canada_shapefile_with_densities(year)
    return aggregate_by_census_block_canada(
        year,
        shapefile,
        dens[[k for k in dens if k.startswith("canada_density")] + ["population"]],
    )
