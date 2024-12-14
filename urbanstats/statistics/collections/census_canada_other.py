from abc import abstractmethod
from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.statistics.collections.generation import GenerationStatistics
from urbanstats.statistics.collections.marriage import MarriageStatistics
from urbanstats.statistics.collections.transportation_commute_time import (
    TransportationCommuteTimeStatistics,
)
from urbanstats.statistics.statistic_collection import CanadaStatistics
from urbanstats.statistics.utils import fractionalize


class CensusCanadaOther(CanadaStatistics):
    @abstractmethod
    def census_tables(self) -> CensusTables:
        pass

    @abstractmethod
    def us_equivalent(self):
        pass

    @abstractmethod
    def post_process(self, statistic_table, existing_statistics):
        pass

    def name_for_each_statistic(self):
        return {
            f"{k}_canada": f"{v} [StatCan]"
            for k, v in self.us_equivalent().name_for_each_statistic().items()
        }

    def quiz_question_names(self):
        return {
            f"{k}_canada": v
            for k, v in self.us_equivalent().quiz_question_names().items()
        }

    def quiz_question_unused(self):
        return [f"{k}_canada" for k in self.us_equivalent().quiz_question_unused()]

    def compute_statistics_dictionary_canada(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        st = self.census_tables().compute(2021, shapefile)
        return self.post_process(st, existing_statistics)

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census-disaggregated")

    def post_process(self, statistic_table, existing_statistics):
        fractionalize(statistic_table, *self.name_for_each_statistic().keys())
        return statistic_table


class CensusCanadaGeneration(CensusCanadaOther):
    version = 2

    def census_tables(self) -> CensusTables:
        # see urbanstats.collections.collections.generation.GenerationStatistics
        return CensusTables(
            ["Total - Age groups of the population - 100% data"],
            {
                None: [
                    "Total - Age groups of the population - 100% data",
                    "  0 to 14 years",
                    "  15 to 64 years",
                    "  65 years and over",
                    "      85 to 89 years",
                    "      90 to 94 years",
                    "      95 to 99 years",
                    "      100 years and over",
                ],
                "generation_genalpha_canada": [
                    "    0 to 4 years",
                    "    5 to 9 years",
                ],
                "generation_genz_canada": [
                    "    10 to 14 years",
                    "    15 to 19 years",
                    "    20 to 24 years",
                ],
                "generation_millenial_canada": [
                    "    25 to 29 years",
                    "    30 to 34 years",
                    "    35 to 39 years",
                ],
                "generation_genx_canada": [
                    "    40 to 44 years",
                    "    45 to 49 years",
                    "    50 to 54 years",
                ],
                "generation_boomer_canada": [
                    "    55 to 59 years",
                    "    60 to 64 years",
                    "    65 to 69 years",
                    "    70 to 74 years",
                ],
                "generation_silent_canada": [
                    "    75 to 79 years",
                    "    80 to 84 years",
                    "    85 years and over",
                ],
            },
            "population",
        )

    def us_equivalent(self):
        return GenerationStatistics()


class CensusCanadaMarriage(CensusCanadaOther):
    version = 4

    def census_tables(self) -> CensusTables:
        return CensusTables(
            [
                "Total - Marital status for the total population aged 15 years and over - 100% data"
            ],
            {
                None: [
                    "Total - Marital status for the total population aged 15 years and over - 100% data",
                    "  Married or living common-law",
                    "    Living common-law",
                    "  Not married and not living common-law",
                ],
                "marriage_never_married_canada": [
                    "    Not married and not living common law - Never married",
                    "      Living common law - Never married",
                ],
                "marriage_married_not_divorced_canada": [
                    "    Married",
                    "      Living common law - Separated",
                    "      Living common law - Widowed",
                    "    Not married and not living common law - Widowed",
                ],
                "marriage_divorced_canada": [
                    "      Living common law - Divorced",
                    "    Not married and not living common law - Separated",
                    "    Not married and not living common law - Divorced",
                ],
            },
            "population",
        )

    def us_equivalent(self):
        return MarriageStatistics()


class CensusCanadaCommuteTime(CensusCanadaOther):
    version = 2

    def census_tables(self) -> CensusTables:
        return CensusTables(
            [
                "Total - Commuting duration for the employed labour force aged 15 years and over with a usual place of work or no fixed workplace address - 25% sample data (201)"
            ],
            {
                None: [
                    "Total - Commuting duration for the employed labour force aged 15 years and over with a usual place of work or no fixed workplace address - 25% sample data (201)",
                ],
                "transportation_commute_time_15_to_29_canada": [
                    "  15 to 29 minutes",
                ],
                "transportation_commute_time_over_60_canada": [
                    "  60 minutes and over",
                ],
                "transportation_commute_time_30_to_59_canada": [
                    "  30 to 44 minutes",
                    "  45 to 59 minutes",
                ],
                "transportation_commute_time_under_15_canada": [
                    "  Less than 15 minutes",
                ],
            },
            "population",
        )

    def us_equivalent(self):
        return TransportationCommuteTimeStatistics()


census_canada_other = [
    CensusCanadaCommuteTime(),
    CensusCanadaGeneration(),
    CensusCanadaMarriage(),
]
