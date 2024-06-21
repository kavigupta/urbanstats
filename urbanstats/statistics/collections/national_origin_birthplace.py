from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSUSPRStatisticsColection
from urbanstats.statistics.utils import fractionalize


class NationalOriginBirthplaceStatistics(ACSUSPRStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "birthplace_non_us": "Born outside US %",
            "birthplace_us_not_state": "Born in us outside state %",
            "birthplace_us_state": "Born in state of residence %",
        }

    def category_for_each_statistic(self):
        return self.same_for_each_name("national_origin")

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("birthplace")

    def quiz_question_names(self):
        return {
            "birthplace_non_us": "higher % of people who were born outside the US",
            "birthplace_us_not_state": "higher % of people who were born in the US and outside their state of residence",
            "birthplace_us_state": "higher % of people who were born in their state of residence",
        }

    def quiz_question_unused(self):
        return []

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        fractionalize(
            statistics_table,
            "birthplace_non_us",
            "birthplace_us_not_state",
            "birthplace_us_state",
        )

    def acs_name(self):
        return "birthplace"

    def acs_entities(self):
        return [
            ACSDataEntity(
                "PLACE OF BIRTH BY SEX IN THE UNITED STATES",
                "population",
                "tract",
                {
                    None: [
                        "Estimate!!Total:",
                        "Estimate!!Total:!!Born in other state in the United States:!!Female",
                        "Estimate!!Total:!!Born in other state in the United States:!!Male",
                        "Estimate!!Total:!!Born in state of residence:!!Female",
                        "Estimate!!Total:!!Born in state of residence:!!Male",
                        "Estimate!!Total:!!Female",
                        "Estimate!!Total:!!Foreign born:!!Female",
                        "Estimate!!Total:!!Foreign born:!!Male",
                        "Estimate!!Total:!!Male",
                        "Estimate!!Total:!!Native; born outside the United States:!!Female",
                        "Estimate!!Total:!!Native; born outside the United States:!!Male",
                    ],
                    "birthplace_non_us": [
                        "Estimate!!Total:!!Foreign born:",
                    ],
                    "birthplace_us_not_state": [
                        "Estimate!!Total:!!Native; born outside the United States:",
                        "Estimate!!Total:!!Born in other state in the United States:",
                    ],
                    "birthplace_us_state": [
                        "Estimate!!Total:!!Born in state of residence:",
                    ],
                },
            ),
            ACSDataEntity(
                "PLACE OF BIRTH BY SEX IN PUERTO RICO",
                "population",
                "tract",
                {
                    None: [
                        "Estimate!!Total:",
                        "Estimate!!Total:!!Born in Puerto Rico:!!Female",
                        "Estimate!!Total:!!Born in Puerto Rico:!!Male",
                        "Estimate!!Total:!!Born in the United States:!!Female",
                        "Estimate!!Total:!!Born in the United States:!!Male",
                        "Estimate!!Total:!!Female",
                        "Estimate!!Total:!!Foreign born:!!Female",
                        "Estimate!!Total:!!Foreign born:!!Male",
                        "Estimate!!Total:!!Male",
                        "Estimate!!Total:!!Native; born elsewhere:!!Female",
                        "Estimate!!Total:!!Native; born elsewhere:!!Male",
                    ],
                    "birthplace_non_us": [
                        "Estimate!!Total:!!Foreign born:",
                    ],
                    "birthplace_us_not_state": [
                        "Estimate!!Total:!!Native; born elsewhere:",
                        "Estimate!!Total:!!Born in the United States:",
                    ],
                    "birthplace_us_state": [
                        "Estimate!!Total:!!Born in Puerto Rico:",
                    ],
                },
            ),
        ]
