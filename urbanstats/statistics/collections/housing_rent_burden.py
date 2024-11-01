from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class HousingRentBurden(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "rent_burden_under_20": "Rent/Income < 20%",
            "rent_burden_20_to_40": "Rent/Income 20%-40%",
            "rent_burden_over_40": "Rent/Income > 40%",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("housing-acs")

    def quiz_question_names(self):
        return {
            "rent_burden_under_20": "higher % of people whose rent is less than 20% of their income",
            "rent_burden_over_40": "higher % of people whose rent is greater than 40% of their income",
        }

    def quiz_question_unused(self):
        return [
            "rent_burden_20_to_40",
        ]

    def mutate_acs_results(self, statistics_table, shapefile_table):
        fractionalize(
            statistics_table,
            "rent_burden_under_20",
            "rent_burden_20_to_40",
            "rent_burden_over_40",
        )

    def acs_name(self):
        return "rent_burden"

    def acs_entity(self):
        return ACSDataEntity(
            "GROSS RENT AS A PERCENTAGE OF HOUSEHOLD INCOME IN THE PAST 12 MONTHS",
            "occupied",
            "block group",
            {
                None: [
                    "Estimate!!Total:",
                    "Estimate!!Total:!!Not computed",
                ],
                "rent_burden_under_20": [
                    "Estimate!!Total:!!Less than 10.0 percent",
                    "Estimate!!Total:!!10.0 to 14.9 percent",
                    "Estimate!!Total:!!15.0 to 19.9 percent",
                ],
                "rent_burden_20_to_40": [
                    "Estimate!!Total:!!20.0 to 24.9 percent",
                    "Estimate!!Total:!!25.0 to 29.9 percent",
                    "Estimate!!Total:!!30.0 to 34.9 percent",
                    "Estimate!!Total:!!35.0 to 39.9 percent",
                ],
                "rent_burden_over_40": [
                    "Estimate!!Total:!!40.0 to 49.9 percent",
                    "Estimate!!Total:!!50.0 percent or more",
                ],
            },
        )
