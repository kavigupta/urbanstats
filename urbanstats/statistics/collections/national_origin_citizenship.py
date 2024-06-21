from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSUSPRStatisticsColection
from urbanstats.statistics.utils import fractionalize


class NationalOriginCitizenshipStatistics(ACSUSPRStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "citizenship_citizen_by_birth": "Citizen by Birth %",
            "citizenship_citizen_by_naturalization": "Citizen by Naturalization %",
            "citizenship_not_citizen": "Non-citizen %",
        }

    def category_for_each_statistic(self):
        return self.same_for_each_name("national_origin")

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("citizenship")

    def quiz_question_names(self):
        return {
            "citizenship_citizen_by_birth": "higher % of residents who are citizens by birth",
            "citizenship_citizen_by_naturalization": "higher % of residents who are citizens by naturalization",
            "citizenship_not_citizen": "higher % of residents who are non-citizens",
        }

    def quiz_question_unused(self):
        return []

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        fractionalize(
            statistics_table,
            "citizenship_citizen_by_birth",
            "citizenship_citizen_by_naturalization",
            "citizenship_not_citizen",
        )

    def acs_name(self):
        return "citizenship"

    def acs_entities(self):
        return [
            ACSDataEntity(
                "NATIVITY AND CITIZENSHIP STATUS IN THE UNITED STATES",
                "population",
                "tract",
                {
                    None: [
                        "Estimate!!Total:",
                    ],
                    "citizenship_citizen_by_birth": [
                        "Estimate!!Total:!!U.S. citizen, born in Puerto Rico or U.S. Island Areas",
                        "Estimate!!Total:!!U.S. citizen, born in the United States",
                        "Estimate!!Total:!!U.S. citizen, born abroad of American parent(s)",
                    ],
                    "citizenship_citizen_by_naturalization": [
                        "Estimate!!Total:!!U.S. citizen by naturalization",
                    ],
                    "citizenship_not_citizen": [
                        "Estimate!!Total:!!Not a U.S. citizen",
                    ],
                },
            ),
            ACSDataEntity(
                "NATIVITY AND CITIZENSHIP STATUS IN PUERTO RICO",
                "population",
                "tract",
                {
                    None: [
                        "Estimate!!Total:",
                    ],
                    "citizenship_citizen_by_birth": [
                        "Estimate!!Total:!!U.S. citizen, born abroad of American parent(s)",
                        "Estimate!!Total:!!U.S. citizen, born in Puerto Rico",
                        "Estimate!!Total:!!U.S. citizen, born in U.S. or U.S. Island Areas",
                    ],
                    "citizenship_citizen_by_naturalization": [
                        "Estimate!!Total:!!U.S. citizen by naturalization",
                    ],
                    "citizenship_not_citizen": [
                        "Estimate!!Total:!!Not a U.S. citizen",
                    ],
                },
            ),
        ]
