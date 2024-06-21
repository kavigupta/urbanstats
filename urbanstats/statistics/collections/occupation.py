from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize

from urbanstats.acs import occupation


class OccupationStatistics(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return occupation.occupation_display

    def category_for_each_statistic(self):
        return self.same_for_each_name("occupation")

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("industry_and_occupation")

    def quiz_question_names(self):
        return {
            "occupation_architecture_and_engineering_occupations": "higher % of workers employed as architects and engineers",
            "occupation_computer_and_mathematical_occupations": "higher % of workers employed in computer and mathematical occupations",
            "occupation_life,_physical,_and_social_science_occupations": "higher % of workers employed in life, physical, and social science occupations",
            "occupation_arts,_design,_entertainment,_sports,_and_media_occupations": "higher % of workers employed in arts, design, entertainment, sports, and media occupations",
            "occupation_community_and_social_service_occupations": "higher % of workers employed in community and social service occupations",
            "occupation_educational_instruction,_and_library_occupations": "higher % of workers employed in educational instruction, and library occupations",
            "occupation_legal_occupations": "higher % of workers employed in legal occupations",
            "occupation_health_diagnosing_and_treating_practitioners_and_other_technical_occupations": "higher % of workers employed in health diagnosing and treating practitioners and other technical occupations",
            "occupation_health_technologists_and_technicians": "higher % of workers employed as health technologists and technicians",
            "occupation_business_and_financial_operations_occupations": "higher % of workers employed in business and financial operations occupations",
            "occupation_management_occupations": "higher % of workers employed as managers",
            "occupation_construction_and_extraction_occupations": "higher % of workers employed in construction and extraction occupations",
            "occupation_farming,_fishing,_and_forestry_occupations": "higher % of workers employed in farming, fishing, and forestry occupations",
            "occupation_installation,_maintenance,_and_repair_occupations": "higher % of workers employed in installation, maintenance, and repair occupations",
            "occupation_material_moving_occupations": "higher % of workers employed as material movers",
            "occupation_transportation_occupations": "higher % of workers employed in transportation occupations",
            "occupation_office_and_administrative_support_occupations": "higher % of workers employed as office and administrative support workers",
            "occupation_sales_and_related_occupations": "higher % of workers employed in sales and related occupations",
            "occupation_building_and_grounds_cleaning_and_maintenance_occupations": "higher % of workers employed in building and grounds cleaning and maintenance occupations",
            "occupation_food_preparation_and_serving_related_occupations": "higher % of workers employed as food preparers or servers",
            "occupation_healthcare_support_occupations": "higher % of workers employed in healthcare support occupations",
            "occupation_personal_care_and_service_occupations": "higher % of workers employed in personal care and service occupations",
            "occupation_firefighting_and_prevention,_and_other_protective_service_workers_including_supervisors": "higher % of workers employed as firefighting and prevention, and other protective service workers including supervisors",
            "occupation_law_enforcement_workers_including_supervisors": "higher % of workers employed as law enforcement workers including supervisors",
        }

    def quiz_question_unused(self):
        return ["occupation_production_occupations"]

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        fractionalize(statistics_table, *self.name_for_each_statistic())

    def acs_name(self):
        return "occupation"

    def acs_entity(self):
        return ACSDataEntity(
            "SEX BY OCCUPATION FOR THE CIVILIAN EMPLOYED POPULATION 16 YEARS AND OVER",
            "population_18",
            "block group",
            {
                occupation.normalize_occupation_name(k): v
                for k, v in occupation.occupation_dict.items()
            },
        )
