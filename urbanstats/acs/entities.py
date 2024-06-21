from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.collections_list import statistic_collections
from urbanstats.statistics.statistic_collection import (
    ACSStatisticsColection,
    ACSUSPRStatisticsColection,
)

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
