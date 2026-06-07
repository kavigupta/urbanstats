from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.games.quiz_question_metadata import QuizQuestionSkip
from urbanstats.statistics.statistic_collection import CanadaStatistics
from urbanstats.statistics.utils import fractionalize


class CensusCanadaOccupation(CanadaStatistics):
    version = 1

    def census_tables(self) -> CensusTables:
        occupation_table = (
            "Total - Labour force aged 15 years and over by occupation - Broad category - "
            "National Occupational Classification (NOC) 2021 - 25% sample data (193)"
        )
        return CensusTables(
            [occupation_table],
            {
                "occupation_legislative_and_senior_management_canada": [
                    "    0 Legislative and senior management occupations",
                ],
                "occupation_business_finance_and_administration_canada": [
                    "    1 Business, finance and administration occupations",
                ],
                "occupation_natural_and_applied_sciences_canada": [
                    "    2 Natural and applied sciences and related occupations",
                ],
                "occupation_health_canada": [
                    "    3 Health occupations",
                ],
                "occupation_education_law_social_community_government_canada": [
                    "    4 Occupations in education, law and social, community and government services",
                ],
                "occupation_art_culture_recreation_sport_canada": [
                    "    5 Occupations in art, culture, recreation and sport",
                ],
                "occupation_sales_and_service_canada": [
                    "    6 Sales and service occupations",
                ],
                "occupation_trades_transport_equipment_canada": [
                    "    7 Trades, transport and equipment operators and related occupations",
                ],
                "occupation_natural_resources_agriculture_canada": [
                    "    8 Natural resources, agriculture and related production occupations",
                ],
                "occupation_manufacturing_utilities_canada": [
                    "    9 Occupations in manufacturing and utilities",
                ],
                None: [
                    occupation_table,
                    "  Occupation - not applicable (190)",
                    "  All occupations (191)",
                ],
            },
            "population",
        )

    def name_for_each_statistic(self):
        return {
            "occupation_legislative_and_senior_management_canada": "Legislative and senior management occupations % [StatCan]",
            "occupation_business_finance_and_administration_canada": "Business, finance and administration occupations % [StatCan]",
            "occupation_natural_and_applied_sciences_canada": "Natural and applied sciences occupations % [StatCan]",
            "occupation_health_canada": "Health occupations % [StatCan]",
            "occupation_education_law_social_community_government_canada": "Education, law, social, community and government occupations % [StatCan]",
            "occupation_art_culture_recreation_sport_canada": "Art, culture, recreation and sport occupations % [StatCan]",
            "occupation_sales_and_service_canada": "Sales and service occupations % [StatCan]",
            "occupation_trades_transport_equipment_canada": "Trades, transport and equipment operators occupations % [StatCan]",
            "occupation_natural_resources_agriculture_canada": "Natural resources and agriculture occupations % [StatCan]",
            "occupation_manufacturing_utilities_canada": "Manufacturing and utilities occupations % [StatCan]",
        }

    def varname_for_each_statistic(self):
        return {
            "occupation_legislative_and_senior_management_canada": "occupation_legislative_senior_management",
            "occupation_business_finance_and_administration_canada": "occupation_business_finance_admin",
            "occupation_natural_and_applied_sciences_canada": "occupation_natural_applied_sciences",
            "occupation_health_canada": "occupation_health",
            "occupation_education_law_social_community_government_canada": "occupation_education_law_social_community_government",
            "occupation_art_culture_recreation_sport_canada": "occupation_art_culture_recreation_sport",
            "occupation_sales_and_service_canada": "occupation_sales_service",
            "occupation_trades_transport_equipment_canada": "occupation_trades_transport_equipment",
            "occupation_natural_resources_agriculture_canada": "occupation_natural_resources_agriculture",
            "occupation_manufacturing_utilities_canada": "occupation_manufacturing_utilities",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census-disaggregated")

    def quiz_question_descriptors(self):
        return QuizQuestionSkip.several(*self.internal_statistic_names_list())

    def compute_statistics_dictionary_canada(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        del existing_statistics, shapefile_table
        table = self.census_tables().compute(2021, shapefile)
        fractionalize(table, *self.internal_statistic_names_list())
        assert set(table) == set(self.internal_statistic_names_list())
        return table
