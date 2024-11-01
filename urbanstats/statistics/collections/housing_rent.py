from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class HousingRent(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "rent_1br_under_750": "1BR Rent < $750 %",
            "rent_1br_750_to_1500": "1BR Rent $750 - $1500 %",
            "rent_1br_over_1500": "1BR Rent > $1500 %",
            "rent_2br_under_750": "2BR Rent < $750 %",
            "rent_2br_750_to_1500": "2BR Rent $750 - $1500 %",
            "rent_2br_over_1500": "2BR Rent > $1500 %",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("housing-acs")

    def quiz_question_names(self):
        return {
            "rent_1br_under_750": "higher % of units with 1br rent under $750",
            "rent_1br_over_1500": "higher % of units with 1br rent over $1500",
            "rent_2br_under_750": "higher % of units with 2br rent under $750",
            "rent_2br_over_1500": "higher % of units with 2br rent over $1500",
        }

    def quiz_question_unused(self):
        return [
            "rent_1br_750_to_1500",
            "rent_2br_750_to_1500",
        ]

    def mutate_acs_results(self, statistics_table):
        fractionalize(
            statistics_table,
            "rent_1br_under_750",
            "rent_1br_750_to_1500",
            "rent_1br_over_1500",
        )
        fractionalize(
            statistics_table,
            "rent_2br_under_750",
            "rent_2br_750_to_1500",
            "rent_2br_over_1500",
        )

    def acs_name(self):
        return "rent"

    def acs_entity(self):
        return ACSDataEntity(
            "BEDROOMS BY GROSS RENT",
            "occupied",
            "block group",
            {
                "rent_1br_under_750": [
                    "Estimate!!Total:!!1 bedroom:!!With cash rent:!!Less than $300",
                    "Estimate!!Total:!!1 bedroom:!!With cash rent:!!$300 to $499",
                    "Estimate!!Total:!!1 bedroom:!!With cash rent:!!$500 to $749",
                ],
                "rent_1br_750_to_1500": [
                    "Estimate!!Total:!!1 bedroom:!!With cash rent:!!$750 to $999",
                    "Estimate!!Total:!!1 bedroom:!!With cash rent:!!$1,000 to $1,499",
                ],
                "rent_1br_over_1500": [
                    "Estimate!!Total:!!1 bedroom:!!With cash rent:!!$1,500 or more",
                ],
                "rent_2br_under_750": [
                    "Estimate!!Total:!!2 bedrooms:!!With cash rent:!!Less than $300",
                    "Estimate!!Total:!!2 bedrooms:!!With cash rent:!!$300 to $499",
                    "Estimate!!Total:!!2 bedrooms:!!With cash rent:!!$500 to $749",
                ],
                "rent_2br_750_to_1500": [
                    "Estimate!!Total:!!2 bedrooms:!!With cash rent:!!$750 to $999",
                    "Estimate!!Total:!!2 bedrooms:!!With cash rent:!!$1,000 to $1,499",
                ],
                "rent_2br_over_1500": [
                    "Estimate!!Total:!!2 bedrooms:!!With cash rent:!!$1,500 or more",
                ],
                "rent_with_cash_rent": [
                    "Estimate!!Total:!!1 bedroom:!!With cash rent:",
                    "Estimate!!Total:!!2 bedrooms:!!With cash rent:",
                    "Estimate!!Total:!!3 or more bedrooms:!!With cash rent:",
                    "Estimate!!Total:!!No bedroom:!!With cash rent:",
                ],
                None: [
                    "Estimate!!Total:",
                    "Estimate!!Total:!!1 bedroom:",
                    "Estimate!!Total:!!2 bedrooms:!!No cash rent",
                    "Estimate!!Total:!!2 bedrooms:",
                    "Estimate!!Total:!!1 bedroom:!!No cash rent",
                    "Estimate!!Total:!!3 or more bedrooms:",
                    "Estimate!!Total:!!3 or more bedrooms:!!No cash rent",
                    "Estimate!!Total:!!3 or more bedrooms:!!With cash rent:!!$1,000 to $1,499",
                    "Estimate!!Total:!!3 or more bedrooms:!!With cash rent:!!$1,500 or more",
                    "Estimate!!Total:!!3 or more bedrooms:!!With cash rent:!!$300 to $499",
                    "Estimate!!Total:!!3 or more bedrooms:!!With cash rent:!!$500 to $749",
                    "Estimate!!Total:!!3 or more bedrooms:!!With cash rent:!!$750 to $999",
                    "Estimate!!Total:!!3 or more bedrooms:!!With cash rent:!!Less than $300",
                    "Estimate!!Total:!!No bedroom:",
                    "Estimate!!Total:!!No bedroom:!!No cash rent",
                    "Estimate!!Total:!!No bedroom:!!With cash rent:!!$1,000 to $1,499",
                    "Estimate!!Total:!!No bedroom:!!With cash rent:!!$1,500 or more",
                    "Estimate!!Total:!!No bedroom:!!With cash rent:!!$300 to $499",
                    "Estimate!!Total:!!No bedroom:!!With cash rent:!!$500 to $749",
                    "Estimate!!Total:!!No bedroom:!!With cash rent:!!$750 to $999",
                    "Estimate!!Total:!!No bedroom:!!With cash rent:!!Less than $300",
                ],
            },
        )
