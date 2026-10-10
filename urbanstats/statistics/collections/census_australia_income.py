from urbanstats.games.quiz_question_metadata import (
    INCOME,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.collections.census_australia_same_as_us import (
    CensusAustraliaSA1,
)
from urbanstats.statistics.utils import fractionalize


class CensusAustraliaIncomeIndividual(CensusAustraliaSA1):
    version = 1

    def abs_tables(self):
        return [
            (
                "G17",
                {
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
            )
        ]

    def name_for_each_statistic(self):
        return {
            "individual_income_under_52k_australia": "Individual income < A$52k % [AuBS]",
            "individual_income_52k_to_104k_australia": "Individual income A$52k - A$104k % [AuBS]",
            "individual_income_over_104k_australia": "Individual income > A$104k % [AuBS]",
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

    def post_process(self, statistic_table):
        statistic_table = statistic_table.copy()
        fractionalize(statistic_table, *self.internal_statistic_names_list())
        return statistic_table
