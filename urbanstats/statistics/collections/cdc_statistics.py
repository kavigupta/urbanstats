from urbanstats.census_2010.cdc import aggregated_cdc_table
from urbanstats.games.quiz_question_metadata import (
    HEALTH_CDC,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.statistic_collection import USAStatistics


class CDCStatistics(USAStatistics):
    def name_for_each_statistic(self):
        # pylint: disable=line-too-long
        cdc_columns = {
            "GHLTH": "Fair or poor self-rated health status %",  # "GHLTH": "Fair or poor self-rated health status among adults aged >=18 years",
            "PHLTH": "Physical health not good for two weeks in last year %",  # "PHLTH": "Physical health not good for >=14 days among adults aged >=18 years",
            #
            ### Health outcomes -- mental health is ignored because data is unreliable
            #
            "ARTHRITIS": "Arthritis %",  # "ARTHRITIS": "Arthritis among adults aged >=18 years",
            "CASTHMA": "Current asthma %",  # "CASTHMA": "Current asthma among adults aged >=18 years",
            "BPHIGH": "High blood pressure %",  # "BPHIGH": "High blood pressure among adults aged >=18 years",
            "CANCER": "Cancer (excluding skin cancer) %",  # "CANCER": "Cancer (excluding skin cancer) among adults aged >=18 years",
            "KIDNEY": "Chronic kidney disease %",  # "KIDNEY": "Chronic kidney disease among adults aged >=18 years",
            "COPD": "COPD %",  # "COPD": "Chronic obstructive pulmonary disease among adults aged >=18 years",
            "CHD": "Coronary heart disease %",  # "CHD": "Coronary heart disease among adults aged >=18 years",
            # "DEPRESSION": "Depression among adults aged >=18 years",
            "DIABETES": "Diagnosed diabetes %",  # "DIABETES": "Diagnosed diabetes among adults aged >=18 years",
            "OBESITY": "Obesity %",  # "OBESITY": "Obesity among adults aged >=18 years",
            "STROKE": "Stroke %",  # "STROKE": "Stroke among adults aged >=18 years",
            #
            ### Disability
            #
            "DISABILITY": "Disability %",  # "DISABILITY": "Any disability among adults aged >=18 years",
            "HEARING": "Hearing disability %",  # "HEARING": "Hearing disability among adults aged >=18 years",
            "VISION": "Vision disability %",  # "VISION": "Vision disability among adults aged >=18 years",
            "COGNITION": "Cognitive disability %",  # "COGNITION": "Cognitive disability among adults ages >=18 years",
            "MOBILITY": "Mobility disability %",  # "MOBILITY": "Mobility disability among adults aged >=18 years",
            "SELFCARE": "Self-care disability %",  # "SELFCARE": "Self-care disability among adults aged >=18 years",
            "INDEPLIVE": "Independent living disability %",  # "INDEPLIVE": "Independent living disability among adults aged >=18 years",
            #
            ### Risk Behaviors
            #
            "BINGE": "Binge drinking among adults %",  # "BINGE": "Binge drinking among adults aged >=18 years",
            "CSMOKING": "Smoking %",  # "CSMOKING": "Current smoking among adults aged >=18 years",
            "LPA": "No leisure-time physical activity %",  # "LPA": "No leisure-time physical activity among adults aged >=18 years",
            "SLEEP": "Sleeping less than 7 hours %",  # "SLEEP": "Sleeping less than 7 hours among adults aged >=18 years",
            #
            ### Prevention
            #
            "CHECKUP": "Attended doctor in last year %",  # "CHECKUP": "Visits to doctor for routine checkup within the past year among adults aged >=18 years",
            "DENTAL": "Attended dentist in last year %",  # "DENTAL": "Visits to dentist or dental clinic among adults aged >=18 years",
            # "MHLTH": "Mental health not good for >=14 days among adults aged >=18 years",
            "CHOLSCREEN": "Cholesterol screening in last year %",  # "CHOLSCREEN": "Cholesterol screening among adults aged >=18 years",
            # not among adults
            # "COREM": "Older adult men aged >=65 years who are up to date on a core set of clinical preventive services: Flu shot past year, PPV shot ever, Colorectal cancer screening",
            # "COLON_SCREEN": "Fecal occult blood test, sigmoidoscopy, or colonoscopy among adults aged 50-75 years",
            # "TEETHLOST": "All teeth lost among adults aged >=65 years",
            # "COREW": "Older adult women aged >=65 years who are up to date on a core set of clinical preventive services: Flu shot past year, PPV shot ever, Colorectal cancer screening, and Mammogram past 2 years",
            # "MAMMOUSE": "Mammography use among women aged 50-74 years",
            # "ACCESS2": "Current lack of health insurance among adults aged 18-64 years",
            # "BPMED": "Taking medicine for high blood pressure control among adults aged >=18 years with high blood pressure",
            # "CERVICAL": "Cervical cancer screening among adult women aged 21-65 years",
            # "HIGHCHOL": "High cholesterol among adults aged >=18 years who have been screened in the past 5 years",
        }
        out = {f"{k}_cdc_2": v for k, v in cdc_columns.items()}
        return out

    def varname_for_each_statistic(self):
        return {
            "GHLTH_cdc_2": "poor_health",
            "PHLTH_cdc_2": "poor_physical_health",
            "ARTHRITIS_cdc_2": "arthritis",
            "CASTHMA_cdc_2": "asthma",
            "BPHIGH_cdc_2": "high_blood_pressure",
            "CANCER_cdc_2": "cancer",
            "KIDNEY_cdc_2": "kidney_disease",
            "COPD_cdc_2": "copd",
            "CHD_cdc_2": "heart_disease",
            "DIABETES_cdc_2": "diabetes",
            "OBESITY_cdc_2": "obesity",
            "STROKE_cdc_2": "stroke",
            "DISABILITY_cdc_2": "any_disability",
            "HEARING_cdc_2": "hearing_disability",
            "VISION_cdc_2": "vision_disability",
            "COGNITION_cdc_2": "cognitive_disability",
            "MOBILITY_cdc_2": "mobility_disability",
            "SELFCARE_cdc_2": "selfcare_disability",
            "INDEPLIVE_cdc_2": "independent_living_disability",
            "BINGE_cdc_2": "binge_drinking",
            "CSMOKING_cdc_2": "smoking",
            "LPA_cdc_2": "no_physical_activity",
            "SLEEP_cdc_2": "insufficient_sleep",
            "CHECKUP_cdc_2": "doctor_checkup_last_year",
            "DENTAL_cdc_2": "dental_visit_last_year",
            "CHOLSCREEN_cdc_2": "cholesterol_screening_last_year",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("health")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                HEALTH_CDC,
                {
                    "GHLTH_cdc_2": "higher % of adults with a fair or poor self-rated health status",
                    "ARTHRITIS_cdc_2": "higher % of adults with arthritis",
                    "CASTHMA_cdc_2": "higher % of adults with asthma",
                    "BPHIGH_cdc_2": "higher % of adults with high blood pressure",
                    "CANCER_cdc_2": "higher % of adults with cancer (excluding skin cancer)",
                    "KIDNEY_cdc_2": "higher % of adults with chronic kidney disease",
                    "COPD_cdc_2": "higher % of adults with COPD !TOOLTIP (Chronic obstructive pulmonary disease, a lung disease linked to smoking)",
                    "CHD_cdc_2": "higher % of adults with coronary heart disease",
                    "DIABETES_cdc_2": "higher % of adults with diagnosed diabetes",
                    "OBESITY_cdc_2": "higher % of adults with obesity",
                    "STROKE_cdc_2": "higher % of adults who have had a stroke",
                    "DISABILITY_cdc_2": "higher % of adults with a disability",
                    "HEARING_cdc_2": "higher % of adults with a hearing disability",
                    "VISION_cdc_2": "higher % of adults with a vision disability",
                    "COGNITION_cdc_2": "higher % of adults with a cognitive disability",
                    "MOBILITY_cdc_2": "higher % of adults with a mobility disability",
                    "SELFCARE_cdc_2": "higher % of adults with a self-care disability",
                    "INDEPLIVE_cdc_2": "higher % of adults with an independent living disability",
                    "BINGE_cdc_2": "higher % of adults who binge drink",
                    "CSMOKING_cdc_2": "higher % of adults who smoke",
                    "LPA_cdc_2": "higher % of adults who don't exercise (do leisure-time physical activity)",
                    "SLEEP_cdc_2": "higher % of adults who sleep less than 7 hours",
                },
            ),
            **QuizQuestionSkip.several(
                # too hard to explain
                "CHOLSCREEN_cdc_2",
                "CHECKUP_cdc_2",
                "PHLTH_cdc_2",
                "DENTAL_cdc_2",
            ),
        }

    def dependencies(self):
        return ["population_18_2010"]

    def compute_statistics_dictionary_usa(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        result = {}
        cdc_table = aggregated_cdc_table(shapefile)
        for cdc in self.name_for_each_statistic():
            result[cdc] = cdc_table[cdc]
        for cdc in self.name_for_each_statistic():
            result[cdc] /= existing_statistics["population_18_2010"]
        return result
