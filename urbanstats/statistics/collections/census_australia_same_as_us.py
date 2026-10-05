from abc import abstractmethod

import pandas as pd
from permacache import permacache, stable_hash

from urbanstats.data.australia.abs_tables import sa1_table
from urbanstats.data.australia.mesh_blocks import disaggregated_from_sa1
from urbanstats.geometry.census_aggregation import aggregate_by_mesh_block_australia
from urbanstats.statistics.collections.generation import GenerationStatistics
from urbanstats.statistics.collections.marriage import MarriageStatistics
from urbanstats.statistics.collections.national_origin_birthplace import (
    NationalOriginBirthplaceStatistics,
)
from urbanstats.statistics.collections.national_origin_language import (
    NationalOriginLanguageStatistics,
)
from urbanstats.statistics.collections.same_as_us import SameAsUS
from urbanstats.statistics.statistic_collection import AustraliaStatistics


class CensusAustraliaSA1(AustraliaStatistics):
    """Statistics from DataPack tables, which are by SA1, disaggregated to mesh blocks."""

    # "population" or "dwellings"
    disagg_weight = "population"

    @abstractmethod
    def abs_tables(self):
        """[(DataPack table, column -> short-header codes summed into it)]"""

    @abstractmethod
    def post_process(self, statistic_table):
        pass

    def compute_sa1_columns(self, shapefile):
        return pd.concat(
            [
                compute_sa1_stats(table, remapping, self.disagg_weight, shapefile)
                for table, remapping in self.abs_tables()
            ],
            axis=1,
        )

    def compute_statistics_dictionary_australia(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        return self.post_process(self.compute_sa1_columns(shapefile))

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("australian-census")


class CensusAustraliaSameAsUS(SameAsUS, CensusAustraliaSA1):
    """Columns are US statistic names, unless post_process is overridden to derive them."""

    name_suffix = "australia"
    source_tag = "ABS"

    def post_process(self, statistic_table):
        return super().post_process(statistic_table.rename(columns=self.remap_name))


@permacache(
    "urbanstats/statistics/collections/census_australia_same_as_us/compute_sa1_stats",
    key_function=dict(remapping=stable_hash, shapefile=lambda x: x.hash_key),
)
def compute_sa1_stats(table, remapping, weight, shapefile):
    return aggregate_by_mesh_block_australia(
        shapefile, disaggregated_from_sa1(sa1_table(table, remapping), weight)
    )


class CensusAustraliaGeneration(CensusAustraliaSameAsUS):
    version = 1

    def abs_tables(self):
        # Birth year is taken as 2021 - age; see GenerationStatistics for the boundaries.
        # ABS perturbs each cell independently and zeroes small counts, so summing many tiny cells
        # loses population: the 80 single-year columns lost 1.86% of Australia, versus 0.41% from
        # 5-year groups. Single years are only used around 75/76, which is not a 5-year edge.
        return [
            (
                "G04",
                {
                    "generation_genalpha": ["Age_yr_0_4_P", "Age_yr_5_9_P"],
                    "generation_genz": [
                        "Age_yr_10_14_P",
                        "Age_yr_15_19_P",
                        "Age_yr_20_24_P",
                    ],
                    "generation_millenial": [
                        "Age_yr_25_29_P",
                        "Age_yr_30_34_P",
                        "Age_yr_35_39_P",
                    ],
                    "generation_genx": [
                        "Age_yr_40_44_P",
                        "Age_yr_45_49_P",
                        "Age_yr_50_54_P",
                    ],
                    "generation_boomer": [
                        "Age_yr_55_59_P",
                        "Age_yr_60_64_P",
                        "Age_yr_65_69_P",
                        "Age_yr_70_74_P",
                        "Age_yr_75_P",
                    ],
                    "generation_silent": [
                        "Age_yr_76_P",
                        "Age_yr_77_P",
                        "Age_yr_78_P",
                        "Age_yr_79_P",
                        "Age_yr_80_84_P",
                        "Age_yr_85_89_P",
                        "Age_yr_90_94_P",
                        "Age_yr_95_99_P",
                        "Age_yr_100_yr_over_P",
                    ],
                },
            )
        ]

    def us_equivalent(self):
        return GenerationStatistics()


class CensusAustraliaBirthplace(CensusAustraliaSameAsUS):
    """The DataPack has country of birth but not state, so only born-overseas is available."""

    version = 1

    def abs_tables(self):
        return [
            (
                "G01",
                {
                    "born_australia": ["Birthplace_Australia_P"],
                    "born_elsewhere": ["Birthplace_Elsewhere_P"],
                },
            )
        ]

    def us_equivalent(self):
        return NationalOriginBirthplaceStatistics()

    def us_equivalent_fields(self):
        return ["birthplace_non_us"]

    def post_process(self, statistic_table):
        born_elsewhere = statistic_table["born_elsewhere"]
        return pd.DataFrame(
            {
                "birthplace_non_us_australia": born_elsewhere
                / (statistic_table["born_australia"] + born_elsewhere)
            }
        )


class CensusAustraliaLanguage(CensusAustraliaSameAsUS):
    version = 1

    def abs_tables(self):
        return [
            (
                "G13",
                {
                    "language_english_only": ["PSEO_Tot"],
                    "language_spanish": ["POL_Spanish_Tot"],
                    # POL_Tot_Tot counts everyone who uses a language other than English; language not
                    # stated is a separate cell (P_LUatH_NS_Tot) and is not included. Other is this minus
                    # Spanish, rather than a sum of the ~40 individual languages in it, which comes up 2%
                    # short because perturbation zeroes small cells.
                    "other_language": ["POL_Tot_Tot"],
                },
            )
        ]

    def us_equivalent(self):
        return NationalOriginLanguageStatistics()

    def post_process(self, statistic_table):
        statistic_table = statistic_table.copy()
        statistic_table["language_other"] = (
            statistic_table.pop("other_language") - statistic_table["language_spanish"]
        ).clip(lower=0)
        return super().post_process(statistic_table)


class CensusAustraliaMarriage(CensusAustraliaSameAsUS):
    version = 1

    def abs_tables(self):
        # Registered (legal) marital status, persons 15+. As in the US, separated people are still
        # married and widowed people count as married.
        return [
            (
                "G05",
                {
                    "marriage_never_married": ["P_Tot_Never_married"],
                    "marriage_married_not_divorced": [
                        "P_Tot_Married",
                        "P_Tot_Separated",
                        "P_Tot_Widowed",
                    ],
                    "marriage_divorced": ["P_Tot_Divorced"],
                },
            )
        ]

    def us_equivalent(self):
        return MarriageStatistics()


census_australia_same_as_us = [
    CensusAustraliaGeneration(),
    CensusAustraliaBirthplace(),
    CensusAustraliaLanguage(),
    CensusAustraliaMarriage(),
]
