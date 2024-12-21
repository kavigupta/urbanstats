from urbanstats.acs.load import ACSDataEntity
from urbanstats.games.quiz_question_metadata import (
    HEATING,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class HouseHeating(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "heating_utility_gas": "Utility gas heating %",
            "heating_electricity": "Electricity heating %",
            "heating_bottled_tank_lp_gas": "Bottled, tank, or LP gas heating %",
            "heating_feul_oil_kerosene": "Fuel oil, kerosene, etc. heating %",
            "heating_other": "Other fuel heating %",
            "heating_no": "No heating %",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("climate-acs")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                HEATING,
                {
                    "heating_utility_gas": "!FULL Which has a larger % of homes heated using utility gas?",
                    "heating_electricity": "!FULL Which has a larger % of homes heated using electricity?",
                },
            ),
            **QuizQuestionSkip.several(
                "heating_bottled_tank_lp_gas",
                "heating_feul_oil_kerosene",
                "heating_other",
                "heating_no",
            ),
        }

    def mutate_acs_results(self, statistics_table):
        fractionalize(statistics_table, *self.name_for_each_statistic().keys())

    def acs_name(self):
        return "house_heating"

    def acs_entity(self):
        return ACSDataEntity(
            "HOUSE HEATING FUEL",
            "occupied",
            "block group",
            {
                None: [
                    "Estimate!!Total:",
                ],
                "heating_utility_gas": [
                    "Estimate!!Total:!!Utility gas",
                ],
                "heating_electricity": [
                    "Estimate!!Total:!!Electricity",
                ],
                "heating_bottled_tank_lp_gas": [
                    "Estimate!!Total:!!Bottled, tank, or LP gas",
                ],
                "heating_feul_oil_kerosene": [
                    "Estimate!!Total:!!Fuel oil, kerosene, etc.",
                ],
                "heating_other": [
                    "Estimate!!Total:!!Coal or coke",
                    "Estimate!!Total:!!Other fuel",
                    "Estimate!!Total:!!Solar energy",
                    "Estimate!!Total:!!Wood",
                ],
                "heating_no": [
                    "Estimate!!Total:!!No fuel used",
                ],
            },
        )
