from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.statistics.collections.census_canada_same_as_us import (
    CensusCanadaSameAsUS,
)
from urbanstats.statistics.collections.national_origin_citizenship import (
    NationalOriginCitizenshipStatistics,
)
from urbanstats.statistics.utils import fractionalize


class CensusCanadaCitizenship(CensusCanadaSameAsUS):
    version = 1

    def census_tables(self) -> CensusTables:
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

    def us_equivalent(self):
        return NationalOriginCitizenshipStatistics()

    def post_process(self, statistic_table):
        statistic_table = statistic_table.copy()
        statistic_table["citizenship_citizen_by_birth_canada"] = statistic_table[
            "non_immigrants"
        ]
        statistic_table["citizenship_citizen_by_naturalization_canada"] = (
            statistic_table["canadian_citizens"] - statistic_table["non_immigrants"]
        )
        negative_naturalized = statistic_table[
            "citizenship_citizen_by_naturalization_canada"
        ][statistic_table["citizenship_citizen_by_naturalization_canada"] < 0]
        assert (
            negative_naturalized.sum() > -100
        ), f"Negative naturalized citizen sum is {negative_naturalized.sum()}, which is too high. Check the underlying data for issues."
        statistic_table["citizenship_citizen_by_naturalization_canada"] = statistic_table[
            "citizenship_citizen_by_naturalization_canada"
        ].clip(lower=0)
        statistic_table["citizenship_not_citizen_canada"] = statistic_table[
            "not_canadian_citizens"
        ]
        del statistic_table["canadian_citizens"]
        del statistic_table["non_immigrants"]
        del statistic_table["not_canadian_citizens"]
        fractionalize(statistic_table, *self.internal_statistic_names_list())
        assert set(statistic_table) == set(self.internal_statistic_names_list())
        return statistic_table
