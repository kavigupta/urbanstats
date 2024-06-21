from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class IncomePoverty(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "poverty_below_line": "Poverty %",
        }

    def category_for_each_statistic(self):
        return self.same_for_each_name("income")

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("income")

    def quiz_question_names(self):
        return {
            "poverty_below_line": "higher % of people who are in poverty",
        }

    def quiz_question_unused(self):
        return []

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        fractionalize(
            statistics_table,
            "poverty_above_line",
            "poverty_below_line",
        )
        del statistics_table["poverty_above_line"]

    def acs_name(self):
        return "poverty"

    def acs_entity(self):
        return ACSDataEntity(
            "POVERTY STATUS IN THE PAST 12 MONTHS BY AGE",
            "population",
            "tract",
            {
                None: [
                    "Estimate!!Total:",
                    "Estimate!!Total:!!Income in the past 12 months at or above poverty level:!!12 to 17 years",
                    "Estimate!!Total:!!Income in the past 12 months at or above poverty level:!!18 to 59 years",
                    "Estimate!!Total:!!Income in the past 12 months at or above poverty level:!!6 to 11 years",
                    "Estimate!!Total:!!Income in the past 12 months at or above poverty level:!!60 to 74 years",
                    "Estimate!!Total:!!Income in the past 12 months at or above poverty level:!!75 to 84 years",
                    "Estimate!!Total:!!Income in the past 12 months at or above poverty level:!!85 years and over",
                    "Estimate!!Total:!!Income in the past 12 months at or above poverty level:!!Under 6 years",
                    "Estimate!!Total:!!Income in the past 12 months below poverty level:!!12 to 17 years",
                    "Estimate!!Total:!!Income in the past 12 months below poverty level:!!18 to 59 years",
                    "Estimate!!Total:!!Income in the past 12 months below poverty level:!!6 to 11 years",
                    "Estimate!!Total:!!Income in the past 12 months below poverty level:!!60 to 74 years",
                    "Estimate!!Total:!!Income in the past 12 months below poverty level:!!75 to 84 years",
                    "Estimate!!Total:!!Income in the past 12 months below poverty level:!!85 years and over",
                    "Estimate!!Total:!!Income in the past 12 months below poverty level:!!Under 6 years",
                ],
                "poverty_above_line": [
                    "Estimate!!Total:!!Income in the past 12 months at or above poverty level:",
                ],
                "poverty_below_line": [
                    "Estimate!!Total:!!Income in the past 12 months below poverty level:",
                ],
            },
        )
