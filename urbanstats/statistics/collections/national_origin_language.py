from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class NationalOriginLanguageStatistics(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "language_english_only": "Only English at Home %",
            "language_spanish": "Spanish at Home %",
            "language_other": "Other at Home %",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("language")

    def quiz_question_names(self):
        return {
            "language_english_only": "higher % of people who only speak english at home",
            "language_spanish": "higher % of people who speak spanish at home",
        }

    def quiz_question_unused(self):
        return ["language_other"]

    def mutate_acs_results(self, statistics_table, shapefile_table):
        fractionalize(
            statistics_table,
            "language_english_only",
            "language_spanish",
            "language_other",
        )

    def acs_name(self):
        return "language"

    def acs_entity(self):
        return ACSDataEntity(
            "AGE BY LANGUAGE SPOKEN AT HOME FOR THE POPULATION 5 YEARS AND OVER",
            "population",
            "tract",
            {
                None: [
                    "Estimate!!Total:",
                    "Estimate!!Total:!!18 to 64 years:",
                    "Estimate!!Total:!!5 to 17 years:",
                    "Estimate!!Total:!!65 years and over:",
                ],
                "language_english_only": [
                    "Estimate!!Total:!!18 to 64 years:!!Speak only English",
                    "Estimate!!Total:!!5 to 17 years:!!Speak only English",
                    "Estimate!!Total:!!65 years and over:!!Speak only English",
                ],
                "language_spanish": [
                    "Estimate!!Total:!!18 to 64 years:!!Speak Spanish",
                    "Estimate!!Total:!!5 to 17 years:!!Speak Spanish",
                    "Estimate!!Total:!!65 years and over:!!Speak Spanish",
                ],
                "language_other": [
                    "Estimate!!Total:!!18 to 64 years:!!Speak Asian and Pacific Island languages",
                    "Estimate!!Total:!!18 to 64 years:!!Speak other Indo-European languages",
                    "Estimate!!Total:!!18 to 64 years:!!Speak other languages",
                    "Estimate!!Total:!!5 to 17 years:!!Speak Asian and Pacific Island languages",
                    "Estimate!!Total:!!5 to 17 years:!!Speak other Indo-European languages",
                    "Estimate!!Total:!!5 to 17 years:!!Speak other languages",
                    "Estimate!!Total:!!65 years and over:!!Speak Asian and Pacific Island languages",
                    "Estimate!!Total:!!65 years and over:!!Speak other Indo-European languages",
                    "Estimate!!Total:!!65 years and over:!!Speak other languages",
                ],
            },
        )
