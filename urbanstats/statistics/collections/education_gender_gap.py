from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class EducationGenderGapStatistics(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "female_hs_gap_4": "% of women with high school education - % of men with high school education",
            "female_ugrad_gap_4": "% of women with undergraduate education - % of men with undergraduate education",
            "female_grad_gap_4": "% of women with graduate education - % of men with graduate education",
        }

    def category_for_each_statistic(self):
        return self.same_for_each_name("education")

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("education")

    def quiz_question_names(self):
        return {}

    def quiz_question_unused(self):
        return [
            "female_hs_gap_4",
            "female_ugrad_gap_4",
            "female_grad_gap_4",
        ]

    def mutate_shapefile_table(self, shapefile_table):
        fractionalize(
            "female_none_4",
            "female_hs_4",
            "female_ugrad_4",
            "female_grad_4",
        )

        fractionalize(
            "male_none_4",
            "male_hs_4",
            "male_ugrad_4",
            "male_grad_4",
        )

        del shapefile_table["female_none_4"], shapefile_table["male_none_4"]

        shapefile_table["female_ugrad_4"] += shapefile_table["female_grad_4"]
        shapefile_table["male_ugrad_4"] += shapefile_table["male_grad_4"]

        shapefile_table["female_hs_4"] += shapefile_table["female_ugrad_4"]
        shapefile_table["male_hs_4"] += shapefile_table["male_ugrad_4"]

        shapefile_table["female_hs_gap_4"] = (
            shapefile_table["female_hs_4"] - shapefile_table["male_hs_4"]
        )
        shapefile_table["female_ugrad_gap_4"] = (
            shapefile_table["female_ugrad_4"] - shapefile_table["male_ugrad_4"]
        )
        shapefile_table["female_grad_gap_4"] = (
            shapefile_table["female_grad_4"] - shapefile_table["male_grad_4"]
        )

        del (
            shapefile_table["male_hs_4"],
            shapefile_table["female_hs_4"],
            shapefile_table["female_ugrad_4"],
            shapefile_table["male_ugrad_4"],
            shapefile_table["female_grad_4"],
            shapefile_table["male_grad_4"],
        )

    def acs_name(self):
        return "gender_gap_education_4"

    def acs_entity(self):
        return ACSDataEntity(
            "SEX BY EDUCATIONAL ATTAINMENT FOR THE POPULATION 25 YEARS AND OVER",
            "population_18",
            "block group",
            {
                None: [
                    "Estimate!!Total:",
                    "Estimate!!Total:!!Female:",
                    "Estimate!!Total:!!Male:",
                ],
                "female_none_4": [
                    "Estimate!!Total:!!Female:!!No schooling completed",
                    "Estimate!!Total:!!Female:!!Nursery to 4th grade",
                    "Estimate!!Total:!!Female:!!5th and 6th grade",
                    "Estimate!!Total:!!Female:!!7th and 8th grade",
                    "Estimate!!Total:!!Female:!!9th grade",
                    "Estimate!!Total:!!Female:!!10th grade",
                    "Estimate!!Total:!!Female:!!11th grade",
                    "Estimate!!Total:!!Female:!!12th grade, no diploma",
                ],
                "female_hs_4": [
                    "Estimate!!Total:!!Female:!!High school graduate (includes equivalency)",
                    "Estimate!!Total:!!Female:!!Associate's degree",
                    "Estimate!!Total:!!Female:!!Some college, 1 or more years, no degree",
                    "Estimate!!Total:!!Female:!!Some college, less than 1 year",
                ],
                "female_ugrad_4": [
                    "Estimate!!Total:!!Female:!!Bachelor's degree",
                ],
                "female_grad_4": [
                    "Estimate!!Total:!!Female:!!Doctorate degree",
                    "Estimate!!Total:!!Female:!!Master's degree",
                    "Estimate!!Total:!!Female:!!Professional school degree",
                ],
                "male_none_4": [
                    "Estimate!!Total:!!Male:!!No schooling completed",
                    "Estimate!!Total:!!Male:!!Nursery to 4th grade",
                    "Estimate!!Total:!!Male:!!5th and 6th grade",
                    "Estimate!!Total:!!Male:!!7th and 8th grade",
                    "Estimate!!Total:!!Male:!!9th grade",
                    "Estimate!!Total:!!Male:!!10th grade",
                    "Estimate!!Total:!!Male:!!11th grade",
                    "Estimate!!Total:!!Male:!!12th grade, no diploma",
                ],
                "male_hs_4": [
                    "Estimate!!Total:!!Male:!!High school graduate (includes equivalency)",
                    "Estimate!!Total:!!Male:!!Some college, 1 or more years, no degree",
                    "Estimate!!Total:!!Male:!!Some college, less than 1 year",
                    "Estimate!!Total:!!Male:!!Associate's degree",
                ],
                "male_ugrad_4": [
                    "Estimate!!Total:!!Male:!!Bachelor's degree",
                ],
                "male_grad_4": [
                    "Estimate!!Total:!!Male:!!Doctorate degree",
                    "Estimate!!Total:!!Male:!!Master's degree",
                    "Estimate!!Total:!!Male:!!Professional school degree",
                ],
            },
        )
