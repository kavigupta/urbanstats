from urbanstats.geometry.segregation import compute_homogenity_statistics
from urbanstats.statistics.statistic_collection import (
    CensusStatisticsColection,
)

homogeneity_explanation = (
    "!TOOLTIP We define racial homogeneity as the average probability a person selecing "
    "a random person in a 250m radius will select someone of the same race"
)


class SegregationStatistics(CensusStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "homogeneity_250_2020": "Racial Homogeneity %",
            "segregation_250_2020": "Segregation %",
            "segregation_250_10_2020": "Mean Local Segregation %",
            "homogeneity_250_2010": "Racial Homogeneity % (2010)",
            "segregation_250_2010": "Segregation % (2010)",
            "segregation_250_10_2010": "Mean Local Segregation % (2010)",
            "homogeneity_250_diff": "Racial Homogeneity Change (2010-2020)",
            "segregation_250_diff": "Segregation Change (2010-2020)",
            "segregation_250_10_diff": "Mean Local Segregation Change (2010-2020)",
        }

    def category_for_each_statistic(self):
        return {
            k: "race" if "2020" in k else "2010" for k in self.name_for_each_statistic()
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("segregation")

    def quiz_question_names(self):
        return {
            "homogeneity_250_2020": "higher racial homogeneity" + homogeneity_explanation,
            "homogeneity_250_diff": "increase in racial homogeneity from 2010 to 2020"
            + homogeneity_explanation,
        }

    def quiz_question_unused(self):
        return [
            # 2010 is just redundant with 2020
            "homogeneity_250_2010",
            "segregation_250_2010",
            "segregation_250_10_2010",
            # too hard to explain succinctly in a tooltip
            "segregation_250_2020",
            "segregation_250_diff",
            "segregation_250_10_2020",
            "segregation_250_10_diff",
        ]

    def compute_statistics(self, shapefile, statistics_table, shapefile_table):
        (
            homogeneity_2020,
            segregation_2020,
            segregation_10_2020,
        ) = compute_homogenity_statistics(
            2020, radius_small=0.25, radius_large=10, shapefile=shapefile
        )
        (
            homogeneity_2010,
            segregation_2010,
            segregation_10_2010,
        ) = compute_homogenity_statistics(
            2010, radius_small=0.25, radius_large=10, shapefile=shapefile
        )
        homogeneity_diff = (homogeneity_2020 - homogeneity_2010) / homogeneity_2010
        segregation_diff = (segregation_2020 - segregation_2010) / segregation_2010
        segregation_10_diff = (
            segregation_10_2020 - segregation_10_2010
        ) / segregation_10_2010

        statistics_table["homogeneity_250_2020"] = homogeneity_2020
        statistics_table["segregation_250_2020"] = segregation_2020
        statistics_table["segregation_250_10_2020"] = segregation_10_2020
        statistics_table["homogeneity_250_2010"] = homogeneity_2010
        statistics_table["segregation_250_2010"] = segregation_2010
        statistics_table["segregation_250_10_2010"] = segregation_10_2010
        statistics_table["homogeneity_250_diff"] = homogeneity_diff
        statistics_table["segregation_250_diff"] = segregation_diff
        statistics_table["segregation_250_10_diff"] = segregation_10_diff

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        raise NotImplementedError
