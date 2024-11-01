from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class MarriageStatistics(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "marriage_never_married": "Never Married %",
            "marriage_married_not_divorced": "Married (not divorced) %",
            "marriage_divorced": "Divorced %",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("marriage")

    def quiz_question_names(self):
        return {
            "marriage_divorced": "higher % of people who are divorced",
        }

    def quiz_question_unused(self):
        return ["marriage_married_not_divorced", "marriage_never_married"]

    def mutate_acs_results(self, statistics_table, shapefile_table):
        fractionalize(
            statistics_table,
            "marriage_never_married",
            "marriage_married_not_divorced",
            "marriage_divorced",
        )

    def acs_name(self):
        return "marriage"

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
