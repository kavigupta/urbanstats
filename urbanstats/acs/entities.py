from urbanstats.acs.load import ACSDataEntity
from urbanstats.acs.industry import industry_dict, normalize_industry_name
from urbanstats.acs.occupation import occupation_dict, normalize_occupation_name
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.collections_list import statistic_collections

entities = dict(
    education=ACSDataEntity(
        "EDUCATIONAL ATTAINMENT FOR THE POPULATION 25 YEARS AND OVER",
        "population_18",
        "block group",
        {
            "education_total": ["Estimate!!Total:"],
            "education_no": [
                "Estimate!!Total:!!No schooling completed",
                "Estimate!!Total:!!Nursery school",
                "Estimate!!Total:!!Kindergarten",
                "Estimate!!Total:!!1st grade",
                "Estimate!!Total:!!2nd grade",
                "Estimate!!Total:!!3rd grade",
                "Estimate!!Total:!!4th grade",
                "Estimate!!Total:!!5th grade",
                "Estimate!!Total:!!6th grade",
                "Estimate!!Total:!!7th grade",
                "Estimate!!Total:!!8th grade",
                "Estimate!!Total:!!9th grade",
                "Estimate!!Total:!!10th grade",
                "Estimate!!Total:!!11th grade",
                "Estimate!!Total:!!12th grade, no diploma",
            ],
            "education_high_school": [
                "Estimate!!Total:!!Regular high school diploma",
                "Estimate!!Total:!!GED or alternative credential",
                "Estimate!!Total:!!GED or alternative credential",
                "Estimate!!Total:!!Some college, less than 1 year",
                "Estimate!!Total:!!Some college, 1 or more years, no degree",
                "Estimate!!Total:!!Associate's degree",
            ],
            "education_ugrad": [
                "Estimate!!Total:!!Bachelor's degree",
            ],
            "education_grad": [
                "Estimate!!Total:!!Master's degree",
                "Estimate!!Total:!!Professional school degree",
                "Estimate!!Total:!!Doctorate degree",
            ],
        },
    ),
    education_field=ACSDataEntity(
        "FIELD OF BACHELOR'S DEGREE FOR FIRST MAJOR FOR THE POPULATION 25 YEARS AND OVER",
        "population_18",
        "block group",
        {
            "education_field_total": ["Estimate!!Total:"],
            "education_field_stem": [
                "Estimate!!Total:!!Science and Engineering Related Fields",
                "Estimate!!Total:!!Science and Engineering",
            ],
            "education_field_humanities": [
                "Estimate!!Total:!!Arts, Humanities and Other",
                "Estimate!!Total:!!Education",
            ],
            "education_field_business": [
                "Estimate!!Total:!!Business",
            ],
        },
    ),
    generation=ACSDataEntity(
        # collected in 2021, so generations are =, and we are using []
        # silent (1928-1945) = 76-93 [75, inf] which is [-inf, 1946]
        # boomer (1946-1964) = 57-75 [55, 74] which is [1946, 1966]
        # genx (1965-1980) = 41-56 [40, 54] which is [1967, 1981]
        # millenial (1981-1996) = 25-40 [25, 39] which is [1982, 1996]
        # genz (1997-2012) = 9-24 [10, 24] which is [1997, 2011]
        # genalpha (2013-2025) = 0-8 [0, 9] which is [2012, 2021]
        "SEX BY AGE",
        "population",
        "block group",
        {
            "generation_total": [
                "Estimate!!Total:",
            ],
            "generation_silent": [
                # 75+
                "Estimate!!Total:!!Male:!!75 to 79 years",
                "Estimate!!Total:!!Male:!!80 to 84 years",
                "Estimate!!Total:!!Male:!!85 years and over",
                "Estimate!!Total:!!Female:!!75 to 79 years",
                "Estimate!!Total:!!Female:!!80 to 84 years",
                "Estimate!!Total:!!Female:!!85 years and over",
            ],
            "generation_boomer": [
                # 55-74
                "Estimate!!Total:!!Male:!!55 to 59 years",
                "Estimate!!Total:!!Male:!!60 and 61 years",
                "Estimate!!Total:!!Male:!!62 to 64 years",
                "Estimate!!Total:!!Male:!!65 and 66 years",
                "Estimate!!Total:!!Male:!!67 to 69 years",
                "Estimate!!Total:!!Male:!!70 to 74 years",
                "Estimate!!Total:!!Female:!!55 to 59 years",
                "Estimate!!Total:!!Female:!!60 and 61 years",
                "Estimate!!Total:!!Female:!!62 to 64 years",
                "Estimate!!Total:!!Female:!!65 and 66 years",
                "Estimate!!Total:!!Female:!!67 to 69 years",
                "Estimate!!Total:!!Female:!!70 to 74 years",
            ],
            "generation_genx": [
                # 40-54
                "Estimate!!Total:!!Male:!!40 to 44 years",
                "Estimate!!Total:!!Male:!!45 to 49 years",
                "Estimate!!Total:!!Male:!!50 to 54 years",
                "Estimate!!Total:!!Female:!!40 to 44 years",
                "Estimate!!Total:!!Female:!!45 to 49 years",
                "Estimate!!Total:!!Female:!!50 to 54 years",
            ],
            "generation_millenial": [
                # 25-39
                "Estimate!!Total:!!Male:!!25 to 29 years",
                "Estimate!!Total:!!Male:!!30 to 34 years",
                "Estimate!!Total:!!Male:!!35 to 39 years",
                "Estimate!!Total:!!Female:!!25 to 29 years",
                "Estimate!!Total:!!Female:!!30 to 34 years",
                "Estimate!!Total:!!Female:!!35 to 39 years",
            ],
            "generation_genz": [
                # 10-24
                "Estimate!!Total:!!Male:!!10 to 14 years",
                "Estimate!!Total:!!Male:!!15 to 17 years",
                "Estimate!!Total:!!Male:!!18 and 19 years",
                "Estimate!!Total:!!Male:!!20 years",
                "Estimate!!Total:!!Male:!!21 years",
                "Estimate!!Total:!!Male:!!22 to 24 years",
                "Estimate!!Total:!!Female:!!10 to 14 years",
                "Estimate!!Total:!!Female:!!15 to 17 years",
                "Estimate!!Total:!!Female:!!18 and 19 years",
                "Estimate!!Total:!!Female:!!20 years",
                "Estimate!!Total:!!Female:!!21 years",
                "Estimate!!Total:!!Female:!!22 to 24 years",
            ],
            "generation_genalpha": [
                # 0-9
                "Estimate!!Total:!!Male:!!Under 5 years",
                "Estimate!!Total:!!Male:!!5 to 9 years",
                "Estimate!!Total:!!Female:!!Under 5 years",
                "Estimate!!Total:!!Female:!!5 to 9 years",
            ],
            None: [
                "Estimate!!Total:!!Female:",
                "Estimate!!Total:!!Male:",
            ],
        },
    ),
    # aggregate_income_total=ACSDataEntity(
    #     "AGGREGATE INCOME IN THE PAST 12 MONTHS (IN 2021 INFLATION-ADJUSTED DOLLARS)",
    #     "population_18",
    #     "block group",
    #     {
    #         "aggregate_income_total": [
    #             "Estimate!!Aggregate income in the past 12 months (in 2021 inflation-adjusted dollars)"
    #         ]
    #     },
    #     replace_negatives_with_nan=True,
    # ),
    # aggregate_income_capital=ACSDataEntity(
    #     "AGGREGATE INTEREST, DIVIDENDS, OR NET RENTAL INCOME IN THE PAST 12 MONTHS (IN 2021 INFLATION-ADJUSTED DOLLARS) FOR HOUSEHOLDS",
    #     "population_18",
    #     "block group",
    #     {
    #         "aggregate_income_capital": [
    #             "Estimate!!Aggregate interest, dividends, or net rental income in the past 12 months (in 2021 inflation-adjusted dollars)"
    #         ]
    #     },
    #     replace_negatives_with_nan=True,
    # ),
    # aggregate_income_labor=ACSDataEntity(
    #     "AGGREGATE WAGE OR SALARY INCOME IN THE PAST 12 MONTHS (IN 2021 INFLATION-ADJUSTED DOLLARS) FOR HOUSEHOLDS",
    #     "population_18",
    #     "block group",
    #     {
    #         "aggregate_income_labor": [
    #             "Estimate!!Aggregate wage or salary income in the past 12 months (in 2021 inflation-adjusted dollars)"
    #         ]
    #     },
    #     replace_negatives_with_nan=True,
    # ),
    insurance_coverage=ACSDataEntity(
        "HEALTH INSURANCE COVERAGE STATUS AND TYPE BY WORK EXPERIENCE",
        "population",
        "tract",
        {
            None: [
                "Estimate!!Total:",
                "Estimate!!Total:!!Did not work:",
                "Estimate!!Total:!!Did not work:!!With health insurance coverage",
                "Estimate!!Total:!!Worked full-time, year-round:",
                "Estimate!!Total:!!Worked full-time, year-round:!!With health insurance coverage",
                "Estimate!!Total:!!Worked less than full-time, year-round:",
                "Estimate!!Total:!!Worked less than full-time, year-round:!!With health insurance coverage",
            ],
            "insurance_coverage_none": [
                "Estimate!!Total:!!Did not work:!!No health insurance coverage",
                "Estimate!!Total:!!Worked full-time, year-round:!!No health insurance coverage",
                "Estimate!!Total:!!Worked less than full-time, year-round:!!No health insurance coverage",
            ],
            "insurance_coverage_govt": [
                "Estimate!!Total:!!Did not work:!!With health insurance coverage!!With Medicaid/means-tested public coverage",
                "Estimate!!Total:!!Did not work:!!With health insurance coverage!!With Medicare coverage",
                "Estimate!!Total:!!Worked full-time, year-round:!!With health insurance coverage!!With Medicaid/means-tested public coverage",
                "Estimate!!Total:!!Worked full-time, year-round:!!With health insurance coverage!!With Medicare coverage",
                "Estimate!!Total:!!Worked less than full-time, year-round:!!With health insurance coverage!!With Medicaid/means-tested public coverage",
                "Estimate!!Total:!!Worked less than full-time, year-round:!!With health insurance coverage!!With Medicare coverage",
            ],
            "insurance_coverage_private": [
                "Estimate!!Total:!!Did not work:!!With health insurance coverage!!With direct-purchase health insurance",
                "Estimate!!Total:!!Did not work:!!With health insurance coverage!!With employer-based health insurance",
                "Estimate!!Total:!!Worked full-time, year-round:!!With health insurance coverage!!With direct-purchase health insurance",
                "Estimate!!Total:!!Worked full-time, year-round:!!With health insurance coverage!!With employer-based health insurance",
                "Estimate!!Total:!!Worked less than full-time, year-round:!!With health insurance coverage!!With direct-purchase health insurance",
                "Estimate!!Total:!!Worked less than full-time, year-round:!!With health insurance coverage!!With employer-based health insurance",
            ],
        },
    ),
    poverty=ACSDataEntity(
        "POVERTY STATUS IN THE PAST 12 MONTHS BY AGE",
        "population",
        "tract",
        {
            None: [
                "Estimate!!Total:",
                "Estimate!!Total:!!Income in the past 12 months at or above poverty level:!!12 to 17 years",
                "Estimate!!Total:!!Income in the past 12 months at or above poverty level:!!18 to 59 years",
                "Estimate!!Total:!!Income in the past 12 months at or above poverty level:!!6 to 11 years",
                "Estimate!!Total:!!Income in the past 12 months at or above poverty level:!!60 to 74 years",
                "Estimate!!Total:!!Income in the past 12 months at or above poverty level:!!75 to 84 years",
                "Estimate!!Total:!!Income in the past 12 months at or above poverty level:!!85 years and over",
                "Estimate!!Total:!!Income in the past 12 months at or above poverty level:!!Under 6 years",
                "Estimate!!Total:!!Income in the past 12 months below poverty level:!!12 to 17 years",
                "Estimate!!Total:!!Income in the past 12 months below poverty level:!!18 to 59 years",
                "Estimate!!Total:!!Income in the past 12 months below poverty level:!!6 to 11 years",
                "Estimate!!Total:!!Income in the past 12 months below poverty level:!!60 to 74 years",
                "Estimate!!Total:!!Income in the past 12 months below poverty level:!!75 to 84 years",
                "Estimate!!Total:!!Income in the past 12 months below poverty level:!!85 years and over",
                "Estimate!!Total:!!Income in the past 12 months below poverty level:!!Under 6 years",
            ],
            "poverty_above_line": [
                "Estimate!!Total:!!Income in the past 12 months at or above poverty level:",
            ],
            "poverty_below_line": [
                "Estimate!!Total:!!Income in the past 12 months below poverty level:",
            ],
        },
    ),
    internet=ACSDataEntity(
        "INTERNET SUBSCRIPTIONS IN HOUSEHOLD",
        "occupied",
        "block group",
        {
            None: [
                "Estimate!!Total:",
                "Estimate!!Total:!!With an Internet subscription!!Broadband such as cable, fiber optic, or DSL",
                "Estimate!!Total:!!With an Internet subscription!!Dial-up alone",
                "Estimate!!Total:!!With an Internet subscription!!Other service",
                "Estimate!!Total:!!With an Internet subscription!!Satellite Internet service",
            ],
            "internet_access": [
                "Estimate!!Total:!!Internet access without a subscription",
                "Estimate!!Total:!!With an Internet subscription",
            ],
            "internet_no_access": [
                "Estimate!!Total:!!No Internet access",
            ],
        },
    ),
    language=ACSDataEntity(
        "AGE BY LANGUAGE SPOKEN AT HOME FOR THE POPULATION 5 YEARS AND OVER",
        "population",
        "tract",
        {
            None: [
                "Estimate!!Total:",
                "Estimate!!Total:!!18 to 64 years:",
                "Estimate!!Total:!!5 to 17 years:",
                "Estimate!!Total:!!65 years and over:",
            ],
            "language_english_only": [
                "Estimate!!Total:!!18 to 64 years:!!Speak only English",
                "Estimate!!Total:!!5 to 17 years:!!Speak only English",
                "Estimate!!Total:!!65 years and over:!!Speak only English",
            ],
            "language_spanish": [
                "Estimate!!Total:!!18 to 64 years:!!Speak Spanish",
                "Estimate!!Total:!!5 to 17 years:!!Speak Spanish",
                "Estimate!!Total:!!65 years and over:!!Speak Spanish",
            ],
            "language_other": [
                "Estimate!!Total:!!18 to 64 years:!!Speak Asian and Pacific Island languages",
                "Estimate!!Total:!!18 to 64 years:!!Speak other Indo-European languages",
                "Estimate!!Total:!!18 to 64 years:!!Speak other languages",
                "Estimate!!Total:!!5 to 17 years:!!Speak Asian and Pacific Island languages",
                "Estimate!!Total:!!5 to 17 years:!!Speak other Indo-European languages",
                "Estimate!!Total:!!5 to 17 years:!!Speak other languages",
                "Estimate!!Total:!!65 years and over:!!Speak Asian and Pacific Island languages",
                "Estimate!!Total:!!65 years and over:!!Speak other Indo-European languages",
                "Estimate!!Total:!!65 years and over:!!Speak other languages",
            ],
        },
    ),
    marriage=ACSDataEntity(
        "SEX BY MARITAL STATUS FOR THE POPULATION 15 YEARS AND OVER",
        "population_18",
        "block group",
        {
            None: [
                "Estimate!!Total:",
                "Estimate!!Total:!!Female:",
                "Estimate!!Total:!!Female:!!Now married:!!Married, spouse absent:",
                "Estimate!!Total:!!Female:!!Now married:!!Married, spouse absent:!!Other",
                "Estimate!!Total:!!Female:!!Now married:!!Married, spouse absent:!!Separated",
                "Estimate!!Total:!!Female:!!Now married:!!Married, spouse present",
                "Estimate!!Total:!!Male:",
                "Estimate!!Total:!!Male:!!Now married:!!Married, spouse absent:",
                "Estimate!!Total:!!Male:!!Now married:!!Married, spouse absent:!!Other",
                "Estimate!!Total:!!Male:!!Now married:!!Married, spouse absent:!!Separated",
                "Estimate!!Total:!!Male:!!Now married:!!Married, spouse present",
            ],
            "marriage_never_married": [
                "Estimate!!Total:!!Female:!!Never married",
                "Estimate!!Total:!!Male:!!Never married",
            ],
            "marriage_married_not_divorced": [
                "Estimate!!Total:!!Female:!!Now married:",
                "Estimate!!Total:!!Male:!!Now married:",
                "Estimate!!Total:!!Female:!!Widowed",
                "Estimate!!Total:!!Male:!!Widowed",
            ],
            "marriage_divorced": [
                "Estimate!!Total:!!Female:!!Divorced",
                "Estimate!!Total:!!Male:!!Divorced",
            ],
        },
    ),
    gender_gap_education_4=ACSDataEntity(
        "SEX BY EDUCATIONAL ATTAINMENT FOR THE POPULATION 25 YEARS AND OVER",
        "population_18",
        "block group",
        {
            None: [
                "Estimate!!Total:",
                "Estimate!!Total:!!Female:",
                "Estimate!!Total:!!Male:",
            ],
            "female_none_4": [
                "Estimate!!Total:!!Female:!!No schooling completed",
                "Estimate!!Total:!!Female:!!Nursery to 4th grade",
                "Estimate!!Total:!!Female:!!5th and 6th grade",
                "Estimate!!Total:!!Female:!!7th and 8th grade",
                "Estimate!!Total:!!Female:!!9th grade",
                "Estimate!!Total:!!Female:!!10th grade",
                "Estimate!!Total:!!Female:!!11th grade",
                "Estimate!!Total:!!Female:!!12th grade, no diploma",
            ],
            "female_hs_4": [
                "Estimate!!Total:!!Female:!!High school graduate (includes equivalency)",
                "Estimate!!Total:!!Female:!!Associate's degree",
                "Estimate!!Total:!!Female:!!Some college, 1 or more years, no degree",
                "Estimate!!Total:!!Female:!!Some college, less than 1 year",
            ],
            "female_ugrad_4": [
                "Estimate!!Total:!!Female:!!Bachelor's degree",
            ],
            "female_grad_4": [
                "Estimate!!Total:!!Female:!!Doctorate degree",
                "Estimate!!Total:!!Female:!!Master's degree",
                "Estimate!!Total:!!Female:!!Professional school degree",
            ],
            "male_none_4": [
                "Estimate!!Total:!!Male:!!No schooling completed",
                "Estimate!!Total:!!Male:!!Nursery to 4th grade",
                "Estimate!!Total:!!Male:!!5th and 6th grade",
                "Estimate!!Total:!!Male:!!7th and 8th grade",
                "Estimate!!Total:!!Male:!!9th grade",
                "Estimate!!Total:!!Male:!!10th grade",
                "Estimate!!Total:!!Male:!!11th grade",
                "Estimate!!Total:!!Male:!!12th grade, no diploma",
            ],
            "male_hs_4": [
                "Estimate!!Total:!!Male:!!High school graduate (includes equivalency)",
                "Estimate!!Total:!!Male:!!Some college, 1 or more years, no degree",
                "Estimate!!Total:!!Male:!!Some college, less than 1 year",
                "Estimate!!Total:!!Male:!!Associate's degree",
            ],
            "male_ugrad_4": [
                "Estimate!!Total:!!Male:!!Bachelor's degree",
            ],
            "male_grad_4": [
                "Estimate!!Total:!!Male:!!Doctorate degree",
                "Estimate!!Total:!!Male:!!Master's degree",
                "Estimate!!Total:!!Male:!!Professional school degree",
            ],
        },
    ),
    industry=ACSDataEntity(
        "SEX BY INDUSTRY FOR THE CIVILIAN EMPLOYED POPULATION 16 YEARS AND OVER",
        "population_18",
        "block group",
        {normalize_industry_name(k): v for k, v in industry_dict.items()},
    ),
    occupation=ACSDataEntity(
        "SEX BY OCCUPATION FOR THE CIVILIAN EMPLOYED POPULATION 16 YEARS AND OVER",
        "population_18",
        "block group",
        {normalize_occupation_name(k): v for k, v in occupation_dict.items()},
    ),
    # aggregate_rent=ACSDataEntity(
    #     "AGGREGATE GROSS RENT (DOLLARS)",
    #     "occupied",
    #     "block group",
    #     {"aggregate_rent": ["Estimate!!Aggregate gross rent"]},
    #     replace_negatives_with_nan=True,
    # ),
    # internet_access=ACSDataEntity(
    #     "INTERNET SUBSCRIPTIONS IN HOUSEHOLD",
    #     "occupied",
    #     {}
    # )
)

entities_split_by_usa_pr = dict(
    # mobility=[
    #     ACSDataEntity(
    #         "GEOGRAPHICAL MOBILITY IN THE PAST YEAR FOR CURRENT RESIDENCE--STATE, COUNTY AND PLACE LEVEL IN THE UNITED STATES",
    #         "population",
    #         "tract",
    #         {
    #             "mobility_different_country": [
    #                 "Estimate!!Total:!!Abroad 1 year ago:!!Foreign country",
    #             ],
    #             "mobility_different_state_same_country": [
    #                 "Estimate!!Total:!!Abroad 1 year ago:!!Puerto Rico",
    #                 "Estimate!!Total:!!Abroad 1 year ago:!!U.S. Island Areas",
    #                 "Estimate!!Total:!!Different house in United States 1 year ago:!!Elsewhere:!!Different county:!!Different state:",
    #             ],
    #             "mobility_different_house_same_state": [
    #                 "Estimate!!Total:!!Different house in United States 1 year ago:!!Elsewhere:!!Different county:!!Same state",
    #                 "Estimate!!Total:!!Different house in United States 1 year ago:!!Elsewhere:!!Same county",
    #                 "Estimate!!Total:!!Different house in United States 1 year ago:!!Same city or town:",
    #             ],
    #             "mobility_same_house": [
    #                 "Estimate!!Total:!!Same house 1 year ago",
    #             ],
    #             None: [
    #                 "Estimate!!Total:",
    #                 "Estimate!!Total:!!Abroad 1 year ago:",
    #                 "Estimate!!Total:!!Different house in United States 1 year ago:",
    #                 "Estimate!!Total:!!Different house in United States 1 year ago:!!Elsewhere:",
    #                 "Estimate!!Total:!!Different house in United States 1 year ago:!!Elsewhere:!!Different county:",
    #                 "Estimate!!Total:!!Different house in United States 1 year ago:!!Elsewhere:!!Different county:!!Different state:!!Midwest",
    #                 "Estimate!!Total:!!Different house in United States 1 year ago:!!Elsewhere:!!Different county:!!Different state:!!Northeast",
    #                 "Estimate!!Total:!!Different house in United States 1 year ago:!!Elsewhere:!!Different county:!!Different state:!!South",
    #                 "Estimate!!Total:!!Different house in United States 1 year ago:!!Elsewhere:!!Different county:!!Different state:!!West",
    #                 "Estimate!!Total:!!Different house in United States 1 year ago:!!Same city or town:!!Different county (same state)",
    #                 "Estimate!!Total:!!Different house in United States 1 year ago:!!Same city or town:!!Same county",
    #             ],
    #         },
    #     ),
    #     ACSDataEntity(
    #         "GEOGRAPHICAL MOBILITY IN THE PAST YEAR FOR CURRENT RESIDENCE--STATE, COUNTY AND PLACE LEVEL IN PUERTO RICO",
    #         "population",
    #         "tract",
    #         {
    #             "mobility_different_country": [
    #                 "Estimate!!Total:!!Elsewhere 1 year ago:!!Foreign country",
    #             ],
    #             "mobility_different_state_same_country": [
    #                 "Estimate!!Total:!!Elsewhere 1 year ago:!!U.S. Island Areas",
    #                 "Estimate!!Total:!!United States 1 year ago:",
    #             ],
    #             "mobility_different_house_same_state": [
    #                 "Estimate!!Total:!!Different house in Puerto Rico 1 year ago:",
    #             ],
    #             "mobility_same_house": [
    #                 "Estimate!!Total:!!Same house 1 year ago",
    #             ],
    #             None: [
    #                 "Estimate!!Total:",
    #                 "Estimate!!Total:!!Different house in Puerto Rico 1 year ago:!!Elsewhere in Puerto Rico:",
    #                 "Estimate!!Total:!!Different house in Puerto Rico 1 year ago:!!Elsewhere in Puerto Rico:!!Different municipio",
    #                 "Estimate!!Total:!!Different house in Puerto Rico 1 year ago:!!Elsewhere in Puerto Rico:!!Same municipio",
    #                 "Estimate!!Total:!!Different house in Puerto Rico 1 year ago:!!Same city or town:",
    #                 "Estimate!!Total:!!Different house in Puerto Rico 1 year ago:!!Same city or town:!!Different municipio",
    #                 "Estimate!!Total:!!Different house in Puerto Rico 1 year ago:!!Same city or town:!!Same municipio",
    #                 "Estimate!!Total:!!Elsewhere 1 year ago:",
    #                 "Estimate!!Total:!!United States 1 year ago:!!Midwest",
    #                 "Estimate!!Total:!!United States 1 year ago:!!Northeast",
    #                 "Estimate!!Total:!!United States 1 year ago:!!South",
    #                 "Estimate!!Total:!!United States 1 year ago:!!West",
    #             ],
    #         },
    #     ),
    # ],
    citizenship=[
        ACSDataEntity(
            "NATIVITY AND CITIZENSHIP STATUS IN THE UNITED STATES",
            "population",
            "tract",
            {
                None: [
                    "Estimate!!Total:",
                ],
                "citizenship_citizen_by_birth": [
                    "Estimate!!Total:!!U.S. citizen, born in Puerto Rico or U.S. Island Areas",
                    "Estimate!!Total:!!U.S. citizen, born in the United States",
                    "Estimate!!Total:!!U.S. citizen, born abroad of American parent(s)",
                ],
                "citizenship_citizen_by_naturalization": [
                    "Estimate!!Total:!!U.S. citizen by naturalization",
                ],
                "citizenship_not_citizen": [
                    "Estimate!!Total:!!Not a U.S. citizen",
                ],
            },
        ),
        ACSDataEntity(
            "NATIVITY AND CITIZENSHIP STATUS IN PUERTO RICO",
            "population",
            "tract",
            {
                None: [
                    "Estimate!!Total:",
                ],
                "citizenship_citizen_by_birth": [
                    "Estimate!!Total:!!U.S. citizen, born abroad of American parent(s)",
                    "Estimate!!Total:!!U.S. citizen, born in Puerto Rico",
                    "Estimate!!Total:!!U.S. citizen, born in U.S. or U.S. Island Areas",
                ],
                "citizenship_citizen_by_naturalization": [
                    "Estimate!!Total:!!U.S. citizen by naturalization",
                ],
                "citizenship_not_citizen": [
                    "Estimate!!Total:!!Not a U.S. citizen",
                ],
            },
        ),
    ],
    birthplace=[
        ACSDataEntity(
            "PLACE OF BIRTH BY SEX IN THE UNITED STATES",
            "population",
            "tract",
            {
                None: [
                    "Estimate!!Total:",
                    "Estimate!!Total:!!Born in other state in the United States:!!Female",
                    "Estimate!!Total:!!Born in other state in the United States:!!Male",
                    "Estimate!!Total:!!Born in state of residence:!!Female",
                    "Estimate!!Total:!!Born in state of residence:!!Male",
                    "Estimate!!Total:!!Female",
                    "Estimate!!Total:!!Foreign born:!!Female",
                    "Estimate!!Total:!!Foreign born:!!Male",
                    "Estimate!!Total:!!Male",
                    "Estimate!!Total:!!Native; born outside the United States:!!Female",
                    "Estimate!!Total:!!Native; born outside the United States:!!Male",
                ],
                "birthplace_non_us": [
                    "Estimate!!Total:!!Foreign born:",
                ],
                "birthplace_us_not_state": [
                    "Estimate!!Total:!!Native; born outside the United States:",
                    "Estimate!!Total:!!Born in other state in the United States:",
                ],
                "birthplace_us_state": [
                    "Estimate!!Total:!!Born in state of residence:",
                ],
            },
        ),
        ACSDataEntity(
            "PLACE OF BIRTH BY SEX IN PUERTO RICO",
            "population",
            "tract",
            {
                None: [
                    "Estimate!!Total:",
                    "Estimate!!Total:!!Born in Puerto Rico:!!Female",
                    "Estimate!!Total:!!Born in Puerto Rico:!!Male",
                    "Estimate!!Total:!!Born in the United States:!!Female",
                    "Estimate!!Total:!!Born in the United States:!!Male",
                    "Estimate!!Total:!!Female",
                    "Estimate!!Total:!!Foreign born:!!Female",
                    "Estimate!!Total:!!Foreign born:!!Male",
                    "Estimate!!Total:!!Male",
                    "Estimate!!Total:!!Native; born elsewhere:!!Female",
                    "Estimate!!Total:!!Native; born elsewhere:!!Male",
                ],
                "birthplace_non_us": [
                    "Estimate!!Total:!!Foreign born:",
                ],
                "birthplace_us_not_state": [
                    "Estimate!!Total:!!Native; born elsewhere:",
                    "Estimate!!Total:!!Born in the United States:",
                ],
                "birthplace_us_state": [
                    "Estimate!!Total:!!Born in Puerto Rico:",
                ],
            },
        ),
    ],
)

for collection in statistic_collections:
    if isinstance(collection, ACSStatisticsColection):
        entities.update(collection.acs_entity_dict())

entities = {k: v for k, v in sorted(entities.items())}

acs_columns = [column for entity in entities.values() for column in entity.categories]
acs_columns += [
    column
    for (entity_us, _) in entities_split_by_usa_pr.values()
    for column in entity_us.categories
]
