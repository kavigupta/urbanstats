from urbanstats.acs import industry
from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class IndustryStatistics(ACSStatisticsColection):
    def __init__(self):
        super().__init__()
        assert set(self.category_for_each_statistic()) == set(
            self.industry_name_to_description()
        )

    def name_for_each_statistic(self):
        return industry.industry_display

    def category_for_each_statistic(self):
        return self.same_for_each_name("industry")

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("industry_and_occupation")

    def quiz_question_names(self):
        quick_names = {
            "industry_agriculture,_forestry,_fishing_and_hunting": "higher % of workers employed in the agriculture, forestry, fishing, and hunting industries",
            "industry_mining,_quarrying,_and_oil_and_gas_extraction": "higher % of workers employed in the mining, quarrying, and oil/gas extraction industries",
            "industry_accommodation_and_food_services": "higher % of workers employed in the accommodation and food services industry",
            "industry_arts,_entertainment,_and_recreation": "higher % of workers employed in the arts, entertainment, and recreation industry",
            "industry_construction": "higher % of workers employed in the construction industry",
            "industry_educational_services": "higher % of workers employed in the educational services industry",
            "industry_health_care_and_social_assistance": "higher % of workers employed in the health care and social assistance industry",
            "industry_finance_and_insurance": "higher % of workers employed in the finance and insurance industry",
            "industry_real_estate_and_rental_and_leasing": "higher % of workers employed in the real estate and rental and leasing industry",
            "industry_information": "higher % of workers employed in the information industry",
            "industry_manufacturing": "higher % of workers employed in the manufacturing industry",
            "industry_other_services,_except_public_administration": "higher % of workers employed in other service industries, except public administration",
            "industry_administrative_and_support_and_waste_management_services": "higher % of workers employed in the administrative/support/waste management services industries",
            "industry_management_of_companies_and_enterprises": "higher % of workers employed in the management industry",
            "industry_professional,_scientific,_and_technical_services": "higher % of workers employed in the professional, scientific, and technical services industry",
            "industry_public_administration": "higher % of workers employed in public administration",
            "industry_retail_trade": "higher % of workers employed in the retail trade industry",
            "industry_transportation_and_warehousing": "higher % of workers employed in the transportation and warehousing industry",
            "industry_utilities": "higher % of workers employed in the utilities industry",
            "industry_wholesale_trade": "higher % of workers employed in the wholesale trade industry",
        }
        return {
            k: v + "!TOOLTIP " + self.industry_name_to_description()[k]
            for k, v in quick_names.items()
        }

    def table(self):
        return [
            (v, self.industry_name_to_description()[k])
            for k, v in self.name_for_each_statistic().items()
        ]

    def industry_name_to_description(self):
        return {
            #
            "industry_agriculture,_forestry,_fishing_and_hunting": "agriculture, forestry, logging, fishing, and hunting",
            #
            "industry_mining,_quarrying,_and_oil_and_gas_extraction": "mining, quarrying, and oil and gas extraction",
            #
            "industry_utilities": "electrical power generation, transmission, and distribution;"
            " natural gas distribution; water, sewage, and other systems",
            #
            "industry_construction": "construction",
            #
            "industry_manufacturing": "metal manufacturing, machinery manufacturing,"
            " cement and concrete product manufacturing, sawmills, wood product manufacturing,"
            " food and beverage manufacturing, textile mills, apparel manufacturing,"
            " paper manufacturing, printing, chemical manufacturing, plastics and rubber products manufacturing,"
            " etc.",
            #
            "industry_wholesale_trade": "wholesalers of all kinds of goods",
            #
            "industry_retail_trade": "retailers of all kinds of goods, including stores,"
            " gas stations, florists, etc.",
            #
            "industry_transportation_and_warehousing": "transportation by all means, taxis, buses,"
            " sightseeing transportation, warehousing, etc.",
            #
            "industry_information": "publishing industries, software publishers,"
            " data processing services, broadcasting, libraries, etc.",
            #
            "industry_finance_and_insurance": "banks, credit unions, insurance carriers,"
            " securities and commodity contracts, etc.",
            #
            "industry_real_estate_and_rental_and_leasing": "real estate, rental and leasing,"
            " lessors of real estate, etc.",
            #
            "industry_professional,_scientific,_and_technical_services": "legal services,"
            " accounting services, architectural services, engineering services,"
            " computer systems design services, management consulting services, etc.",
            #
            "industry_management_of_companies_and_enterprises": "management of companies and enterprises",
            #
            "industry_administrative_and_support_and_waste_management_services": "office administrative services,"
            " employment services, business support services, waste management and remediation services, etc.",
            #
            "industry_educational_services": "elementary and secondary schools, colleges, universities,"
            "etc.",
            #
            "industry_health_care_and_social_assistance": "hospitals, nursing care facilities,"
            " offices of physicians, dentists, day care centers, etc.",
            #
            "industry_arts,_entertainment,_and_recreation": "performing arts companies,"
            " sports, museums, amusement parks, gambling industries, etc.",
            #
            "industry_accommodation_and_food_services": "hotels, restaurants, bars, caterers,"
            " food services contractors, etc.",
            #
            "industry_other_services,_except_public_administration": "repair and maintenance,"
            " personal care services, beauty salons, funeral homes, religious organizations,"
            " civic and social organizations, etc.",
            #
            "industry_public_administration": "executive offices, legislative bodies,"
            " public finance activities, public order and safety activities, etc.",
        }

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        fractionalize(statistics_table, *self.name_for_each_statistic())

    def acs_name(self):
        return "industry"

    def acs_entity(self):
        return ACSDataEntity(
            "SEX BY INDUSTRY FOR THE CIVILIAN EMPLOYED POPULATION 16 YEARS AND OVER",
            "population_18",
            "block group",
            {
                industry.normalize_industry_name(k): v
                for k, v in industry.industry_dict.items()
            },
        )
