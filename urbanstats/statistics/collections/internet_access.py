from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class InternetAccessStatistics(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "internet_no_access": "No internet access %",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("internet")

    def quiz_question_names(self):
        return {
            "internet_no_access": "higher % of people who have no internet access",
        }

    def mutate_acs_results(self, statistics_table, shapefile_table):
        fractionalize(
            statistics_table,
            "internet_access",
            "internet_no_access",
        )
        del statistics_table["internet_access"]

    def acs_name(self):
        return "internet"

    def acs_entity(self):
        return ACSDataEntity(
            "INTERNET SUBSCRIPTIONS IN HOUSEHOLD",
            "occupied",
            "block group",
            {
                None: [
                    "Estimate!!Total:",
                    "Estimate!!Total:!!With an Internet subscription!!Broadband such as cable, fiber optic, or DSL",
                    "Estimate!!Total:!!With an Internet subscription!!Dial-up alone",
                    "Estimate!!Total:!!With an Internet subscription!!Other service",
                    "Estimate!!Total:!!With an Internet subscription!!Satellite Internet service",
                ],
                "internet_access": [
                    "Estimate!!Total:!!Internet access without a subscription",
                    "Estimate!!Total:!!With an Internet subscription",
                ],
                "internet_no_access": [
                    "Estimate!!Total:!!No Internet access",
                ],
            },
        )
