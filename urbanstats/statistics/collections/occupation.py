from urbanstats.acs import occupation
from urbanstats.acs.load import ACSDataEntity
from urbanstats.games.quiz_question_metadata import (
    OCCUPATION,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class OccupationStatistics(ACSStatisticsColection):
    def __init__(self):
        super().__init__()
        assert set(self.internal_statistic_names_list()) == set(
            self.occupation_name_to_description()
        )

    def name_for_each_statistic(self):
        return occupation.occupation_display

    def varname_for_each_statistic(self):
        return {
            k: "occupation_" + v
            for k, v in {
                "occupation_architecture_and_engineering_occupations": "architects_engineers",
                "occupation_computer_and_mathematical_occupations": "computer_math",
                "occupation_life,_physical,_and_social_science_occupations": "scientists",
                "occupation_arts,_design,_entertainment,_sports,_and_media_occupations": "arts_media",
                "occupation_community_and_social_service_occupations": "social_service",
                "occupation_educational_instruction,_and_library_occupations": "education",
                "occupation_legal_occupations": "legal",
                "occupation_health_diagnosing_and_treating_practitioners_and_other_technical_occupations": "health_practitioners",
                "occupation_health_technologists_and_technicians": "health_technicians",
                "occupation_business_and_financial_operations_occupations": "business_finance",
                "occupation_management_occupations": "management",
                "occupation_construction_and_extraction_occupations": "construction",
                "occupation_farming,_fishing,_and_forestry_occupations": "agriculture",
                "occupation_installation,_maintenance,_and_repair_occupations": "maintenance",
                "occupation_material_moving_occupations": "material_moving",
                "occupation_transportation_occupations": "transportation",
                "occupation_office_and_administrative_support_occupations": "office_admin",
                "occupation_sales_and_related_occupations": "sales",
                "occupation_building_and_grounds_cleaning_and_maintenance_occupations": "cleaning_maintenance",
                "occupation_food_preparation_and_serving_related_occupations": "food_service",
                "occupation_healthcare_support_occupations": "healthcare_support",
                "occupation_personal_care_and_service_occupations": "personal_care",
                "occupation_firefighting_and_prevention,_and_other_protective_service_workers_including_supervisors": "firefighting",
                "occupation_law_enforcement_workers_including_supervisors": "law_enforcement",
                "occupation_production_occupations": "production",
            }.items()
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("industry_and_occupation")

    def quiz_question_descriptors(self):
        # pylint: disable=line-too-long
        quick_names = {
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
        return {
            **QuizQuestionDescriptor.several(
                OCCUPATION,
                {
                    k: v + "!TOOLTIP " + self.occupation_name_to_description()[k]
                    for k, v in quick_names.items()
                },
            ),
            **QuizQuestionSkip.several("occupation_production_occupations"),
        }

    def table(self):
        return [
            (v, self.occupation_name_to_description()[k])
            for k, v in self.name_for_each_statistic().items()
        ]

    def occupation_name_to_description(self):
        return {
            #
            "occupation_management_occupations": "a variety of roles titled 'managers'",
            #
            "occupation_business_and_financial_operations_occupations": "sales agents, insurance agents,"
            " compliance officers, consultants, fundraisers, accountants, auditors,"
            " HR workers, etc.",
            #
            "occupation_computer_and_mathematical_occupations": "software developers, software QA engineers,"
            " system administrators, actuaries, operations researchers",
            #
            "occupation_architecture_and_engineering_occupations": "all kinds of engineers except software engineers,"
            " architects, surveyors, drafters, etc.",
            #
            "occupation_life,_physical,_and_social_science_occupations": "biological scientists, chemists,"
            " physicists, geologists, food scientists, economists, phychologists, urban planners, sociologists,"
            " scientific technicians, etc.",
            #
            "occupation_community_and_social_service_occupations": "social workers, therapists, counselors,"
            " probation officers, clergy, etc.",
            #
            "occupation_legal_occupations": "lawyers, judges, paralegals, legal assistants, etc.",
            #
            "occupation_educational_instruction,_and_library_occupations": "teachers, tutors, professors, "
            "librarians, and archivists",
            #
            "occupation_arts,_design,_entertainment,_sports,_and_media_occupations": "artists, designers, "
            "musicians, actors, dancers, athletes, journalists, editors, writers, photographers, etc.",
            #
            "occupation_health_technologists_and_technicians": "radiology technicians, lab technicians,"
            " hospital machinery technicians, etc.",
            # `
            "occupation_health_diagnosing_and_treating_practitioners_and_other_technical_occupations": "doctors,"
            " registered nurses, physical therapists, pharmacists, dietitians, veterinarians, paramedics, etc.",
            #
            "occupation_healthcare_support_occupations": "nursing assistants, orderlies, home health aides,"
            " massage therapists, dental assistants, etc.",
            #
            "occupation_firefighting_and_prevention,_and_other_protective_service_workers_including_supervisors": "firefighters,"
            " fire inspectors, correctional officers, bailiffs, etc. (effectively, all protective service workers except police officers)",
            "occupation_law_enforcement_workers_including_supervisors": "police officers, detectives, etc.",
            #
            "occupation_food_preparation_and_serving_related_occupations": "cooks, waiters, bartenders,"
            " fast food workers, etc.",
            #
            "occupation_building_and_grounds_cleaning_and_maintenance_occupations": "janitors, maids,"
            " groundskeepers (gardeners), pest control workers, etc.",
            #
            "occupation_personal_care_and_service_occupations": "hairdressers, childcare workers, fitness trainers,"
            " funeral service workers, travel guides, animal trainers, etc.",
            #
            "occupation_sales_and_related_occupations": "retail salespersons, cashiers, telemarketers,"
            " real estate agents, travel agents, travelling salespeople, etc.",
            #
            "occupation_office_and_administrative_support_occupations": "secretaries, receptionists, data entry clerks,"
            " office clerks, mail carriers, shipping clerks, etc.",
            #
            "occupation_farming,_fishing,_and_forestry_occupations": "farmers, ranchers, fishers, loggers,"
            " forest workers, etc.",
            #
            "occupation_construction_and_extraction_occupations": "carpenters, electricians, plumbers,"
            " roofers, miners, etc.",
            #
            "occupation_installation,_maintenance,_and_repair_occupations": "mechanics, HVAC technicians,"
            " electricians, plumbers, etc.",
            #
            "occupation_production_occupations": "assemblers, fabricators, machinists, printing workers,"
            " bakers, butchers, upholsterers, woodworkers, chemical processing machine operators, etc.",
            #
            "occupation_transportation_occupations": "truck drivers, bus drivers, taxi drivers, pilots,"
            " flight attendants, sailors, etc.",
            #
            "occupation_material_moving_occupations": "forklift operators, stock clerks, conveyor operators,"
            " etc.",
        }

    def mutate_acs_results(self, statistics_table):
        fractionalize(statistics_table, *self.internal_statistic_names_list())

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
