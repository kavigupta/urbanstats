# pylint: disable=duplicate-code
import numpy as np

from urbanstats.acs.load import ACSDataEntity
from urbanstats.games.quiz_question_metadata import (
    HOUSING,
    QuizQuestionDescriptor,
)
from urbanstats.statistics.statistic_collection import ACSStatisticsColection


def compute_population_weighted_household_size(
    statistics_table,
    prefix="household_size_",
    output_name="household_size_pw",
    max_size=7,
):
    """
    Calculate population-weighted average household size.

    Formula: sum(households * size^2) / sum(households * size).

    Args:
        statistics_table: DataFrame with household size columns
        prefix: Column prefix (e.g., "household_size_" for US, "household_size_*_canada" for Canada)
        output_name: Output column name
        max_size: Maximum household size. Generates categories 1 through max_size-1,
                 plus a "{max_size}_plus" category with value max_size + 0.5.
    """
    # Build household_sizes dict based on max_size
    household_sizes = {str(i): i for i in range(1, max_size)}
    household_sizes[f"{max_size}_plus"] = max_size + 0.5

    numerator = np.zeros(len(statistics_table))
    denominator = np.zeros(len(statistics_table))

    for category in household_sizes:
        col_name = f"{prefix}{category}"
        households = statistics_table[col_name]
        size = household_sizes[category]
        numerator += households * size * size
        denominator += households * size
        del statistics_table[col_name]

    statistics_table[output_name] = np.where(
        denominator > 0,
        numerator / denominator,
        np.nan,
    )


class HouseholdSizeStatistics(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "household_size_pw": "Household Size (population-weighted)",
        }

    def varname_for_each_statistic(self):
        return {
            "household_size_pw": "household_size_pw",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("housing-acs")

    def quiz_question_descriptors(self):
        return {
            "household_size_pw": QuizQuestionDescriptor(
                "higher average household size (population-weighted) "
                "!TOOLTIP The average household size a person is in;"
                " i.e., the average over all people of the number of"
                " people in their household. This is population-weighted,"
                " meaning that a person in a 4-person household counts 4"
                " times as much as a person in a 1-person household.",
                HOUSING,
            ),
        }

    def mutate_acs_results(self, statistics_table):
        compute_population_weighted_household_size(statistics_table)

    def acs_name(self):
        return "household_size"

    def acs_entity(self):
        return ACSDataEntity(
            "TENURE BY HOUSEHOLD SIZE",
            "total",
            "block group",
            {
                None: [
                    "Estimate!!Total:",
                    "Estimate!!Total:!!Owner occupied:",
                    "Estimate!!Total:!!Renter occupied:",
                ],
                "household_size_1": [
                    "Estimate!!Total:!!Owner occupied:!!1-person household",
                    "Estimate!!Total:!!Renter occupied:!!1-person household",
                ],
                "household_size_2": [
                    "Estimate!!Total:!!Owner occupied:!!2-person household",
                    "Estimate!!Total:!!Renter occupied:!!2-person household",
                ],
                "household_size_3": [
                    "Estimate!!Total:!!Owner occupied:!!3-person household",
                    "Estimate!!Total:!!Renter occupied:!!3-person household",
                ],
                "household_size_4": [
                    "Estimate!!Total:!!Owner occupied:!!4-person household",
                    "Estimate!!Total:!!Renter occupied:!!4-person household",
                ],
                "household_size_5": [
                    "Estimate!!Total:!!Owner occupied:!!5-person household",
                    "Estimate!!Total:!!Renter occupied:!!5-person household",
                ],
                "household_size_6": [
                    "Estimate!!Total:!!Owner occupied:!!6-person household",
                    "Estimate!!Total:!!Renter occupied:!!6-person household",
                ],
                "household_size_7_plus": [
                    "Estimate!!Total:!!Owner occupied:!!7-or-more person household",
                    "Estimate!!Total:!!Renter occupied:!!7-or-more person household",
                ],
            },
        )
