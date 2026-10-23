# pylint: disable=duplicate-code
from dataclasses import dataclass

import pandas as pd

from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.games.quiz_question_metadata import RENT_BURDEN, QuizQuestionDescriptor
from urbanstats.statistics.statistic_collection import CanadaStatistics
from urbanstats.statistics.utils import fractionalize


def canadian_tenure_and_burden_tables() -> CensusTables:
    tenure_table = "Total - Private households by tenure - 25% sample data (50)"
    burden_table = (
        "Total - Owner and tenant households with household total income greater than zero, "
        "in non-farm, non-reserve private dwellings by shelter-cost-to-income ratio - 25% sample data (61)"
    )
    return CensusTables(
        [tenure_table, burden_table],
        {
            "rent_or_own_rent": [
                "  Renter",
                "  Dwelling provided by the local government, First Nation or Indian band",
            ],
            "rent_or_own_own": [
                "  Owner",
            ],
            "rent_burden_under_30": [
                "  Spending less than 30% of income on shelter costs",
            ],
            "rent_burden_over_30": [
                "  Spending 30% or more of income on shelter costs",
            ],
            None: [
                tenure_table,
                burden_table,
                "    30% to less than 100%",
            ],
        },
        "total_dwellings",
    )


class CensusCanadaHousingRent(CanadaStatistics):
    """Housing costs over 30% of income, which the US statistics don't have."""

    version = 5

    def name_for_each_statistic(self):
        return {"rent_burden_over_30_canada": "Housing Cost/Income > 30% [StatCan]"}

    def unit_for_each_statistic(self):
        return self.same_for_each_name("percentage")

    def varname_for_each_statistic(self):
        return {"rent_burden_over_30_canada": "housing_cost_30_percent_or_more"}

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census-disaggregated")

    def quiz_question_descriptors(self):
        return {
            "rent_burden_over_30_canada": QuizQuestionDescriptor(
                "higher % of households spending 30% or more of income on shelter costs",
                RENT_BURDEN,
            ),
        }

    def compute_statistics_dictionary_canada(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        counts = canadian_tenure_and_burden_tables().compute(2021, shapefile)
        fractionalize(counts, "rent_burden_under_30", "rent_burden_over_30")
        return {"rent_burden_over_30_canada": counts["rent_burden_over_30"]}


def canadian_housing_population_tables() -> CensusTables:
    return CensusTables(
        ["Total - Age groups of the population - 100% data"],
        {
            None: [
                "  0 to 14 years",
                "    0 to 4 years",
                "    5 to 9 years",
                "    10 to 14 years",
                "  15 to 64 years",
                "  65 years and over",
                "      85 to 89 years",
                "      90 to 94 years",
                "      95 to 99 years",
                "      100 years and over",
            ],
            "population_total_canada": [
                "Total - Age groups of the population - 100% data",
            ],
            "population_15_to_19_canada": [
                "    15 to 19 years",
            ],
            "population_20_plus_canada": [
                "    20 to 24 years",
                "    25 to 29 years",
                "    30 to 34 years",
                "    35 to 39 years",
                "    40 to 44 years",
                "    45 to 49 years",
                "    50 to 54 years",
                "    55 to 59 years",
                "    60 to 64 years",
                "    65 to 69 years",
                "    70 to 74 years",
                "    75 to 79 years",
                "    80 to 84 years",
                "    85 years and over",
            ],
        },
        "population",
    )


@dataclass(frozen=True)
class CanadianHousingCounts:
    """Dwellings, people, and adults (all over 20, and 2 in 5 of those 15 to 19)."""

    def compute(self, shapefile):
        dwellings = CensusTables(
            ["Total private dwellings (2)"],
            {"total_dwellings_canada": ["Total private dwellings (2)"]},
            "total_dwellings",
        ).compute(2021, shapefile)
        population = canadian_housing_population_tables().compute(2021, shapefile)
        return pd.DataFrame(
            {
                "housing_units": dwellings["total_dwellings_canada"],
                "housing_population": population["population_total_canada"],
                "housing_adults": population["population_20_plus_canada"]
                + population["population_15_to_19_canada"] * (2 / 5),
            }
        )
