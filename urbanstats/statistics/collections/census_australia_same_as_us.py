from abc import abstractmethod

from permacache import permacache, stable_hash

from urbanstats.data.australia.abs_tables import sa1_table
from urbanstats.data.australia.mesh_blocks import disaggregated_from_sa1
from urbanstats.geometry.census_aggregation import aggregate_by_mesh_block_australia
from urbanstats.statistics.collections.generation import GenerationStatistics
from urbanstats.statistics.collections.same_as_us import SameAsUS
from urbanstats.statistics.statistic_collection import AustraliaStatistics


class CensusAustraliaSameAsUS(SameAsUS, AustraliaStatistics):
    name_suffix = "australia"
    source_tag = "ABS"

    # "population" or "dwellings"
    disagg_weight = "population"

    @abstractmethod
    def abs_table(self):
        """(DataPack table, US statistic name -> short-header codes summed into it)"""

    def compute_statistics_dictionary_australia(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        table, remapping = self.abs_table()
        remapping = {self.remap_name(k): v for k, v in remapping.items()}
        st = compute_sa1_stats(table, remapping, self.disagg_weight, shapefile)
        return self.post_process(st)

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("australian-census")


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

    def abs_table(self):
        # Birth year is taken as 2021 - age; see GenerationStatistics for the boundaries.
        # ABS perturbs each cell independently and zeroes small counts, so summing many tiny cells
        # loses population: the 80 single-year columns lost 1.86% of Australia, versus 0.41% from
        # 5-year groups. Single years are only used around 75/76, which is not a 5-year edge.
        return "G04", {
            "generation_genalpha": ["Age_yr_0_4_P", "Age_yr_5_9_P"],
            "generation_genz": ["Age_yr_10_14_P", "Age_yr_15_19_P", "Age_yr_20_24_P"],
            "generation_millenial": [
                "Age_yr_25_29_P",
                "Age_yr_30_34_P",
                "Age_yr_35_39_P",
            ],
            "generation_genx": ["Age_yr_40_44_P", "Age_yr_45_49_P", "Age_yr_50_54_P"],
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
        }

    def us_equivalent(self):
        return GenerationStatistics()


census_australia_same_as_us = [
    CensusAustraliaGeneration(),
]
