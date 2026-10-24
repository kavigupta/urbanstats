from urbanstats.games.quiz_question_metadata import (
    INCOME,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.national_census import (
    AustralianCounts,
    NationalCensusStatistics,
)
from urbanstats.statistics.utils import fractionalize


class CensusAustraliaIncomeIndividual(NationalCensusStatistics):
    version = 1

    def abs_tables(self):
        return {
            "G17": {
                # < 1000/week = < 52k/year
                "individual_income_under_52k_australia": [
                    "P_1_149_Tot",
                    "P_150_299_Tot",
                    "P_300_399_Tot",
                    "P_400_499_Tot",
                    "P_500_649_Tot",
                    "P_650_799_Tot",
                    "P_800_999_Tot",
                ],
                # 1000-1999/week = 52k-104k/year
                "individual_income_52k_to_104k_australia": [
                    "P_1000_1249_Tot",
                    "P_1250_1499_Tot",
                    "P_1500_1749_Tot",
                    "P_1750_1999_Tot",
                ],
                # 2000+/week = 104k+/year
                "individual_income_over_104k_australia": [
                    "P_2000_2999_Tot",
                    "P_3000_3499_Tot",
                    "P_3500_more_Tot",
                ],
            },
        }

    def name_for_each_statistic(self):
        return {
            "individual_income_under_52k_australia": "Individual income < A$52k %",
            "individual_income_52k_to_104k_australia": "Individual income A$52k - A$104k %",
            "individual_income_over_104k_australia": "Individual income > A$104k %",
        }

    def unit_for_each_statistic(self):
        return self.same_for_each_name("percentage")

    def varname_for_each_statistic(self):
        return {
            "individual_income_under_52k_australia": "individual_income_under_52k_aud",
            "individual_income_52k_to_104k_australia": "individual_income_52k_to_104k_aud",
            "individual_income_over_104k_australia": "individual_income_over_104k_aud",
        }

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                INCOME,
                {
                    "individual_income_under_52k_australia": "higher % of people who have individual income under A$52k",
                    "individual_income_over_104k_australia": "higher % of people who have individual income over A$104k",
                },
            ),
            **QuizQuestionSkip.several("individual_income_52k_to_104k_australia"),
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("australian-census")

    def country_inputs(self):
        return {"Australia": AustralianCounts(self.abs_tables())}

    def mutate_counts(self, counts):
        fractionalize(counts, *self.internal_statistic_names_list())


class CensusAustraliaIncomeHousehold(NationalCensusStatistics):
    version = 1

    def abs_tables(self):
        return {
            "G33": {
                # < 1000/week = < 52k/year
                "household_income_under_52k_australia": [
                    "Negative_Nil_income_Tot",
                    "HI_1_149_Tot",
                    "HI_150_299_Tot",
                    "HI_300_399_Tot",
                    "HI_400_499_Tot",
                    "HI_500_649_Tot",
                    "HI_650_799_Tot",
                    "HI_800_999_Tot",
                ],
                # 1000-1999/week = 52k-104k/year
                "household_income_52k_to_104k_australia": [
                    "HI_1000_1249_Tot",
                    "HI_1250_1499_Tot",
                    "HI_1500_1749_Tot",
                    "HI_1750_1999_Tot",
                ],
                # 2000+/week = 104k+/year
                "household_income_over_104k_australia": [
                    "HI_2000_2499_Tot",
                    "HI_2500_2999_Tot",
                    "HI_3000_3499_Tot",
                    "HI_3500_3999_Tot",
                    "HI_4000_more_Tot",
                ],
            },
        }

    def name_for_each_statistic(self):
        return {
            "household_income_under_52k_australia": "Household income < A$52k %",
            "household_income_52k_to_104k_australia": "Household income A$52k - A$104k %",
            "household_income_over_104k_australia": "Household income > A$104k %",
        }

    def unit_for_each_statistic(self):
        return self.same_for_each_name("percentage")

    def varname_for_each_statistic(self):
        return {
            "household_income_under_52k_australia": "household_income_under_52k_aud",
            "household_income_52k_to_104k_australia": "household_income_52k_to_104k_aud",
            "household_income_over_104k_australia": "household_income_over_104k_aud",
        }

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                INCOME,
                {
                    "household_income_under_52k_australia": "higher % of households that have household income under A$52k",
                    "household_income_over_104k_australia": "higher % of households that have household income over A$104k",
                },
            ),
            **QuizQuestionSkip.several("household_income_52k_to_104k_australia"),
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("australian-census")

    def country_inputs(self):
        return {"Australia": AustralianCounts(self.abs_tables(), weight="dwellings")}

    def mutate_counts(self, counts):
        fractionalize(counts, *self.internal_statistic_names_list())
