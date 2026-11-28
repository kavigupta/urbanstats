from urbanstats.acs.load import ACSDataEntity
from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.games.quiz_question_metadata import (
    MARRIAGE,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.national_census import (
    ACSCounts,
    AustralianCounts,
    NationalCensusStatistics,
    StatCanCounts,
)
from urbanstats.statistics.utils import fractionalize


class MarriageStatistics(NationalCensusStatistics):
    version = 2

    def name_for_each_statistic(self):
        return {
            "marriage_never_married": "Never Married %",
            "marriage_married_not_divorced": "Married (not divorced) %",
            "marriage_divorced": "Divorced %",
        }

    def unit_for_each_statistic(self):
        return self.same_for_each_name("percentage")

    def varname_for_each_statistic(self):
        return {
            "marriage_never_married": "never_married",
            "marriage_married_not_divorced": "married",
            "marriage_divorced": "divorced",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("marriage")

    def quiz_question_descriptors(self):
        return {
            "marriage_divorced": QuizQuestionDescriptor(
                "higher % of people who are divorced", MARRIAGE
            ),
            **QuizQuestionSkip.several(
                "marriage_married_not_divorced", "marriage_never_married"
            ),
        }

    def mutate_counts(self, counts):
        fractionalize(
            counts,
            "marriage_never_married",
            "marriage_married_not_divorced",
            "marriage_divorced",
        )

    def country_inputs(self):
        return {
            "USA": ACSCounts(self.acs_entity()),
            "Canada": StatCanCounts(self.census_tables_canada()),
            "Australia": AustralianCounts(self.abs_tables()),
        }

    def abs_tables(self):
        # Registered (legal) marital status, persons 15+. As in the US, separated people are still
        # married and widowed people count as married.
        return {
            "G05": {
                "marriage_never_married": ["P_Tot_Never_married"],
                "marriage_married_not_divorced": [
                    "P_Tot_Married",
                    "P_Tot_Separated",
                    "P_Tot_Widowed",
                ],
                "marriage_divorced": ["P_Tot_Divorced"],
            }
        }

    def census_tables_canada(self):
        return CensusTables(
            [
                "Total - Marital status for the total population aged 15 years and over - 100% data"
            ],
            {
                None: [
                    "Total - Marital status for the total population aged 15 years and over - 100% data",
                    "  Married or living common-law",
                    "    Living common-law",
                    "  Not married and not living common-law",
                ],
                "marriage_never_married": [
                    "    Not married and not living common law - Never married",
                    "      Living common law - Never married",
                ],
                "marriage_married_not_divorced": [
                    "    Married",
                    "      Living common law - Separated",
                    "      Living common law - Widowed",
                    "    Not married and not living common law - Widowed",
                ],
                "marriage_divorced": [
                    "      Living common law - Divorced",
                    "    Not married and not living common law - Separated",
                    "    Not married and not living common law - Divorced",
                ],
            },
            "population",
        )

    def acs_entity(self):
        return ACSDataEntity(
            "SEX BY MARITAL STATUS FOR THE POPULATION 15 YEARS AND OVER",
            "population_18",
            "block group",
            {
                None: [
                    "Estimate!!Total:",
                    "Estimate!!Total:!!Female:",
                    "Estimate!!Total:!!Female:!!Now married:!!Married, spouse absent:",
                    "Estimate!!Total:!!Female:!!Now married:!!Married, spouse absent:!!Other",
                    "Estimate!!Total:!!Female:!!Now married:!!Married, spouse absent:!!Separated",
                    "Estimate!!Total:!!Female:!!Now married:!!Married, spouse present",
                    "Estimate!!Total:!!Male:",
                    "Estimate!!Total:!!Male:!!Now married:!!Married, spouse absent:",
                    "Estimate!!Total:!!Male:!!Now married:!!Married, spouse absent:!!Other",
                    "Estimate!!Total:!!Male:!!Now married:!!Married, spouse absent:!!Separated",
                    "Estimate!!Total:!!Male:!!Now married:!!Married, spouse present",
                ],
                "marriage_never_married": [
                    "Estimate!!Total:!!Female:!!Never married",
                    "Estimate!!Total:!!Male:!!Never married",
                ],
                "marriage_married_not_divorced": [
                    "Estimate!!Total:!!Female:!!Now married:",
                    "Estimate!!Total:!!Male:!!Now married:",
                    "Estimate!!Total:!!Female:!!Widowed",
                    "Estimate!!Total:!!Male:!!Widowed",
                ],
                "marriage_divorced": [
                    "Estimate!!Total:!!Female:!!Divorced",
                    "Estimate!!Total:!!Male:!!Divorced",
                ],
            },
        )
