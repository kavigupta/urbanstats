from urbanstats.acs.load import ACSDataEntity
from urbanstats.acs.industry import industry_dict, normalize_industry_name
from urbanstats.acs.occupation import occupation_dict, normalize_occupation_name
from urbanstats.statistics.statistic_collection import (
    ACSStatisticsColection,
    ACSUSPRStatisticsColection,
)
from urbanstats.statistics.collections_list import statistic_collections

entities = dict(
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
)

for collection in statistic_collections:
    if isinstance(collection, ACSStatisticsColection):
        entities.update(collection.acs_entity_dict())

for collection in statistic_collections:
    if isinstance(collection, ACSUSPRStatisticsColection):
        entities_split_by_usa_pr.update(collection.acs_entity_dict())

entities = {k: v for k, v in sorted(entities.items())}

acs_columns = [column for entity in entities.values() for column in entity.categories]
acs_columns += [
    column
    for (entity_us, _) in entities_split_by_usa_pr.values()
    for column in entity_us.categories
]
