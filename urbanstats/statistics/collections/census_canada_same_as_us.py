from abc import abstractmethod

import numpy as np

from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.statistics.collections.generation import GenerationStatistics
from urbanstats.statistics.collections.industry import IndustryStatistics
from urbanstats.statistics.collections.marriage import MarriageStatistics
from urbanstats.statistics.collections.transportation_commute_time import (
    TransportationCommuteTimeStatistics,
)
from urbanstats.statistics.statistic_collection import CanadaStatistics
from urbanstats.statistics.utils import fractionalize
from urbanstats.utils import approximate_quantile


class CensusCanadaSameAsUS(CanadaStatistics):
    """
    Represents a collection of statistics that are the same as the US statistic tables.
    """

    @abstractmethod
    def census_tables(self) -> CensusTables:
        pass

    @abstractmethod
    def us_equivalent(self):
        pass

    def remap_name(self, us_internal_name):
        return f"{us_internal_name}_canada"

    def us_equivalent_fields(self):
        return list(self.us_equivalent().internal_statistic_names_list())

    def name_for_each_statistic(self):
        return {
            self.remap_name(k): f"{v} [StatCan]"
            for k, v in self.us_equivalent().name_for_each_statistic().items()
            if k in self.us_equivalent_fields()
        }

    def varname_for_each_statistic(self):
        return {
            self.remap_name(k): v
            for k, v in self.us_equivalent().varname_for_each_statistic().items()
            if k in self.us_equivalent_fields()
        }

    def quiz_question_descriptors(self):
        return {
            self.remap_name(k): self.us_equivalent().quiz_question_descriptors()[k]
            for k in self.us_equivalent_fields()
        }

    def compute_statistics_dictionary_canada(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        st = self.census_tables().compute(2021, shapefile)
        return self.post_process(st)

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census-disaggregated")

    def post_process(self, statistic_table):
        fractionalize(statistic_table, *self.internal_statistic_names_list())
        return statistic_table


class CensusCanadaGeneration(CensusCanadaSameAsUS):
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


class CensusCanadaMarriage(CensusCanadaSameAsUS):
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


class CensusCanadaCommuteTime(CensusCanadaSameAsUS):
    version: int = 3

    def census_tables(self) -> CensusTables:
        # pylint: disable=line-too-long
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
                "transportation_commute_time_30_to_44_canada": [
                    "  30 to 44 minutes",
                ],
                "transportation_commute_time_45_to_59_canada": [
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

    def post_process(self, statistic_table):
        stats_array = np.array(
            statistic_table[
                [
                    "transportation_commute_time_under_15_canada",
                    "transportation_commute_time_15_to_29_canada",
                    "transportation_commute_time_30_to_44_canada",
                    "transportation_commute_time_45_to_59_canada",
                    "transportation_commute_time_over_60_canada",
                ]
            ]
        )
        median_commute = np.array(
            [
                approximate_quantile([0, 15, 30, 45, 60, 120], s, 0.5)
                for s in stats_array
            ]
        )
        statistic_table[
            "transportation_commute_time_30_to_59_canada"
        ] = statistic_table.pop(
            "transportation_commute_time_30_to_44_canada"
        ) + statistic_table.pop(
            "transportation_commute_time_45_to_59_canada"
        )
        columns = [
            "transportation_commute_time_under_15_canada",
            "transportation_commute_time_15_to_29_canada",
            "transportation_commute_time_30_to_59_canada",
            "transportation_commute_time_over_60_canada",
        ]
        fractionalize(statistic_table, *columns)
        assert set(columns) == set(statistic_table)
        statistic_table["transportation_commute_time_median_canada"] = median_commute
        assert set(statistic_table) == set(self.internal_statistic_names_list())
        return statistic_table


class CensusCanadaIndustry(CensusCanadaSameAsUS):
    version = 2

    def census_tables(self) -> CensusTables:
        # pylint: disable=line-too-long
        return CensusTables(
            [
                "Total - Labour force aged 15 years and over by industry - Sectors - North American Industry Classification System (NAICS) 2017 - 25% sample data (194)",
            ],
            {
                None: [
                    "Total - Labour force aged 15 years and over by industry - Sectors - North American Industry Classification System (NAICS) 2017 - 25% sample data (194)",
                    "  Industry - not applicable (190)",
                    "  All industries (191)",
                ],
                "industry_agriculture,_forestry,_fishing_and_hunting_canada": [
                    "    11 Agriculture, forestry, fishing and hunting",
                ],
                # "industry_mining,_quarrying,_and_oil_and_gas_extraction": "higher % of workers employed in the mining, quarrying, and oil/gas extraction industries",
                "industry_mining,_quarrying,_and_oil_and_gas_extraction_canada": [
                    "    21 Mining, quarrying, and oil and gas extraction",
                ],
                "industry_accommodation_and_food_services_canada": [
                    "    72 Accommodation and food services",
                ],
                "industry_arts,_entertainment,_and_recreation_canada": [
                    "    71 Arts, entertainment and recreation",
                ],
                "industry_construction_canada": [
                    "    23 Construction",
                ],
                "industry_educational_services_canada": [
                    "    61 Educational services",
                ],
                "industry_health_care_and_social_assistance_canada": [
                    "    62 Health care and social assistance",
                ],
                "industry_finance_and_insurance_canada": [
                    "    52 Finance and insurance",
                ],
                "industry_real_estate_and_rental_and_leasing_canada": [
                    "    53 Real estate and rental and leasing",
                ],
                "industry_information_canada": [
                    "    51 Information and cultural industries",
                ],
                "industry_manufacturing_canada": [
                    "    31-33 Manufacturing",
                ],
                "industry_other_services,_except_public_administration_canada": [
                    "    81 Other services (except public administration)",
                ],
                "industry_administrative_and_support_and_waste_management_services_canada": [
                    "    56 Administrative and support, waste management and remediation services",
                ],
                "industry_management_of_companies_and_enterprises_canada": [
                    "    55 Management of companies and enterprises",
                ],
                "industry_professional,_scientific,_and_technical_services_canada": [
                    "    54 Professional, scientific and technical services",
                ],
                "industry_public_administration_canada": [
                    "    91 Public administration",
                ],
                "industry_retail_trade_canada": [
                    "    44-45 Retail trade",
                ],
                "industry_transportation_and_warehousing_canada": [
                    "    48-49 Transportation and warehousing",
                ],
                "industry_utilities_canada": [
                    "    22 Utilities",
                ],
                "industry_wholesale_trade_canada": [
                    "    41 Wholesale trade",
                ],
            },
            "population",
        )

    def us_equivalent(self):
        return IndustryStatistics()


census_canada_same_as_us = [
    CensusCanadaCommuteTime(),
    CensusCanadaGeneration(),
    CensusCanadaMarriage(),
    CensusCanadaIndustry(),
]
