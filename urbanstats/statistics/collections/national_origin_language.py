import pandas as pd

from urbanstats.acs.load import ACSDataEntity
from urbanstats.games.quiz_question_metadata import (
    LANGUAGE,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.collections.census_canada_language import (
    canadian_language_counts,
    canadian_language_tables,
)
from urbanstats.statistics.national_census import (
    ACSCounts,
    AustralianCounts,
    NationalCensusStatistics,
    StatCanCounts,
)
from urbanstats.statistics.utils import fractionalize


class NationalOriginLanguageStatistics(NationalCensusStatistics):
    version = 2

    def legacy_statistic_names(self):
        # Canada's, from before the two countries' statistics were merged
        return {
            "Only English at Home % [StatCan]": "Only English at Home %",
            "Spanish at Home % [StatCan]": "Spanish at Home %",
        }

    def name_for_each_statistic(self):
        return {
            "language_english_only": "Only English at Home %",
            "language_spanish": "Spanish at Home %",
            "language_other": "Other at Home %",
        }

    def unit_for_each_statistic(self):
        return self.same_for_each_name("percentage")

    def varname_for_each_statistic(self):
        return {
            "language_english_only": "english_only",
            "language_spanish": "spanish",
            "language_other": "other_languages",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("language")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                LANGUAGE,
                {
                    "language_english_only": "higher % of people who only speak English at home",
                    "language_spanish": "higher % of people who speak Spanish at home",
                },
            ),
            **QuizQuestionSkip.several("language_other"),
        }

    def mutate_counts(self, counts):
        fractionalize(
            counts,
            "language_english_only",
            "language_spanish",
            "language_other",
        )

    def country_inputs(self):
        return {
            "USA": ACSCounts(self.acs_entity()),
            "Canada": CanadianLanguageCounts(canadian_language_tables()),
            "Australia": AustralianLanguageCounts(
                {
                    "G13": {
                        "language_english_only": ["PSEO_Tot"],
                        "language_spanish": ["POL_Spanish_Tot"],
                        # Everyone who uses a language other than English. Language not stated is a
                        # separate cell, so is left out.
                        "language_not_english": ["POL_Tot_Tot"],
                    }
                }
            ),
        }

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


class CanadianLanguageCounts(StatCanCounts):
    """The US's other languages are everything but English only and Spanish, French included."""

    def compute(self, shapefile):
        counts = canadian_language_counts(super().compute(shapefile))
        return pd.DataFrame(
            {
                "language_english_only": counts["language_english_only"],
                "language_spanish": counts["language_spanish"],
                "language_other": counts["language_french"]
                + counts["language_other_non_french"],
            }
        )


class AustralianLanguageCounts(AustralianCounts):
    """
    Other is everything but English and Spanish, rather than a sum of the ~40 languages in it, which
    comes up 2% short because perturbation zeroes small cells.
    """

    def compute(self, shapefile):
        counts = super().compute(shapefile)
        return pd.DataFrame(
            {
                "language_english_only": counts["language_english_only"],
                "language_spanish": counts["language_spanish"],
                "language_other": (
                    counts["language_not_english"] - counts["language_spanish"]
                ).clip(lower=0),
            }
        )
