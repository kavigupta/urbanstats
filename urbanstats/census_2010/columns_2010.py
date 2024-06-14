from urbanstats.statistics.collections.race_census import RaceCensus


def cdc_columns():
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


def basics_2010():
    from produce_html_page import ad

    ad_2010 = {f"{k}_2010": f"{v} (2010)" for k, v in ad.items()}
    ad_change = {f"{k}_change_2010": f"{v} Change (2010-2020)" for k, v in ad.items()}

    return {
        "population_2010": "Population (2010)",
        "population_change_2010": "Population Change (2010-2020)",
        **{"ad_1_2010": ad_2010["ad_1_2010"]},
        **{"ad_1_change_2010": ad_change["ad_1_change_2010"]},
        "sd_2010": "AW Density (2010)",
        **{
            f"{k}_2010": f"{v} (2010)"
            for k, v in RaceCensus().name_for_each_statistic().items()
        },
        "housing_per_pop_2010": "Housing Units per Adult (2010)",
        "vacancy_2010": "Vacancy % (2010)",
    }, {
        **{k: ad_2010[k] for k in ad_2010 if k != "ad_1_2010"},
        **{k: ad_change[k] for k in ad_change if k != "ad_1_change_2010"},
    }
