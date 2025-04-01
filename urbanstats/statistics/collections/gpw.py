from urbanstats.data.census_blocks import RADII, format_radius
from urbanstats.data.gpw import compute_gpw_data_for_shapefile
from urbanstats.games.quiz_question_metadata import (
    POPULATION,
    POPULATION_DENSITY,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.collections.census import DENSITY_EXPLANATION_PW
from urbanstats.statistics.extra_statistics import HistogramSpec
from urbanstats.statistics.statistic_collection import InternationalStatistics

GPW_RADII = [k for k in RADII if k >= 1]


class GPWStatistics(InternationalStatistics):
    version = 2

    def name_for_each_statistic(self):
        return {
            "gpw_population": "Population [GHS-POP]",
            **{
                f"gpw_pw_density_{k}": f"PW Density (r={format_radius(k)}) [GHS-POP]"
                for k in GPW_RADII
            },
            "gpw_aw_density": "AW Density [GHS-POP]",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("gpw")

    def quiz_question_descriptors(self):
        return {
            "gpw_population": QuizQuestionDescriptor("higher population", POPULATION),
            "gpw_pw_density_4": QuizQuestionDescriptor(
                "higher population-weighted density (r=4km)" + DENSITY_EXPLANATION_PW,
                POPULATION_DENSITY,
            ),
            **QuizQuestionSkip.several(
                *[f"gpw_pw_density_{k}" for k in GPW_RADII if k not in (4,)]
            ),
            "gpw_aw_density": QuizQuestionSkip(),
        }

    def dependencies(self):
        return ["area"]

    def compute_statistics_dictionary_intl(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        statistics_table = {}

        result, hists = compute_gpw_data_for_shapefile(shapefile)
        for k, rk in result.items():
            statistics_table[k] = rk
        for k, hk in hists.items():
            statistics_table[k] = hk

        statistics_table["gpw_aw_density"] = (
            statistics_table["gpw_population"] / existing_statistics["area"]
        )

        return statistics_table

    def extra_stats(self):
        return {
            f"gpw_pw_density_{k}": HistogramSpec(
                0, 0.1, f"gpw_pw_density_histogram_{k}", "gpw_population"
            )
            for k in GPW_RADII
        }
