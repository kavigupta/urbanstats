from urbanstats.acs.load import ACSDataEntity
from urbanstats.games.quiz_question_metadata import HOUSING, QuizQuestionDescriptor
from urbanstats.statistics.collections.census_canada_housing_rent import (
    canadian_tenure_and_burden_tables,
)
from urbanstats.statistics.national_census import (
    ACSCounts,
    NationalCensusStatistics,
    StatCanCounts,
)
from urbanstats.statistics.utils import fractionalize


class HousingRentOrOwn(NationalCensusStatistics):
    version = {"USA": 1, "Canada": 1}

    def legacy_statistic_names(self):
        # Canada's, from before the two countries' statistics were merged
        return {"Renter % [StatCan]": "Renter %"}

    def name_for_each_statistic(self):
        return {
            "rent_or_own_rent": "Renter %",
        }

    def unit_for_each_statistic(self):
        return self.same_for_each_name("percentage")

    def varname_for_each_statistic(self):
        return {
            "rent_or_own_rent": "renter",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("housing-acs")

    def quiz_question_descriptors(self):
        return {
            "rent_or_own_rent": QuizQuestionDescriptor(
                "higher % of people who are renters", HOUSING
            ),
        }

    def mutate_counts(self, counts):
        fractionalize(counts, "rent_or_own_rent", "rent_or_own_own")

    def country_inputs(self):
        return {
            "USA": ACSCounts(self.acs_entity()),
            "Canada": StatCanCounts(canadian_tenure_and_burden_tables()),
        }

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
