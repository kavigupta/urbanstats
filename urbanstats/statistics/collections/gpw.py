from urbanstats.statistics.collections.census_basics import (
    DENSITY_EXPLANATION_AW,
    DENSITY_EXPLANATION_PW,
)
from urbanstats.statistics.extra_statistics import HistogramSpec
from urbanstats.statistics.statistic_collection import InternationalStatistics


class GPWStatistics(InternationalStatistics):
    def name_for_each_statistic(self):
        return {
            "gpw_population": "Population [GHS-POP]",
            **{
                f"gpw_pw_density_{k}": f"PW Density (r={k}km) [GHS-POP]"
                for k in (1, 2, 4)
            },
            "gpw_aw_density": "AW Density [GHS-POP]",
        }

    def category_for_each_statistic(self):
        return {
            "gpw_population": "main",
            "gpw_pw_density_1": "main",
            "gpw_pw_density_2": "other_densities",
            "gpw_pw_density_4": "other_densities",
            "gpw_aw_density": "main",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("gpw")

    def quiz_question_names(self):
        return {
            "gpw_population": "higher population",
            "gpw_pw_density_4": "higher population-weighted density (r=4km)"
            + DENSITY_EXPLANATION_PW,
        }

    def quiz_question_unused(self):
        return ["gpw_pw_density_2", "gpw_pw_density_1", "gpw_aw_density"]

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        assert (
            "area" in statistics_table
        ), "area not in statistics table. I know this should probably be creating it. I'll fix it later."
        statistics_table["gpw_aw_density"] = (
            statistics_table["gpw_population"] / statistics_table["area"]
        )

    def extra_stats(self):
        return {
            "gpw_pw_density_1": HistogramSpec(0, 0.1, "gpw_pw_density_histogram_1"),
            "gpw_pw_density_2": HistogramSpec(0, 0.1, "gpw_pw_density_histogram_2"),
            "gpw_pw_density_4": HistogramSpec(0, 0.1, "gpw_pw_density_histogram_4"),
        }
