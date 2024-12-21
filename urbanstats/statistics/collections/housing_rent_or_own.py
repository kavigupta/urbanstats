from urbanstats.acs.load import ACSDataEntity
from urbanstats.games.quiz_question_metadata import HOUSING, QuizQuestionDescriptor
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class HousingRentOrOwn(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "rent_or_own_rent": "Renter %",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("housing-acs")

    def quiz_question_descriptors(self):
        return {
            "rent_or_own_rent": QuizQuestionDescriptor(
                "higher % of people who are renters", HOUSING
            ),
        }

    def mutate_acs_results(self, statistics_table):
        fractionalize(
            statistics_table,
            "rent_or_own_rent",
            "rent_or_own_own",
        )
        del statistics_table["rent_or_own_own"]

    def acs_name(self):
        return "rent_or_own"

    def acs_entity(self):
        return ACSDataEntity(
            "TENURE",
            "occupied",
            "block group",
            {
                "rent_or_own_rent": ["Estimate!!Total:!!Renter occupied"],
                "rent_or_own_own": ["Estimate!!Total:!!Owner occupied"],
                None: ["Estimate!!Total:"],
            },
        )
