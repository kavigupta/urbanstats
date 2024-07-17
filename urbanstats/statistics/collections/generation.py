from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class GenerationStatistics(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "generation_silent": "Silent %",
            "generation_boomer": "Boomer %",
            "generation_genx": "Gen X %",
            "generation_millenial": "Millennial %",
            "generation_genz": "Gen Z %",
            "generation_genalpha": "Gen Alpha %",
        }

    def category_for_each_statistic(self):
        return self.same_for_each_name("generation")

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("generation")

    def quiz_question_names(self):
        return {
            "generation_silent": "higher % of people who are silent generation!TOOLTIP born before 1946",
            "generation_boomer": "higher % of people who are boomers!TOOLTIP born between 1946 and 1966",
            "generation_genx": "higher % of people who are gen x!TOOLTIP born between 1967 and 1981",
            "generation_millenial": "higher % of people who are millennials!TOOLTIP born between 1982 and 1996",
            "generation_genz": "higher % of people who are gen z!TOOLTIP born between 1997 and 2011",
            "generation_genalpha": "higher % of people who are gen alpha!TOOLTIP born between 2012 and 2021",
        }

    def quiz_question_unused(self):
        return []

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        fractionalize(
            statistics_table,
            "generation_silent",
            "generation_boomer",
            "generation_genx",
            "generation_millenial",
            "generation_genz",
            "generation_genalpha",
        )

    def acs_name(self):
        return "generation"

    def acs_entity(self):
        return ACSDataEntity(
            # collected in 2021, so generations are =, and we are using []
            # silent (1928-1945) = 76-93 [75, inf] which is [-inf, 1946]
            # boomer (1946-1964) = 57-75 [55, 74] which is [1946, 1966]
            # genx (1965-1980) = 41-56 [40, 54] which is [1967, 1981]
            # millenial (1981-1996) = 25-40 [25, 39] which is [1982, 1996]
            # genz (1997-2012) = 9-24 [10, 24] which is [1997, 2011]
            # genalpha (2013-2025) = 0-8 [0, 9] which is [2012, 2021]
            "SEX BY AGE",
            "population",
            "block group",
            {
                "generation_total": [
                    "Estimate!!Total:",
                ],
                "generation_silent": [
                    # 75+
                    "Estimate!!Total:!!Male:!!75 to 79 years",
                    "Estimate!!Total:!!Male:!!80 to 84 years",
                    "Estimate!!Total:!!Male:!!85 years and over",
                    "Estimate!!Total:!!Female:!!75 to 79 years",
                    "Estimate!!Total:!!Female:!!80 to 84 years",
                    "Estimate!!Total:!!Female:!!85 years and over",
                ],
                "generation_boomer": [
                    # 55-74
                    "Estimate!!Total:!!Male:!!55 to 59 years",
                    "Estimate!!Total:!!Male:!!60 and 61 years",
                    "Estimate!!Total:!!Male:!!62 to 64 years",
                    "Estimate!!Total:!!Male:!!65 and 66 years",
                    "Estimate!!Total:!!Male:!!67 to 69 years",
                    "Estimate!!Total:!!Male:!!70 to 74 years",
                    "Estimate!!Total:!!Female:!!55 to 59 years",
                    "Estimate!!Total:!!Female:!!60 and 61 years",
                    "Estimate!!Total:!!Female:!!62 to 64 years",
                    "Estimate!!Total:!!Female:!!65 and 66 years",
                    "Estimate!!Total:!!Female:!!67 to 69 years",
                    "Estimate!!Total:!!Female:!!70 to 74 years",
                ],
                "generation_genx": [
                    # 40-54
                    "Estimate!!Total:!!Male:!!40 to 44 years",
                    "Estimate!!Total:!!Male:!!45 to 49 years",
                    "Estimate!!Total:!!Male:!!50 to 54 years",
                    "Estimate!!Total:!!Female:!!40 to 44 years",
                    "Estimate!!Total:!!Female:!!45 to 49 years",
                    "Estimate!!Total:!!Female:!!50 to 54 years",
                ],
                "generation_millenial": [
                    # 25-39
                    "Estimate!!Total:!!Male:!!25 to 29 years",
                    "Estimate!!Total:!!Male:!!30 to 34 years",
                    "Estimate!!Total:!!Male:!!35 to 39 years",
                    "Estimate!!Total:!!Female:!!25 to 29 years",
                    "Estimate!!Total:!!Female:!!30 to 34 years",
                    "Estimate!!Total:!!Female:!!35 to 39 years",
                ],
                "generation_genz": [
                    # 10-24
                    "Estimate!!Total:!!Male:!!10 to 14 years",
                    "Estimate!!Total:!!Male:!!15 to 17 years",
                    "Estimate!!Total:!!Male:!!18 and 19 years",
                    "Estimate!!Total:!!Male:!!20 years",
                    "Estimate!!Total:!!Male:!!21 years",
                    "Estimate!!Total:!!Male:!!22 to 24 years",
                    "Estimate!!Total:!!Female:!!10 to 14 years",
                    "Estimate!!Total:!!Female:!!15 to 17 years",
                    "Estimate!!Total:!!Female:!!18 and 19 years",
                    "Estimate!!Total:!!Female:!!20 years",
                    "Estimate!!Total:!!Female:!!21 years",
                    "Estimate!!Total:!!Female:!!22 to 24 years",
                ],
                "generation_genalpha": [
                    # 0-9
                    "Estimate!!Total:!!Male:!!Under 5 years",
                    "Estimate!!Total:!!Male:!!5 to 9 years",
                    "Estimate!!Total:!!Female:!!Under 5 years",
                    "Estimate!!Total:!!Female:!!5 to 9 years",
                ],
                None: [
                    "Estimate!!Total:!!Female:",
                    "Estimate!!Total:!!Male:",
                ],
            },
        )
