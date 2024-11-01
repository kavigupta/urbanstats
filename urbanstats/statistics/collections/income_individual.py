from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class IncomeIndividual(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "individual_income_under_50k": "Individual Income < $50k %",
            "individual_income_50k_to_100k": "Individual Income $50k - $100k %",
            "individual_income_over_100k": "Individual Income > $100k %",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("income")

    def quiz_question_names(self):
        return {
            "individual_income_under_50k": "higher % of people who have individual income under $50k",
            "individual_income_over_100k": "higher % of people who have individual income over $100k",
        }

    def quiz_question_unused(self):
        return [
            "individual_income_50k_to_100k",
        ]

    def mutate_acs_results(self, statistics_table, shapefile_table):
        fractionalize(
            statistics_table,
            "individual_income_under_50k",
            "individual_income_50k_to_100k",
            "individual_income_over_100k",
        )

    def acs_name(self):
        return "household_income"

    def acs_entity(self):
        # pylint: disable=line-too-long
        return ACSDataEntity(
            "SEX BY WORK EXPERIENCE IN THE PAST 12 MONTHS BY INCOME IN THE PAST 12 MONTHS (IN 2021 INFLATION-ADJUSTED DOLLARS) FOR THE POPULATION 15 YEARS AND OVER",
            "population_18",
            "tract",
            {
                None: [
                    "Estimate!!Total:",
                    "Estimate!!Total:!!Female:",
                    "Estimate!!Total:!!Female:!!Other:",
                    "Estimate!!Total:!!Female:!!Other:!!No income",
                    "Estimate!!Total:!!Female:!!Other:!!With income:",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!No income",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:",
                    "Estimate!!Total:!!Male:",
                    "Estimate!!Total:!!Male:!!Other:",
                    "Estimate!!Total:!!Male:!!Other:!!No income",
                    "Estimate!!Total:!!Male:!!Other:!!With income:",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!No income",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:",
                ],
                "individual_income_under_50k": [
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$1 to $2,499 or loss",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$10,000 to $12,499",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$12,500 to $14,999",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$15,000 to $17,499",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$17,500 to $19,999",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$2,500 to $4,999",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$20,000 to $22,499",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$22,500 to $24,999",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$25,000 to $29,999",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$30,000 to $34,999",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$35,000 to $39,999",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$40,000 to $44,999",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$45,000 to $49,999",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$5,000 to $7,499",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$7,500 to $9,999",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$1 to $2,499 or loss",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$10,000 to $12,499",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$12,500 to $14,999",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$15,000 to $17,499",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$17,500 to $19,999",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$2,500 to $4,999",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$20,000 to $22,499",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$22,500 to $24,999",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$25,000 to $29,999",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$30,000 to $34,999",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$35,000 to $39,999",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$40,000 to $44,999",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$45,000 to $49,999",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$5,000 to $7,499",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$7,500 to $9,999",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$1 to $2,499 or loss",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$10,000 to $12,499",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$12,500 to $14,999",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$15,000 to $17,499",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$17,500 to $19,999",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$2,500 to $4,999",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$20,000 to $22,499",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$22,500 to $24,999",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$25,000 to $29,999",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$30,000 to $34,999",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$35,000 to $39,999",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$40,000 to $44,999",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$45,000 to $49,999",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$5,000 to $7,499",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$7,500 to $9,999",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$1 to $2,499 or loss",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$10,000 to $12,499",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$12,500 to $14,999",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$15,000 to $17,499",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$17,500 to $19,999",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$2,500 to $4,999",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$20,000 to $22,499",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$22,500 to $24,999",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$25,000 to $29,999",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$30,000 to $34,999",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$35,000 to $39,999",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$40,000 to $44,999",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$45,000 to $49,999",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$5,000 to $7,499",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$7,500 to $9,999",
                ],
                "individual_income_50k_to_100k": [
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$50,000 to $54,999",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$55,000 to $64,999",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$65,000 to $74,999",
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$75,000 to $99,999",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$50,000 to $54,999",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$55,000 to $64,999",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$65,000 to $74,999",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$75,000 to $99,999",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$50,000 to $54,999",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$55,000 to $64,999",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$65,000 to $74,999",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$75,000 to $99,999",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$50,000 to $54,999",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$55,000 to $64,999",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$65,000 to $74,999",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$75,000 to $99,999",
                ],
                "individual_income_over_100k": [
                    "Estimate!!Total:!!Female:!!Other:!!With income:!!$100,000 or more",
                    "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$100,000 or more",
                    "Estimate!!Total:!!Male:!!Other:!!With income:!!$100,000 or more",
                    "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$100,000 or more",
                ],
            },
        )
