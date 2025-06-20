# pylint: disable=duplicate-code
from urbanstats.acs.load import ACSDataEntity
from urbanstats.games.quiz_question_metadata import (
    HOUSING_YEAR,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class HousingYearBuiltStatistics(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "year_built_1969_or_earlier": "% units built pre-1970",
            "year_built_1970_to_1979": "% units built in 1970s",
            "year_built_1980_to_1989": "% units built in 1980s",
            "year_built_1990_to_1999": "% units built in 1990s",
            "year_built_2000_to_2009": "% units built in 2000s",
            "year_built_2010_or_later": "% units built in 2010s+",
        }

    def varname_for_each_statistic(self):
        return {
            "year_built_1969_or_earlier": "built_pre_1970",
            "year_built_1970_to_1979": "built_1970s",
            "year_built_1980_to_1989": "built_1980s",
            "year_built_1990_to_1999": "built_1990s",
            "year_built_2000_to_2009": "built_2000s",
            "year_built_2010_or_later": "built_2010_plus",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("housing-acs")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                HOUSING_YEAR,
                {
                    "year_built_1969_or_earlier": "higher % of housing units built before 1970",
                    "year_built_2010_or_later": "higher % of housing units built in 2010 or later",
                },
            ),
            **QuizQuestionSkip.several(
                "year_built_1970_to_1979",
                "year_built_1980_to_1989",
                "year_built_1990_to_1999",
                "year_built_2000_to_2009",
            ),
        }

    def mutate_acs_results(self, statistics_table):
        fractionalize(
            statistics_table,
            "year_built_1969_or_earlier",
            "year_built_1970_to_1979",
            "year_built_1980_to_1989",
            "year_built_1990_to_1999",
            "year_built_2000_to_2009",
            "year_built_2010_or_later",
        )

    def acs_name(self):
        return "year_built"

    def acs_entity(self):
        return ACSDataEntity(
            "YEAR STRUCTURE BUILT",
            "total",
            "block group",
            {
                None: [
                    "Estimate!!Total:",
                ],
                "year_built_1969_or_earlier": [
                    "Estimate!!Total:!!Built 1939 or earlier",
                    "Estimate!!Total:!!Built 1940 to 1949",
                    "Estimate!!Total:!!Built 1950 to 1959",
                    "Estimate!!Total:!!Built 1960 to 1969",
                ],
                "year_built_1970_to_1979": [
                    "Estimate!!Total:!!Built 1970 to 1979",
                ],
                "year_built_1980_to_1989": [
                    "Estimate!!Total:!!Built 1980 to 1989",
                ],
                "year_built_1990_to_1999": [
                    "Estimate!!Total:!!Built 1990 to 1999",
                ],
                "year_built_2000_to_2009": [
                    "Estimate!!Total:!!Built 2000 to 2009",
                ],
                "year_built_2010_or_later": [
                    "Estimate!!Total:!!Built 2010 to 2019",
                    "Estimate!!Total:!!Built 2020 or later",
                ],
            },
        )
