from dataclasses import dataclass

from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.games.quiz_question_metadata import (
    RACE,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.national_census import (
    AustralianCounts,
    NationalCensusStatistics,
    StatCanCounts,
)


@dataclass(frozen=True)
class AustralianReligionCounts(AustralianCounts):
    """
    Religion not stated is left out of the total, so it does not end up in other religion, which is
    what is left over.
    """

    def compute(self, shapefile):
        counts = super().compute(shapefile)
        counts["religion_total_canada"] = counts.pop(
            "religion_total_with_not_stated"
        ) - counts.pop("religion_not_stated")
        return counts


class ReligionStatistics(NationalCensusStatistics):
    """Canada's categories, which name the rows, with Australia's matched to them."""

    version = 5

    def census_tables(self) -> CensusTables:
        religion_table = "Total - Religion for the population in private households - 25% sample data (161)"
        return CensusTables(
            [religion_table],
            {
                "religion_total_canada": [
                    "Total - Religion for the population in private households - 25% sample data (161)"
                ],
                "religion_christian_canada": ["  Christian"],
                "religion_catholic_canada": ["    Catholic"],
                "religion_hindu_canada": ["  Hindu"],
                "religion_jewish_canada": ["  Jewish"],
                "religion_muslim_canada": ["  Muslim"],
                "religion_sikh_canada": ["  Sikh"],
                "religion_buddhist_canada": ["  Buddhist"],
                "religion_no_religion_canada": [
                    "  No religion and secular perspectives"
                ],
                None: [
                    "    Christian, n.o.s. (162)",
                    "    Anabaptist",
                    "    Anglican",
                    "    Baptist",
                    "    Christian Orthodox",
                    "    Jehovah's Witness",
                    "    Latter Day Saints",
                    "    Lutheran",
                    "    Methodist and Wesleyan (Holiness)",
                    "    Pentecostal and other Charismatic",
                    "    Presbyterian",
                    "    Reformed",
                    "    United Church",
                    "    Other Christian and Christian-related traditions",
                    "  Traditional (North American Indigenous) spirituality",
                    "  Other religions and spiritual traditions",
                ],
            },
            "population",
        )

    def name_for_each_statistic(self):
        return {
            "religion_catholic_canada": "Catholic %",
            "religion_protestant_canada": "Protestant (non-Catholic Christian) %",
            "religion_hindu_canada": "Hindu %",
            "religion_jewish_canada": "Jewish %",
            "religion_muslim_canada": "Muslim %",
            "religion_sikh_canada": "Sikh %",
            "religion_buddhist_canada": "Buddhist %",
            "religion_no_religion_canada": "No religion %",
            "religion_other_canada": "Other religion %",
        }

    def unit_for_each_statistic(self):
        return self.same_for_each_name("percentage")

    def varname_for_each_statistic(self):
        return {
            "religion_catholic_canada": "religion_catholic",
            "religion_protestant_canada": "religion_protestant",
            "religion_hindu_canada": "religion_hindu",
            "religion_jewish_canada": "religion_jewish",
            "religion_muslim_canada": "religion_muslim",
            "religion_sikh_canada": "religion_sikh",
            "religion_buddhist_canada": "religion_buddhist",
            "religion_no_religion_canada": "religion_no",
            "religion_other_canada": "religion_other",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census-disaggregated")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                RACE,
                {
                    "religion_catholic_canada": "higher % of people who are Catholic",
                    "religion_protestant_canada": "higher % of people who are Protestant",
                    "religion_hindu_canada": "higher % of people who are Hindu",
                    "religion_sikh_canada": "higher % of people who are Sikh",
                    "religion_muslim_canada": "higher % of people who are Muslim",
                    "religion_no_religion_canada": "higher % of people with no religion",
                },
            ),
            **QuizQuestionSkip.several(
                "religion_jewish_canada",
                "religion_buddhist_canada",
                "religion_other_canada",
            ),
        }

    def country_inputs(self):
        return {
            "Canada": StatCanCounts(self.census_tables()),
            "Australia": AustralianReligionCounts(
                {
                    "G14": {
                        "religion_total_with_not_stated": ["Tot_P"],
                        "religion_not_stated": ["Religious_affiliation_ns_P"],
                        "religion_christian_canada": ["Christianity_Tot_P"],
                        "religion_catholic_canada": ["Christianity_Catholic_P"],
                        "religion_hindu_canada": ["Hinduism_P"],
                        "religion_jewish_canada": ["Judaism_P"],
                        "religion_muslim_canada": ["Islam_P"],
                        "religion_sikh_canada": ["Othr_Rel_Sikhism_P"],
                        "religion_buddhist_canada": ["Buddhism_P"],
                        # Canada's "No religion and secular perspectives"
                        "religion_no_religion_canada": [
                            "SB_OSB_NRA_NR_P",
                            "SB_OSB_NRA_SB_P",
                        ],
                    }
                }
            ),
        }

    def mutate_counts(self, counts):
        counts["religion_protestant_canada"] = (
            counts.pop("religion_christian_canada") - counts["religion_catholic_canada"]
        )
        total = counts.pop("religion_total_canada")
        counted = [
            c
            for c in self.internal_statistic_names_list()
            if c != "religion_other_canada"
        ]
        for col in counted:
            counts[col] = counts[col] / total
        counts["religion_other_canada"] = 1 - sum(counts[col] for col in counted)
