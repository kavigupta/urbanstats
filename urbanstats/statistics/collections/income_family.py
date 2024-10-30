from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class IncomeFamily(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "household_income_under_50k": "Household Income < $50k %",
            "household_income_50k_to_100k": "Household Income $50k - $100k %",
            "household_income_over_100k": "Household Income > $100k %",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("income")

    def quiz_question_names(self):
        return {
            "household_income_under_50k": "higher % of households who have household income under $50k",
            "household_income_over_100k": "higher % of households who have household income over $100k",
        }

    def quiz_question_unused(self):
        return [
            "household_income_50k_to_100k",
        ]

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        fractionalize(
            statistics_table,
            "household_income_under_50k",
            "household_income_50k_to_100k",
            "household_income_over_100k",
        )

    def acs_name(self):
        return "personal_income"

    def acs_entity(self):
        return ACSDataEntity(
            "TENURE BY HOUSEHOLD INCOME IN THE PAST 12 MONTHS (IN 2021 INFLATION-ADJUSTED DOLLARS)",
            "occupied",
            "tract",
            {
                "household_income_under_50k": [
                    "Estimate!!Total:!!Owner occupied:!!Less than $5,000",
                    "Estimate!!Total:!!Owner occupied:!!$5,000 to $9,999",
                    "Estimate!!Total:!!Owner occupied:!!$10,000 to $14,999",
                    "Estimate!!Total:!!Owner occupied:!!$15,000 to $19,999",
                    "Estimate!!Total:!!Owner occupied:!!$20,000 to $24,999",
                    "Estimate!!Total:!!Owner occupied:!!$25,000 to $34,999",
                    "Estimate!!Total:!!Owner occupied:!!$35,000 to $49,999",
                    "Estimate!!Total:!!Renter occupied:!!Less than $5,000",
                    "Estimate!!Total:!!Renter occupied:!!$5,000 to $9,999",
                    "Estimate!!Total:!!Renter occupied:!!$10,000 to $14,999",
                    "Estimate!!Total:!!Renter occupied:!!$15,000 to $19,999",
                    "Estimate!!Total:!!Renter occupied:!!$20,000 to $24,999",
                    "Estimate!!Total:!!Renter occupied:!!$25,000 to $34,999",
                    "Estimate!!Total:!!Renter occupied:!!$35,000 to $49,999",
                ],
                "household_income_50k_to_100k": [
                    "Estimate!!Total:!!Renter occupied:!!$50,000 to $74,999",
                    "Estimate!!Total:!!Renter occupied:!!$75,000 to $99,999",
                    "Estimate!!Total:!!Owner occupied:!!$50,000 to $74,999",
                    "Estimate!!Total:!!Owner occupied:!!$75,000 to $99,999",
                ],
                "household_income_over_100k": [
                    "Estimate!!Total:!!Renter occupied:!!$100,000 to $149,999",
                    "Estimate!!Total:!!Renter occupied:!!$150,000 or more",
                    "Estimate!!Total:!!Owner occupied:!!$100,000 to $149,999",
                    "Estimate!!Total:!!Owner occupied:!!$150,000 or more",
                ],
                None: [
                    "Estimate!!Total:",
                    "Estimate!!Total:!!Owner occupied:",
                    "Estimate!!Total:!!Renter occupied:",
                ],
            },
        )
