import numpy as np
from permacache import permacache

from urbanstats.data.canada.canada_density import canada_shapefile_with_densities
from urbanstats.data.census_blocks import RADII
from urbanstats.data.census_histogram import census_histogram_canada
from urbanstats.games.quiz_question_metadata import (
    POPULATION,
    POPULATION_DENSITY,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.geometry.census_aggregation import aggregate_by_census_block_canada
from urbanstats.statistics.collections.census import (
    DENSITY_EXPLANATION_PW,
    format_radius,
)
from urbanstats.statistics.extra_statistics import HistogramSpec
from urbanstats.statistics.statistic_collection import CanadaStatistics


class CensusCanada(CanadaStatistics):
    version = 2

    def name_for_each_statistic(self):
        return {
            "population_2021_canada": "Population [StatCan]",
            **{
                f"density_2021_pw_{r}_canada": f"PW Density ({format_radius(r)}) [StatCan]"
                for r in RADII
            },
            "sd_2021_canada": "Area-weighted Density [StatCan]",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census")

    def quiz_question_descriptors(self):
        return {
            "population_2021_canada": QuizQuestionDescriptor(
                "higher population", POPULATION
            ),
            "density_2021_pw_0.25_canada": QuizQuestionSkip(),
            "density_2021_pw_0.5_canada": QuizQuestionSkip(),
            "density_2021_pw_1_canada": QuizQuestionDescriptor(
                "higher population-weighted density (r=1km)" + DENSITY_EXPLANATION_PW,
                POPULATION_DENSITY,
            ),
            "density_2021_pw_2_canada": QuizQuestionSkip(),
            "density_2021_pw_4_canada": QuizQuestionSkip(),
            "sd_2021_canada": QuizQuestionSkip(),
        }

    def dependencies(self):
        return ["area"]

    def compute_statistics_dictionary_canada(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        st = compute_census_stats(2021, shapefile)
        results = {}
        results["population_2021_canada"] = st["population"]
        results["sd_2021_canada"] = st["population"] / existing_statistics["area"]
        for r in RADII:
            results[f"density_2021_pw_{r}_canada"] = (
                st[f"canada_density_2021_{r}"] / st["population"]
            )
        histos = census_histogram_canada(shapefile, 2021)
        results.update({f"pw_density_histogram_{r}_canada": [] for r in RADII})
        for idx, longname in enumerate(shapefile_table.longname):
            for r in RADII:
                if longname not in histos:
                    assert st["population"][idx] == 0
                    results[f"pw_density_histogram_{r}_canada"].append(np.nan)
                else:
                    results[f"pw_density_histogram_{r}_canada"].append(
                        histos[longname][f"canada_density_2021_{r}"]
                    )
        return results

    def extra_stats(self):
        return {
            f"density_2021_pw_{r}_canada": HistogramSpec(
                0, 0.1, f"pw_density_histogram_{r}_canada", "population_2021_canada"
            )
            for r in RADII
        }


@permacache(
    "urbanstats/statistics/collections/census_canada/compute_census_stats",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def compute_census_stats(year, shapefile):
    dens = canada_shapefile_with_densities(year)
    return aggregate_by_census_block_canada(
        year,
        shapefile,
        dens[[k for k in dens if k.startswith("canada_density")] + ["population"]],
    )
