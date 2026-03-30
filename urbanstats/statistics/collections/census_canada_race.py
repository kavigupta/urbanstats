from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.statistics.collections.census import Census2020, race_names
from urbanstats.statistics.collections.census_canada_same_as_us import (
    CensusCanadaSameAsUS,
)
from urbanstats.statistics.utils import fractionalize


class CensusCanadaRace(CensusCanadaSameAsUS):
    version = 6

    def us_equivalent_fields(self):
        return list(race_names)

    def census_tables(self) -> CensusTables:
        return CensusTables(
            [
                "Total - Visible minority for the population in private households - 25% sample data (117)",
                "Total - Indigenous identity for the population in private households - 25% sample data (44)",
            ],
            {
                "tvmp": [
                    "  Total visible minority population (118)",
                ],
                "nvmp": [
                    "  Not a visible minority (120)",
                ],
                "native_canada": [
                    "  Indigenous identity (45)",
                ],
                "asian_canada": [
                    "    South Asian",
                    "    Chinese",
                    "    Filipino",
                    "    Southeast Asian",
                    "    Korean",
                    "    Japanese",
                ],
                "black_canada": [
                    "    Black",
                ],
                "hispanic_canada": [
                    "    Latin American",
                ],
                "vm_white": [
                    "    Arab",
                    "    West Asian",
                ],
                "other / mixed_canada": [
                    "    Visible minority, n.i.e. (119)",
                    "    Multiple visible minorities",
                ],
                None: [
                    "Total - Visible minority for the population in private households - 25% sample data (117)",
                ]
                + [
                    "Total - Indigenous identity for the population in private households - 25% sample data (44)",
                    "    Single Indigenous responses (46)",
                    "      First Nations (North American Indian)",
                    "      Métis",
                    "      Inuk\xa0(Inuit)",
                    "    Multiple Indigenous responses (47)",
                    "    Indigenous responses not included elsewhere (48)",
                    "  Non-Indigenous identity",
                ],
            },
            "population",
        )

    def us_equivalent(self):
        return Census2020()

    def post_process(self, statistic_table):
        statistic_table = statistic_table.copy()
        statistic_table["white_canada"] = (
            statistic_table["nvmp"] - statistic_table["native_canada"]
        )
        negative_white_canada = statistic_table["white_canada"][
            statistic_table["white_canada"] < 0
        ]
        assert (
            negative_white_canada.sum() > -100
        ), f"Negative white_canada sum is {negative_white_canada.sum()}, which is too high. Check the underlying data for issues."
        statistic_table["white_canada"] = statistic_table["white_canada"].clip(lower=0)
        statistic_table["white_canada"] += statistic_table["vm_white"]

        unallocated_tvmp = (
            statistic_table.tvmp
            - statistic_table.asian_canada
            - statistic_table.black_canada
            - statistic_table.hispanic_canada
            - statistic_table.vm_white
            - statistic_table["other / mixed_canada"]
        )
        assert (
            unallocated_tvmp[unallocated_tvmp < 0].sum() > -5000
        ), f"Unallocated TVMP sum is {unallocated_tvmp[unallocated_tvmp < 0].sum()}, which is too high. Check the underlying data for issues."

        unallocated_tvmp = unallocated_tvmp.clip(lower=0)
        statistic_table["other / mixed_canada"] += unallocated_tvmp

        del statistic_table["vm_white"]
        del statistic_table["nvmp"]
        del statistic_table["tvmp"]
        for column in ["hawaiian_pi_canada"]:
            assert column not in statistic_table
            statistic_table[column] = statistic_table.iloc[:, 0] * 0.0
        fractionalize(statistic_table, *self.internal_statistic_names_list())
        return statistic_table
