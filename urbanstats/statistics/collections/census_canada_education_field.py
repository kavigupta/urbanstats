import numpy as np

from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.games.quiz_question_metadata import (
    EDUCATION_FIELD,
    QuizQuestionDescriptor,
)
from urbanstats.statistics.statistic_collection import CanadaStatistics
from urbanstats.statistics.utils import fractionalize


class CensusCanadaEducationField(CanadaStatistics):
    version = 3

    def dependencies(self):
        return ["education_ugrad_canada"]

    def census_tables(self) -> CensusTables:
        # pylint: disable=line-too-long
        table_name = "Total - Major field of study - Classification of Instructional Programs (CIP) 2021 for the population aged 25 to 64 years in private households - 25% sample data (172)"
        return CensusTables(
            [table_name],
            {
                "education_field_humanities_canada": [
                    "  Education",
                    "  Visual and performing arts, and communications technologies",
                    "  Humanities",
                    "  Social and behavioural sciences and law",
                    "  Personal, protective and transportation services",
                    "  Other (179)",
                ],
                "education_field_business_canada": [
                    "  Business, management and public administration",
                ],
                "education_field_stem_canada": [
                    "  Physical and life sciences and technologies",
                    "  Mathematics, computer and information sciences",
                    "  Architecture, engineering, and related trades",
                    "  Agriculture, natural resources and conservation",
                    "  Health and related fields",
                ],
                None: [
                    table_name,
                    "  No postsecondary certificate, diploma or degree (173)",
                    "    13. Education",
                    "    10. Communications technologies/technicians and support services",
                    "    50. Visual and performing arts",
                    "    16. Indigenous and foreign languages, literatures, and linguistics",
                    "    23. English language and literature/letters",
                    "    24. Liberal arts and sciences, general studies and humanities",
                    "    30A Interdisciplinary humanities (174)",
                    "    38. Philosophy and religious studies",
                    "    39. Theology and religious vocations",
                    "    54. History",
                    "    55. French language and literature/lettersCAN",
                    "    05. Area, ethnic, cultural, gender, and group studies",
                    "    09. Communication, journalism and related programs",
                    "    19. Family and consumer sciences/human sciences",
                    "    22. Legal professions and studies",
                    "    30B Interdisciplinary social and behavioural sciences (175)",
                    "    42. Psychology",
                    "    45. Social sciences",
                    "    30.16 Accounting and computer science",
                    "    44. Public administration and social service professions",
                    "    52. Business, management, marketing and related support services",
                    "    26. Biological and biomedical sciences",
                    "    30.01 Biological and physical sciences",
                    "    30C Other interdisciplinary physical and life sciences (176)",
                    "    40. Physical sciences",
                    "    41. Science technologies/technicians",
                    "    11. Computer and information sciences and support services",
                    "    25. Library science",
                    "    27. Mathematics and statistics",
                    "    30D Interdisciplinary mathematics, computer and information sciences (177)",
                    "    04. Architecture and related services",
                    "    14. Engineering",
                    "    15. Engineering/engineering-related technologies/technicians",
                    "    30.12 Historic preservation and conservation",
                    "    46. Construction trades",
                    "    47. Mechanic and repair technologies/technicians",
                    "    48. Precision production",
                    "    01. Agricultural and veterinary sciences/services/operations and related fields (178)",
                    "    03. Natural resources and conservation",
                    "    30.37 Design for human health",
                    "    31. Parks, recreation, leisure, fitness, and kinesiology",
                    "    51. Health professions and related programs (178)",
                    "    60. Health professions residency/fellowship programs",
                    "    61. Medical residency/fellowship programs",
                    "    12. Culinary, entertainment, and personal services",
                    "    28. Military science, leadership and operational art",
                    "    29. Military technologies and applied sciences",
                    "    43. Security and protective services",
                    "    49. Transportation and materials moving",
                ],
            },
            "population",
        )

    def name_for_each_statistic(self):
        return {
            "education_field_stem_canada": "Undergrad STEM [25-64] % [StatCan]",
            "education_field_humanities_canada": "Undergrad Humanities [25-64] % [StatCan]",
            "education_field_business_canada": "Undergrad Business [25-64] % [StatCan]",
        }

    def varname_for_each_statistic(self):
        return {
            "education_field_stem_canada": "stem_degree_statcan",
            "education_field_humanities_canada": "humanities_degree_statcan",
            "education_field_business_canada": "business_degree_statcan",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census-disaggregated")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                EDUCATION_FIELD,
                {
                    "education_field_stem_canada": "higher % of people between 25 and 64 who have a STEM degree, as a percentage of the overall population",
                    "education_field_humanities_canada": "higher % of people between 25 and 64 who have a humanities degree, as a percentage of the overall population",
                    "education_field_business_canada": "higher % of people between 25 and 64 who have a business degree, as a percentage of the overall population",
                },
            ),
        }

    def compute_statistics_dictionary_canada(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        del shapefile_table
        statistic_table = self.census_tables().compute(2021, shapefile).copy()
        keys = [
            "education_field_stem_canada",
            "education_field_humanities_canada",
            "education_field_business_canada",
        ]
        fractionalize(statistic_table, *keys)
        for key in keys:
            statistic_table[key] = (
                statistic_table[key] * existing_statistics["education_ugrad_canada"]
            )
        return statistic_table
