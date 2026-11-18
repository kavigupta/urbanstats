# pylint: disable=duplicate-code
from urbanstats.acs.load import ACSDataEntity
from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.games.quiz_question_metadata import HOUSING, QuizQuestionDescriptor
from urbanstats.statistics.national_census import (
    ACSCounts,
    NationalCensusStatistics,
    StatCanCounts,
)

# Canada's top bin is 5+; 5.75 is the size that makes US regions' values from 5+ match those from
# the ACS's 5, 6, and 7+ bins best.
HOUSEHOLD_SIZES = {
    "household_size_1": 1,
    "household_size_2": 2,
    "household_size_3": 3,
    "household_size_4": 4,
    "household_size_5_plus": 5.75,
}


class HouseholdSizeStatistics(NationalCensusStatistics):
    version = 3

    def name_for_each_statistic(self):
        return {
            "household_size_pw": "PW Household Size",
        }

    def unit_for_each_statistic(self):
        return self.same_for_each_name("number")

    def varname_for_each_statistic(self):
        return {
            "household_size_pw": "household_size_pw",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("housing-acs")

    def quiz_question_descriptors(self):
        return {
            "household_size_pw": QuizQuestionDescriptor(
                "higher average population weighted household size"
                "!TOOLTIP The average household size a person is in;"
                " i.e., the average over all people of the number of"
                " people in their household. This is population-weighted,"
                " meaning that if there is one household of 3 and three households"
                " of 1, the average household size is 2, not 1.5.",
                HOUSING,
            ),
        }

    def mutate_counts(self, counts):
        numerator = sum(counts[k] * size**2 for k, size in HOUSEHOLD_SIZES.items())
        denominator = sum(counts[k] * size for k, size in HOUSEHOLD_SIZES.items())
        counts["household_size_pw"] = numerator / denominator

    def country_inputs(self):
        return {
            "USA": ACSCounts(self.acs_entity()),
            "Canada": StatCanCounts(self.census_tables_canada()),
        }

    def census_tables_canada(self):
        return CensusTables(
            ["Total - Private households by household size - 100% data"],
            {
                None: [
                    "Total - Private households by household size - 100% data",
                ],
                "household_size_1": [
                    "  1 person",
                ],
                "household_size_2": [
                    "  2 persons",
                ],
                "household_size_3": [
                    "  3 persons",
                ],
                "household_size_4": [
                    "  4 persons",
                ],
                "household_size_5_plus": [
                    "  5 or more persons",
                ],
            },
            "population",
        )

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
                "household_size_5_plus": [
                    "Estimate!!Total:!!Owner occupied:!!5-person household",
                    "Estimate!!Total:!!Renter occupied:!!5-person household",
                    "Estimate!!Total:!!Owner occupied:!!6-person household",
                    "Estimate!!Total:!!Renter occupied:!!6-person household",
                    "Estimate!!Total:!!Owner occupied:!!7-or-more person household",
                    "Estimate!!Total:!!Renter occupied:!!7-or-more person household",
                ],
            },
        )
