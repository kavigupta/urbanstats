from urbanstats.acs.load import ACSDataEntity
from urbanstats.acs.industry import industry_dict, normalize_industry_name
from urbanstats.acs.occupation import occupation_dict, normalize_occupation_name
from urbanstats.statistics.collections.transportation_commute_time import TransportationCommuteTimeStatistics
from urbanstats.statistics.collections.transportation_mode import TransportationModeStatistics
from urbanstats.statistics.collections.transportation_vehicle_ownership import TransportationVehicleOwnershipStatistics

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
    household_income=ACSDataEntity(
        "TENURE BY HOUSEHOLD INCOME IN THE PAST 12 MONTHS (IN 2021 INFLATION-ADJUSTED DOLLARS)",
        "occupied",
        "tract",
        {
            "household_income_under_50k": [
                "Estimate!!Total:!!Owner occupied:!!Less than $5,000",
                "Estimate!!Total:!!Owner occupied:!!$5,000 to $9,999",
                "Estimate!!Total:!!Owner occupied:!!$10,000 to $14,999",
                "Estimate!!Total:!!Owner occupied:!!$15,000 to $19,999",
                "Estimate!!Total:!!Owner occupied:!!$20,000 to $24,999",
                "Estimate!!Total:!!Owner occupied:!!$25,000 to $34,999",
                "Estimate!!Total:!!Owner occupied:!!$35,000 to $49,999",
                "Estimate!!Total:!!Renter occupied:!!Less than $5,000",
                "Estimate!!Total:!!Renter occupied:!!$5,000 to $9,999",
                "Estimate!!Total:!!Renter occupied:!!$10,000 to $14,999",
                "Estimate!!Total:!!Renter occupied:!!$15,000 to $19,999",
                "Estimate!!Total:!!Renter occupied:!!$20,000 to $24,999",
                "Estimate!!Total:!!Renter occupied:!!$25,000 to $34,999",
                "Estimate!!Total:!!Renter occupied:!!$35,000 to $49,999",
            ],
            "household_income_50k_to_100k": [
                "Estimate!!Total:!!Renter occupied:!!$50,000 to $74,999",
                "Estimate!!Total:!!Renter occupied:!!$75,000 to $99,999",
                "Estimate!!Total:!!Owner occupied:!!$50,000 to $74,999",
                "Estimate!!Total:!!Owner occupied:!!$75,000 to $99,999",
            ],
            "household_income_over_100k": [
                "Estimate!!Total:!!Renter occupied:!!$100,000 to $149,999",
                "Estimate!!Total:!!Renter occupied:!!$150,000 or more",
                "Estimate!!Total:!!Owner occupied:!!$100,000 to $149,999",
                "Estimate!!Total:!!Owner occupied:!!$150,000 or more",
            ],
            None: [
                "Estimate!!Total:",
                "Estimate!!Total:!!Owner occupied:",
                "Estimate!!Total:!!Renter occupied:",
            ],
        },
    ),
    personal_income=ACSDataEntity(
        "SEX BY WORK EXPERIENCE IN THE PAST 12 MONTHS BY INCOME IN THE PAST 12 MONTHS (IN 2021 INFLATION-ADJUSTED DOLLARS) FOR THE POPULATION 15 YEARS AND OVER",
        "population_18",
        "tract",
        {
            None: [
                "Estimate!!Total:",
                "Estimate!!Total:!!Female:",
                "Estimate!!Total:!!Female:!!Other:",
                "Estimate!!Total:!!Female:!!Other:!!No income",
                "Estimate!!Total:!!Female:!!Other:!!With income:",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!No income",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:",
                "Estimate!!Total:!!Male:",
                "Estimate!!Total:!!Male:!!Other:",
                "Estimate!!Total:!!Male:!!Other:!!No income",
                "Estimate!!Total:!!Male:!!Other:!!With income:",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!No income",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:",
            ],
            "individual_income_under_50k": [
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$1 to $2,499 or loss",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$10,000 to $12,499",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$12,500 to $14,999",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$15,000 to $17,499",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$17,500 to $19,999",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$2,500 to $4,999",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$20,000 to $22,499",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$22,500 to $24,999",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$25,000 to $29,999",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$30,000 to $34,999",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$35,000 to $39,999",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$40,000 to $44,999",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$45,000 to $49,999",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$5,000 to $7,499",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$7,500 to $9,999",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$1 to $2,499 or loss",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$10,000 to $12,499",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$12,500 to $14,999",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$15,000 to $17,499",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$17,500 to $19,999",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$2,500 to $4,999",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$20,000 to $22,499",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$22,500 to $24,999",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$25,000 to $29,999",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$30,000 to $34,999",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$35,000 to $39,999",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$40,000 to $44,999",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$45,000 to $49,999",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$5,000 to $7,499",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$7,500 to $9,999",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$1 to $2,499 or loss",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$10,000 to $12,499",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$12,500 to $14,999",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$15,000 to $17,499",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$17,500 to $19,999",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$2,500 to $4,999",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$20,000 to $22,499",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$22,500 to $24,999",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$25,000 to $29,999",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$30,000 to $34,999",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$35,000 to $39,999",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$40,000 to $44,999",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$45,000 to $49,999",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$5,000 to $7,499",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$7,500 to $9,999",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$1 to $2,499 or loss",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$10,000 to $12,499",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$12,500 to $14,999",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$15,000 to $17,499",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$17,500 to $19,999",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$2,500 to $4,999",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$20,000 to $22,499",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$22,500 to $24,999",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$25,000 to $29,999",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$30,000 to $34,999",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$35,000 to $39,999",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$40,000 to $44,999",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$45,000 to $49,999",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$5,000 to $7,499",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$7,500 to $9,999",
            ],
            "individual_income_50k_to_100k": [
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$50,000 to $54,999",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$55,000 to $64,999",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$65,000 to $74,999",
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$75,000 to $99,999",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$50,000 to $54,999",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$55,000 to $64,999",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$65,000 to $74,999",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$75,000 to $99,999",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$50,000 to $54,999",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$55,000 to $64,999",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$65,000 to $74,999",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$75,000 to $99,999",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$50,000 to $54,999",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$55,000 to $64,999",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$65,000 to $74,999",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$75,000 to $99,999",
            ],
            "individual_income_over_100k": [
                "Estimate!!Total:!!Female:!!Other:!!With income:!!$100,000 or more",
                "Estimate!!Total:!!Female:!!Worked full-time, year-round in the past 12 months:!!With income:!!$100,000 or more",
                "Estimate!!Total:!!Male:!!Other:!!With income:!!$100,000 or more",
                "Estimate!!Total:!!Male:!!Worked full-time, year-round in the past 12 months:!!With income:!!$100,000 or more",
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
    **TransportationModeStatistics().acs_entity_dict(),
    **TransportationCommuteTimeStatistics().acs_entity_dict(),
    rent=ACSDataEntity(
        "BEDROOMS BY GROSS RENT",
        "occupied",
        "block group",
        {
            "rent_1br_under_750": [
                "Estimate!!Total:!!1 bedroom:!!With cash rent:!!Less than $300",
                "Estimate!!Total:!!1 bedroom:!!With cash rent:!!$300 to $499",
                "Estimate!!Total:!!1 bedroom:!!With cash rent:!!$500 to $749",
            ],
            "rent_1br_750_to_1500": [
                "Estimate!!Total:!!1 bedroom:!!With cash rent:!!$750 to $999",
                "Estimate!!Total:!!1 bedroom:!!With cash rent:!!$1,000 to $1,499",
            ],
            "rent_1br_over_1500": [
                "Estimate!!Total:!!1 bedroom:!!With cash rent:!!$1,500 or more",
            ],
            "rent_2br_under_750": [
                "Estimate!!Total:!!2 bedrooms:!!With cash rent:!!Less than $300",
                "Estimate!!Total:!!2 bedrooms:!!With cash rent:!!$300 to $499",
                "Estimate!!Total:!!2 bedrooms:!!With cash rent:!!$500 to $749",
            ],
            "rent_2br_750_to_1500": [
                "Estimate!!Total:!!2 bedrooms:!!With cash rent:!!$750 to $999",
                "Estimate!!Total:!!2 bedrooms:!!With cash rent:!!$1,000 to $1,499",
            ],
            "rent_2br_over_1500": [
                "Estimate!!Total:!!2 bedrooms:!!With cash rent:!!$1,500 or more",
            ],
            "rent_with_cash_rent": [
                "Estimate!!Total:!!1 bedroom:!!With cash rent:",
                "Estimate!!Total:!!2 bedrooms:!!With cash rent:",
                "Estimate!!Total:!!3 or more bedrooms:!!With cash rent:",
                "Estimate!!Total:!!No bedroom:!!With cash rent:",
            ],
            None: [
                "Estimate!!Total:",
                "Estimate!!Total:!!1 bedroom:",
                "Estimate!!Total:!!2 bedrooms:!!No cash rent",
                "Estimate!!Total:!!2 bedrooms:",
                "Estimate!!Total:!!1 bedroom:!!No cash rent",
                "Estimate!!Total:!!3 or more bedrooms:",
                "Estimate!!Total:!!3 or more bedrooms:!!No cash rent",
                "Estimate!!Total:!!3 or more bedrooms:!!With cash rent:!!$1,000 to $1,499",
                "Estimate!!Total:!!3 or more bedrooms:!!With cash rent:!!$1,500 or more",
                "Estimate!!Total:!!3 or more bedrooms:!!With cash rent:!!$300 to $499",
                "Estimate!!Total:!!3 or more bedrooms:!!With cash rent:!!$500 to $749",
                "Estimate!!Total:!!3 or more bedrooms:!!With cash rent:!!$750 to $999",
                "Estimate!!Total:!!3 or more bedrooms:!!With cash rent:!!Less than $300",
                "Estimate!!Total:!!No bedroom:",
                "Estimate!!Total:!!No bedroom:!!No cash rent",
                "Estimate!!Total:!!No bedroom:!!With cash rent:!!$1,000 to $1,499",
                "Estimate!!Total:!!No bedroom:!!With cash rent:!!$1,500 or more",
                "Estimate!!Total:!!No bedroom:!!With cash rent:!!$300 to $499",
                "Estimate!!Total:!!No bedroom:!!With cash rent:!!$500 to $749",
                "Estimate!!Total:!!No bedroom:!!With cash rent:!!$750 to $999",
                "Estimate!!Total:!!No bedroom:!!With cash rent:!!Less than $300",
            ],
        },
    ),
    rent_burden=ACSDataEntity(
        "GROSS RENT AS A PERCENTAGE OF HOUSEHOLD INCOME IN THE PAST 12 MONTHS",
        "occupied",
        "block group",
        {
            None: [
                "Estimate!!Total:",
                "Estimate!!Total:!!Not computed",
            ],
            "rent_burden_under_20": [
                "Estimate!!Total:!!Less than 10.0 percent",
                "Estimate!!Total:!!10.0 to 14.9 percent",
                "Estimate!!Total:!!15.0 to 19.9 percent",
            ],
            "rent_burden_20_to_40": [
                "Estimate!!Total:!!20.0 to 24.9 percent",
                "Estimate!!Total:!!25.0 to 29.9 percent",
                "Estimate!!Total:!!30.0 to 34.9 percent",
                "Estimate!!Total:!!35.0 to 39.9 percent",
            ],
            "rent_burden_over_40": [
                "Estimate!!Total:!!40.0 to 49.9 percent",
                "Estimate!!Total:!!50.0 percent or more",
            ],
        },
    ),
    rent_or_own=ACSDataEntity(
        "TENURE",
        "occupied",
        "block group",
        {
            "rent_or_own_rent": ["Estimate!!Total:!!Renter occupied"],
            "rent_or_own_own": ["Estimate!!Total:!!Owner occupied"],
            None: ["Estimate!!Total:"],
        },
    ),
    year_built=ACSDataEntity(
        "YEAR STRUCTURE BUILT",
        "total",
        "block group",
        {
            None: [
                "Estimate!!Total:",
            ],
            "year_built_1969_or_earlier": [
                "Estimate!!Total:!!Built 1939 or earlier",
                "Estimate!!Total:!!Built 1940 to 1949",
                "Estimate!!Total:!!Built 1950 to 1959",
                "Estimate!!Total:!!Built 1960 to 1969",
            ],
            "year_built_1970_to_1979": [
                "Estimate!!Total:!!Built 1970 to 1979",
            ],
            "year_built_1980_to_1989": [
                "Estimate!!Total:!!Built 1980 to 1989",
            ],
            "year_built_1990_to_1999": [
                "Estimate!!Total:!!Built 1990 to 1999",
            ],
            "year_built_2000_to_2009": [
                "Estimate!!Total:!!Built 2000 to 2009",
            ],
            "year_built_2010_or_later": [
                "Estimate!!Total:!!Built 2010 to 2019",
                "Estimate!!Total:!!Built 2020 or later",
            ],
        },
    ),
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
    **TransportationVehicleOwnershipStatistics().acs_entity_dict(),
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

entities = {k: v for k, v in sorted(entities.items())}

acs_columns = [column for entity in entities.values() for column in entity.categories]
acs_columns += [
    column
    for (entity_us, _) in entities_split_by_usa_pr.values()
    for column in entity_us.categories
]
