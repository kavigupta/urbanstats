from abc import abstractmethod

import numpy as np

from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.statistics.collections.census import Census2020, race_names
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

    def us_equivalent_fields(self):
        return list(self.us_equivalent().internal_statistic_names_list())

    def name_for_each_statistic(self):
        return {
            f"{k}_canada": f"{v} [StatCan]"
            for k, v in self.us_equivalent().name_for_each_statistic().items()
            if k in self.us_equivalent_fields()
        }

    def varname_for_each_statistic(self):
        return {
            f"{k}_canada": v
            for k, v in self.us_equivalent().varname_for_each_statistic().items()
            if k in self.us_equivalent_fields()
        }

    def quiz_question_descriptors(self):
        return {
            f"{k}_canada": self.us_equivalent().quiz_question_descriptors()[k]
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
    version = 3

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


class CensusCanadaRace(CensusCanadaSameAsUS):
    version = 5

    def us_equivalent_fields(self):
        return list(race_names)

    def census_tables(self) -> CensusTables:
        table_name = "Total - Ethnic or cultural origin for the population in private households - 25% sample data (121)"

        unambiguously_native = [
            "  First Nations (North American Indian), n.o.s. (125)",
            "  Métis",
            "  Inuit, n.o.s. (138)",
            "  North American Indigenous, n.o.s. (132)",
            "  Cree, n.o.s. (130)",
            "  Plains Cree",
            "  Woodland Cree",
            "  Mi'kmaq, n.o.s. (134)",
            "  Innu/Montagnais, n.o.s. (149)",
            "  Dene, n.o.s. (152)",
            "  Blackfoot, n.o.s. (153)",
            "  Anishinaabe, n.o.s. (157)",
            "  Ojibway",
            "  Algonquin",
            "  Mohawk",
            "  Abenaki",
            "  Iroquois (Haudenosaunee), n.o.s. (154)",
            "  Huron (Wendat)",
            "  Saulteaux",
            "  Atikamekw",
            "  Oji-Cree",
            "  Maliseet",
            "  Qalipu Mi'kmaq",
            "  Cherokee",
        ]

        unambiguously_black = [
            "  Black, n.o.s. (137)",
            "  African, n.o.s. (127)",
            "  Jamaican",
            "  Haitian",
            "  Guyanese",
            "  Trinidadian/Tobagonian",
            "  Barbadian",
            "  Grenadian",
            "  St. Lucian",
            "  Vincentian",
            "  Nigerian",
            "  Somali",
            "  Ethiopian",
            "  Ghanaian",
            "  Eritrean",
            "  Ivorian",
            "  Kenyan",
            "  Sudanese",
            "  Ugandan",
            "  Rwandan",
            "  Burundian",
            "  Senegalese",
            "  Guinean",
            "  Beninese",
            "  Edo",
            "  Yoruba",
            "  Igbo",
            "  Amhara",
            "  Bantu, n.o.s. (158)",
            "  Akan, n.o.s. (159)",
            "  Central or West African, n.o.s. (160)",
            "  Fulani",
            "  Oromo",
            "  Tigrinya",
            "  Malagasy",
            "  Zimbabwean",
            "  Congolese",
            "  Cameroonian",
            "  Bamileke",
            "  Central African",
            "  Southern or East African, n.o.s. (156)",
            "  Tanzanian",
            "  Mauritian",
            "  African Caribbean",
            "  African Canadian",
            "  African American",
            "  African Nova Scotian",
        ]

        unambiguously_hispanic = [
            "  Hispanic, n.o.s. (144)",
            "  Latin, Central or South American, n.o.s. (136)",
            "  Mexican",
            "  Peruvian",
            "  Colombian",
            "  Chilean",
            "  Cuban",
            "  Venezuelan",
            "  Ecuadorian",
            "  Guatemalan",
            "  Honduran",
            "  Nicaraguan",
            "  Salvadorean",
            "  Dominican",
            "  Brazilian",
            "  Argentinian",
            "  Uruguayan",
            "  Costa Rican",
            "  Paraguayan",
            "  Mayan",
            "  Spanish",
        ]

        middle_east = [
            "  West or Central Asian or Middle Eastern, n.o.s. (141)",
            "  Arab, n.o.s. (128)",
            "  Palestinian",
            "  Egyptian",
            "  Moroccan",
            "  North African, n.o.s. (155)",
            "  Algerian",
            "  Libyan",
            "  Tunisian",
            "  Berber",
            "  Kabyle",
            "  Coptic",
            "  Assyrian",
            "  Chaldean",
            "  Iraqi",
            "  Syrian",
            "  Lebanese",
            "  Turkish",
            "  Armenian",
            "  Azerbaijani",
            "  Kurdish",
            "  Jordanian",
            "  Yemeni",
            "  Israeli",
        ]

        unambiguously_asian = [
            "  Asian, n.o.s. (129)",
            "  Chinese",
            "  Filipino",
            "  Korean",
            "  Japanese",
            "  South Asian, n.o.s. (133)",
            "  East or Southeast Asian, n.o.s. (140)",
            "  Hong Konger",
            "  Taiwanese",
            "  Cambodian (Khmer)",
            "  Malaysian",
            "  Burmese",
            "  Indian (India)",
            "  Pakistani",
            "  Punjabi",
            "  Vietnamese",
            "  Iranian",
            "  Persian",
            "  Pashtun",
            "  Tibetan",
            "  Mongolian",
            "  Thai",
            "  Laotian",
            "  Indonesian",
            "  Malay",
            "  Gujarati",
            "  Tamil",
            "  Telugu",
            "  Malayali",
            "  Bengali",
            "  Sinhalese",
            "  Nepali",
            "  Karen",
            "  Igorot",
            "  Ilocano",
            "  Bangladeshi",
            "  Sri Lankan",
            "  Afghan",
            "  Tajik",
            "  Kashmiri",
            "  Singaporean",
            "  Sikh",
            "  Hindu",
            "  Jatt",
            "  Goan",
            "  Indo-Caribbean",
            "  Indo-Guyanese",
        ]

        other_mixed = [
            "  Christian, n.i.e. (131)",
            "  Muslim",
            "  Buddhist",
            "  Fijian",
        ]

        unambiguously_white = [
            "  Canadian",
            "  English",
            "  Irish",
            "  Scottish",
            "  French, n.o.s. (122)",
            "  French Canadian",
            "  German",
            "  Italian",
            "  Ukrainian",
            "  Dutch",
            "  Polish",
            "  Québécois",
            "  British Isles, n.o.s. (123)",
            "  Caucasian (White), n.o.s. (124)",
            "  European, n.o.s. (126)",
            "  Russian",
            "  Norwegian",
            "  Welsh",
            "  Portuguese",
            "  American",
            "  Swedish",
            "  Hungarian",
            "  Acadian",
            "  Jewish",
            "  Greek",
            "  Romanian",
            "  Danish",
            "  Austrian",
            "  Belgian",
            "  Mennonite",
            "  Swiss",
            "  Finnish",
            "  Croatian",
            "  Icelandic",
            "  Czech",
            "  Serbian",
            "  Newfoundlander",
            "  Ontarian",
            "  Slovak",
            "  Lithuanian",
            "  Byelorussian",
            "  Moldovan",
            "  Roma",
            "  Australian",
            "  Albanian",
            "  Maltese",
            "  Macedonian",
            "  Slovenian",
            "  New Brunswicker",
            "  Czechoslovakian, n.o.s. (146)",
            "  Bulgarian",
            "  Albertan",
            "  Yugoslavian, n.o.s. (147)",
            "  Bosnian",
            "  Latvian",
            "  Northern Irish",
            "  Celtic, n.o.s. (150)",
            "  British Columbian",
            "  Franco Ontarian",
            "  Estonian",
            "  New Zealander",
            "  Breton",
            "  Pennsylvania Dutch",
            "  Nova Scotian",
            "  Prince Edward Islander",
            "  Manitoban",
            "  Saskatchewanian",
            "  Cape Bretoner",
            "  Gaspesian",
            "  Norman",
            "  Flemish",
            "  United Empire Loyalist",
            "  Sicilian",
            "  Azorean",
            "  Basque",
            "  Western European, n.o.s. (145)",
            "  Northern European, n.o.s. (135)",
            "  Eastern European, n.o.s. (139)",
            "  Slavic, n.o.s. (148)",
        ]

        return CensusTables(
            [table_name],
            {
                None: [table_name],
                "white_canada": [
                    *unambiguously_white,
                    *middle_east,
                    "  North American, n.o.s. (151)",
                    "  South African",
                ],
                "black_canada": [
                    *unambiguously_black,
                    "  Caribbean, n.o.s. (142)",
                    "  West Indian, n.o.s. (143)",
                ],
                "asian_canada": unambiguously_asian,
                "hispanic_canada": unambiguously_hispanic,
                "native_canada": unambiguously_native,
                "other / mixed_canada": other_mixed,
            },
            "population",
        )

    def us_equivalent(self):
        return Census2020()

    def post_process(self, statistic_table):
        statistic_table = statistic_table.copy()
        for column in ["hawaiian_pi_canada"]:
            assert column not in statistic_table
            statistic_table[column] = statistic_table.iloc[:, 0] * 0.0
        fractionalize(statistic_table, *self.internal_statistic_names_list())
        return statistic_table


census_canada_same_as_us = [
    CensusCanadaCommuteTime(),
    CensusCanadaGeneration(),
    CensusCanadaMarriage(),
    CensusCanadaIndustry(),
    CensusCanadaRace(),
]
