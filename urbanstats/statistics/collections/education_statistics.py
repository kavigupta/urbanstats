from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSStatisticsColection


class EducationStatistics(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "education_high_school": "High School %",
            "education_ugrad": "Undergrad %",
            "education_grad": "Grad %",
            "education_field_stem": "Undergrad STEM %",
            "education_field_humanities": "Undergrad Humanities %",
            "education_field_business": "Undergrad Business %",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("education")

    def quiz_question_names(self):
        return {
            "education_high_school": "higher % of people who have at least a high school diploma",
            "education_ugrad": "higher % of people who have at least an undergrad degree",
            "education_grad": "higher % of people who have a graduate degree",
            "education_field_stem": "!FULL Which has more people with a STEM degree, as a percentage of the overall population?",
            "education_field_humanities": "!FULL Which has more people with a humanities degree, as a percentage of the overall population?",
            "education_field_business": "!FULL Which has more people with a business degree, as a percentage of the overall population?",
        }

    def quiz_question_unused(self):
        return []

    def mutate_acs_results(self, statistics_table):
        education_denominator = (
            statistics_table.education_no
            + statistics_table.education_high_school
            + statistics_table.education_ugrad
            + statistics_table.education_grad
        )
        statistics_table["education_high_school"] = (
            statistics_table.education_high_school
            + statistics_table.education_ugrad
            + statistics_table.education_grad
        ) / education_denominator
        statistics_table["education_ugrad"] = (
            statistics_table.education_ugrad + statistics_table.education_grad
        ) / education_denominator
        statistics_table["education_grad"] = (
            statistics_table.education_grad / education_denominator
        )
        del statistics_table["education_no"]

        for column in (
            "education_field_stem",
            "education_field_humanities",
            "education_field_business",
        ):
            statistics_table[column] = statistics_table[column] / education_denominator

    def acs_entity_dict(self):
        return dict(
            education=ACSDataEntity(
                "EDUCATIONAL ATTAINMENT FOR THE POPULATION 25 YEARS AND OVER",
                "population_18",
                "block group",
                {
                    "education_total": ["Estimate!!Total:"],
                    "education_no": [
                        "Estimate!!Total:!!No schooling completed",
                        "Estimate!!Total:!!Nursery school",
                        "Estimate!!Total:!!Kindergarten",
                        "Estimate!!Total:!!1st grade",
                        "Estimate!!Total:!!2nd grade",
                        "Estimate!!Total:!!3rd grade",
                        "Estimate!!Total:!!4th grade",
                        "Estimate!!Total:!!5th grade",
                        "Estimate!!Total:!!6th grade",
                        "Estimate!!Total:!!7th grade",
                        "Estimate!!Total:!!8th grade",
                        "Estimate!!Total:!!9th grade",
                        "Estimate!!Total:!!10th grade",
                        "Estimate!!Total:!!11th grade",
                        "Estimate!!Total:!!12th grade, no diploma",
                    ],
                    "education_high_school": [
                        "Estimate!!Total:!!Regular high school diploma",
                        "Estimate!!Total:!!GED or alternative credential",
                        "Estimate!!Total:!!GED or alternative credential",
                        "Estimate!!Total:!!Some college, less than 1 year",
                        "Estimate!!Total:!!Some college, 1 or more years, no degree",
                        "Estimate!!Total:!!Associate's degree",
                    ],
                    "education_ugrad": [
                        "Estimate!!Total:!!Bachelor's degree",
                    ],
                    "education_grad": [
                        "Estimate!!Total:!!Master's degree",
                        "Estimate!!Total:!!Professional school degree",
                        "Estimate!!Total:!!Doctorate degree",
                    ],
                },
            ),
            education_field=ACSDataEntity(
                "FIELD OF BACHELOR'S DEGREE FOR FIRST MAJOR FOR THE POPULATION 25 YEARS AND OVER",
                "population_18",
                "block group",
                {
                    "education_field_total": ["Estimate!!Total:"],
                    "education_field_stem": [
                        "Estimate!!Total:!!Science and Engineering Related Fields",
                        "Estimate!!Total:!!Science and Engineering",
                    ],
                    "education_field_humanities": [
                        "Estimate!!Total:!!Arts, Humanities and Other",
                        "Estimate!!Total:!!Education",
                    ],
                    "education_field_business": [
                        "Estimate!!Total:!!Business",
                    ],
                },
            ),
        )

    def acs_name(self):
        raise NotImplementedError(
            "This method should not be called since acs_entity_dict is defined"
        )

    def acs_entity(self):
        raise NotImplementedError(
            "This method should not be called since acs_entity_dict is defined"
        )
