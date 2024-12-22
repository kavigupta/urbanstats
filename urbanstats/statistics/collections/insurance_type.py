from urbanstats.acs.load import ACSDataEntity
from urbanstats.games.quiz_question_metadata import (
    HEALTH_INSURANCE,
    QuizQuestionDescriptor,
)
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class InsuranceTypeStatistics(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "insurance_coverage_none": "Uninsured %",
            "insurance_coverage_govt": "Public Insurance %",
            "insurance_coverage_private": "Private Insurance %",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("insurance")

    def quiz_question_descriptors(self):
        return QuizQuestionDescriptor.several(
            HEALTH_INSURANCE,
            {
                "insurance_coverage_none": "higher % of people who are uninsured",
                "insurance_coverage_govt": "higher % of people who are on public insurance",
                "insurance_coverage_private": "higher % of people who are on private insurance",
            },
        )

    def mutate_acs_results(self, statistics_table):
        fractionalize(
            statistics_table,
            "insurance_coverage_none",
            "insurance_coverage_govt",
            "insurance_coverage_private",
        )

    def acs_name(self):
        return "insurance_coverage"

    def acs_entity(self):
        # pylint: disable=line-too-long
        return ACSDataEntity(
            "HEALTH INSURANCE COVERAGE STATUS AND TYPE BY WORK EXPERIENCE",
            "population",
            "tract",
            {
                None: [
                    "Estimate!!Total:",
                    "Estimate!!Total:!!Did not work:",
                    "Estimate!!Total:!!Did not work:!!With health insurance coverage",
                    "Estimate!!Total:!!Worked full-time, year-round:",
                    "Estimate!!Total:!!Worked full-time, year-round:!!With health insurance coverage",
                    "Estimate!!Total:!!Worked less than full-time, year-round:",
                    "Estimate!!Total:!!Worked less than full-time, year-round:!!With health insurance coverage",
                ],
                "insurance_coverage_none": [
                    "Estimate!!Total:!!Did not work:!!No health insurance coverage",
                    "Estimate!!Total:!!Worked full-time, year-round:!!No health insurance coverage",
                    "Estimate!!Total:!!Worked less than full-time, year-round:!!No health insurance coverage",
                ],
                "insurance_coverage_govt": [
                    "Estimate!!Total:!!Did not work:!!With health insurance coverage!!With Medicaid/means-tested public coverage",
                    "Estimate!!Total:!!Did not work:!!With health insurance coverage!!With Medicare coverage",
                    "Estimate!!Total:!!Worked full-time, year-round:!!With health insurance coverage!!With Medicaid/means-tested public coverage",
                    "Estimate!!Total:!!Worked full-time, year-round:!!With health insurance coverage!!With Medicare coverage",
                    "Estimate!!Total:!!Worked less than full-time, year-round:!!With health insurance coverage!!With Medicaid/means-tested public coverage",
                    "Estimate!!Total:!!Worked less than full-time, year-round:!!With health insurance coverage!!With Medicare coverage",
                ],
                "insurance_coverage_private": [
                    "Estimate!!Total:!!Did not work:!!With health insurance coverage!!With direct-purchase health insurance",
                    "Estimate!!Total:!!Did not work:!!With health insurance coverage!!With employer-based health insurance",
                    "Estimate!!Total:!!Worked full-time, year-round:!!With health insurance coverage!!With direct-purchase health insurance",
                    "Estimate!!Total:!!Worked full-time, year-round:!!With health insurance coverage!!With employer-based health insurance",
                    "Estimate!!Total:!!Worked less than full-time, year-round:!!With health insurance coverage!!With direct-purchase health insurance",
                    "Estimate!!Total:!!Worked less than full-time, year-round:!!With health insurance coverage!!With employer-based health insurance",
                ],
            },
        )
