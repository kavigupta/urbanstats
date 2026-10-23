import pandas as pd

from urbanstats.acs.load import ACSDataEntity
from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.games.quiz_question_metadata import (
    NATIONAL_ORIGIN,
    QuizQuestionDescriptor,
)
from urbanstats.statistics.national_census import (
    ACSUSPRCounts,
    NationalCensusStatistics,
    StatCanCounts,
)
from urbanstats.statistics.utils import fractionalize


class NationalOriginCitizenshipStatistics(NationalCensusStatistics):
    version = 1

    def name_for_each_statistic(self):
        return {
            "citizenship_citizen_by_birth": "Citizen by Birth %",
            "citizenship_citizen_by_naturalization": "Citizen by Naturalization %",
            "citizenship_not_citizen": "Non-citizen %",
        }

    def unit_for_each_statistic(self):
        return self.same_for_each_name("percentage")

    def varname_for_each_statistic(self):
        return {
            "citizenship_citizen_by_birth": "citizen_by_birth",
            "citizenship_citizen_by_naturalization": "naturalized_citizen",
            "citizenship_not_citizen": "non_citizen",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("citizenship")

    def quiz_question_descriptors(self):
        return QuizQuestionDescriptor.several(
            NATIONAL_ORIGIN,
            {
                "citizenship_citizen_by_birth": "higher % of residents who are citizens by birth",
                "citizenship_citizen_by_naturalization": "higher % of residents who are citizens by naturalization",
                "citizenship_not_citizen": "higher % of residents who are non-citizens",
            },
        )

    def mutate_counts(self, counts):
        fractionalize(
            counts,
            "citizenship_citizen_by_birth",
            "citizenship_citizen_by_naturalization",
            "citizenship_not_citizen",
        )

    def country_inputs(self):
        return {
            "USA": ACSUSPRCounts(*self.acs_entities()),
            "Canada": CanadianCitizenshipCounts(self.census_tables_canada()),
        }

    def census_tables_canada(self):
        return CensusTables(
            [
                "Total - Citizenship for the population in private households - 25% sample data (76)",
                "Total - Immigrant status and period of immigration for the population in private households - 25% sample data (79)",
            ],
            {
                "canadian_citizens": [
                    "  Canadian citizens (77)",
                ],
                "not_canadian_citizens": [
                    "  Not Canadian citizens (78)",
                ],
                "non_immigrants": [
                    "  Non-immigrants (80)",
                ],
                None: [
                    "Total - Citizenship for the population in private households - 25% sample data (76)",
                    "    Canadian citizens aged under 18",
                    "    Canadian citizens aged 18 and over",
                    "Total - Immigrant status and period of immigration for the population in private households - 25% sample data (79)",
                    "  Immigrants (81)",
                    "    Before 1980",
                    "    1980 to 1990",
                    "    1991 to 2000",
                    "    2001 to 2010",
                    "    2011 to 2021 (82)",
                    "      2011 to 2015",
                    "      2016 to 2021",
                    "  Non-permanent residents (83)",
                ],
            },
            "population",
        )

    def acs_entities(self):
        return [
            ACSDataEntity(
                "NATIVITY AND CITIZENSHIP STATUS IN THE UNITED STATES",
                "population",
                "tract",
                {
                    None: [
                        "Estimate!!Total:",
                    ],
                    "citizenship_citizen_by_birth": [
                        "Estimate!!Total:!!U.S. citizen, born in Puerto Rico or U.S. Island Areas",
                        "Estimate!!Total:!!U.S. citizen, born in the United States",
                        "Estimate!!Total:!!U.S. citizen, born abroad of American parent(s)",
                    ],
                    "citizenship_citizen_by_naturalization": [
                        "Estimate!!Total:!!U.S. citizen by naturalization",
                    ],
                    "citizenship_not_citizen": [
                        "Estimate!!Total:!!Not a U.S. citizen",
                    ],
                },
            ),
            ACSDataEntity(
                "NATIVITY AND CITIZENSHIP STATUS IN PUERTO RICO",
                "population",
                "tract",
                {
                    None: [
                        "Estimate!!Total:",
                    ],
                    "citizenship_citizen_by_birth": [
                        "Estimate!!Total:!!U.S. citizen, born abroad of American parent(s)",
                        "Estimate!!Total:!!U.S. citizen, born in Puerto Rico",
                        "Estimate!!Total:!!U.S. citizen, born in U.S. or U.S. Island Areas",
                    ],
                    "citizenship_citizen_by_naturalization": [
                        "Estimate!!Total:!!U.S. citizen by naturalization",
                    ],
                    "citizenship_not_citizen": [
                        "Estimate!!Total:!!Not a U.S. citizen",
                    ],
                },
            ),
        ]


class CanadianCitizenshipCounts(StatCanCounts):
    """StatCan counts citizens and immigrants, so citizens by naturalization are the difference."""

    def compute(self, shapefile):
        counts = super().compute(shapefile)
        naturalized = counts["canadian_citizens"] - counts["non_immigrants"]
        assert (
            naturalized[naturalized < 0].sum() > -100
        ), f"Negative naturalized citizen sum is {naturalized[naturalized < 0].sum()}"
        return pd.DataFrame(
            {
                "citizenship_citizen_by_birth": counts["non_immigrants"],
                "citizenship_citizen_by_naturalization": naturalized.clip(lower=0),
                "citizenship_not_citizen": counts["not_canadian_citizens"],
            }
        )
