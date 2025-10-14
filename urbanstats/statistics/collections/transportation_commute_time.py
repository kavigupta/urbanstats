import numpy as np

from urbanstats.acs.load import ACSDataEntity
from urbanstats.games.quiz_question_metadata import (
    COMMUTE_TIME,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize
from urbanstats.utils import approximate_quantile


class TransportationCommuteTimeStatistics(ACSStatisticsColection):
    version: int = 7

    def name_for_each_statistic(self):
        return {
            "transportation_commute_time_median": "Median Commute Time (min)",
            "transportation_commute_time_under_15": "Commute Time < 15 min %",
            "transportation_commute_time_15_to_29": "Commute Time 15 - 29 min %",
            "transportation_commute_time_30_to_59": "Commute Time 30 - 59 min %",
            "transportation_commute_time_over_60": "Commute Time > 60 min %",
        }

    def varname_for_each_statistic(self):
        return {
            "transportation_commute_time_median": "commute_time_median",
            "transportation_commute_time_under_15": "commute_time_under_15",
            "transportation_commute_time_15_to_29": "commute_time_15_to_29",
            "transportation_commute_time_30_to_59": "commute_time_30_to_59",
            "transportation_commute_time_over_60": "commute_time_over_60",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("transportation")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                COMMUTE_TIME,
                {
                    "transportation_commute_time_median": "higher median commute time",
                },
            ),
            **QuizQuestionSkip.several(
                "transportation_commute_time_under_15",
                "transportation_commute_time_15_to_29",
                "transportation_commute_time_30_to_59",
                "transportation_commute_time_over_60",
            ),
        }

    def mutate_acs_results(self, statistics_table):
        fractionalize(statistics_table, *list(statistics_table))
        stats_array = np.array(
            statistics_table[
                [
                    "transportation_commute_time_under_10",
                    "transportation_commute_time_10_to_14",
                    "transportation_commute_time_15_to_19",
                    "transportation_commute_time_20_to_24",
                    "transportation_commute_time_25_to_29",
                    "transportation_commute_time_30_to_34",
                    "transportation_commute_time_35_to_44",
                    "transportation_commute_time_45_to_59",
                    "transportation_commute_time_over_60",
                ]
            ]
        )
        median_commute = np.array(
            [
                approximate_quantile([0, 10, 15, 20, 25, 30, 35, 45, 60, 120], s, 0.5)
                for s in stats_array
            ]
        )
        statistics_table["transportation_commute_time_under_15"] = statistics_table.pop(
            "transportation_commute_time_under_10"
        ) + statistics_table.pop("transportation_commute_time_10_to_14")
        statistics_table["transportation_commute_time_15_to_29"] = (
            statistics_table.pop("transportation_commute_time_15_to_19")
            + statistics_table.pop("transportation_commute_time_20_to_24")
            + statistics_table.pop("transportation_commute_time_25_to_29")
        )
        statistics_table["transportation_commute_time_30_to_59"] = (
            statistics_table.pop("transportation_commute_time_30_to_34")
            + statistics_table.pop("transportation_commute_time_35_to_44")
            + statistics_table.pop("transportation_commute_time_45_to_59")
        )
        histo_cols = [
            "transportation_commute_time_under_15",
            "transportation_commute_time_15_to_29",
            "transportation_commute_time_30_to_59",
            "transportation_commute_time_over_60",
        ]
        assert set(histo_cols) == set(statistics_table)
        statistics_table["transportation_commute_time_median"] = median_commute

    def acs_name(self):
        return "transportation_commute_time"

    def acs_entity(self):
        # pylint: disable=line-too-long
        return ACSDataEntity(
            "MEANS OF TRANSPORTATION TO WORK BY TRAVEL TIME TO WORK",
            "population_18",
            "block group",
            {
                "transportation_commute_time_under_10": [
                    "Estimate!!Total:!!Less than 10 minutes",
                ],
                "transportation_commute_time_10_to_14": [
                    "Estimate!!Total:!!10 to 14 minutes",
                ],
                "transportation_commute_time_15_to_19": [
                    "Estimate!!Total:!!15 to 19 minutes",
                ],
                "transportation_commute_time_20_to_24": [
                    "Estimate!!Total:!!20 to 24 minutes",
                ],
                "transportation_commute_time_25_to_29": [
                    "Estimate!!Total:!!25 to 29 minutes",
                ],
                "transportation_commute_time_30_to_34": [
                    "Estimate!!Total:!!30 to 34 minutes",
                ],
                "transportation_commute_time_35_to_44": [
                    "Estimate!!Total:!!35 to 44 minutes",
                ],
                "transportation_commute_time_45_to_59": [
                    "Estimate!!Total:!!45 to 59 minutes",
                ],
                "transportation_commute_time_over_60": [
                    "Estimate!!Total:!!60 or more minutes",
                ],
                None: [
                    "Estimate!!Total:",
                    "Estimate!!Total:!!Car, truck, or van:",
                    "Estimate!!Total:!!Car, truck, or van:!!10 to 14 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!15 to 19 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!20 to 24 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!25 to 29 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!30 to 34 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!35 to 44 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!45 to 59 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!60 or more minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!10 to 14 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!15 to 19 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!20 to 24 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!25 to 29 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!30 to 34 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!35 to 44 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!45 to 59 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!60 or more minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 2-person carpool:",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 2-person carpool:!!10 to 14 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 2-person carpool:!!15 to 19 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 2-person carpool:!!20 to 24 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 2-person carpool:!!25 to 29 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 2-person carpool:!!30 to 34 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 2-person carpool:!!35 to 44 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 2-person carpool:!!45 to 59 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 2-person carpool:!!60 or more minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 2-person carpool:!!Less than 10 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 3-or-more-person carpool:",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 3-or-more-person carpool:!!10 to 14 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 3-or-more-person carpool:!!15 to 19 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 3-or-more-person carpool:!!20 to 24 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 3-or-more-person carpool:!!25 to 29 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 3-or-more-person carpool:!!30 to 34 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 3-or-more-person carpool:!!35 to 44 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 3-or-more-person carpool:!!45 to 59 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 3-or-more-person carpool:!!60 or more minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 3-or-more-person carpool:!!Less than 10 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!Less than 10 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Drove alone:",
                    "Estimate!!Total:!!Car, truck, or van:!!Drove alone:!!10 to 14 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Drove alone:!!15 to 19 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Drove alone:!!20 to 24 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Drove alone:!!25 to 29 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Drove alone:!!30 to 34 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Drove alone:!!35 to 44 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Drove alone:!!45 to 59 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Drove alone:!!60 or more minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Drove alone:!!Less than 10 minutes",
                    "Estimate!!Total:!!Car, truck, or van:!!Less than 10 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!10 to 14 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!15 to 19 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!20 to 24 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!25 to 29 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!30 to 34 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!35 to 44 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!45 to 59 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!60 or more minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Bus:",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Bus:!!10 to 14 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Bus:!!15 to 19 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Bus:!!20 to 24 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Bus:!!25 to 29 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Bus:!!30 to 34 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Bus:!!35 to 44 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Bus:!!45 to 59 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Bus:!!60 or more minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Bus:!!Less than 10 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Less than 10 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Long-distance train or commuter rail or Ferryboat:",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Long-distance train or commuter rail or Ferryboat:!!10 to 14 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Long-distance train or commuter rail or Ferryboat:!!15 to 19 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Long-distance train or commuter rail or Ferryboat:!!20 to 24 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Long-distance train or commuter rail or Ferryboat:!!25 to 29 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Long-distance train or commuter rail or Ferryboat:!!30 to 34 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Long-distance train or commuter rail or Ferryboat:!!35 to 44 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Long-distance train or commuter rail or Ferryboat:!!45 to 59 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Long-distance train or commuter rail or Ferryboat:!!60 or more minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Long-distance train or commuter rail or Ferryboat:!!Less than 10 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Subway or elevated rail, Light rail, streetcar, or trolley (carro público in Puerto Rico):",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Subway or elevated rail, Light rail, streetcar, or trolley (carro público in Puerto Rico):!!10 to 14 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Subway or elevated rail, Light rail, streetcar, or trolley (carro público in Puerto Rico):!!15 to 19 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Subway or elevated rail, Light rail, streetcar, or trolley (carro público in Puerto Rico):!!20 to 24 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Subway or elevated rail, Light rail, streetcar, or trolley (carro público in Puerto Rico):!!25 to 29 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Subway or elevated rail, Light rail, streetcar, or trolley (carro público in Puerto Rico):!!30 to 34 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Subway or elevated rail, Light rail, streetcar, or trolley (carro público in Puerto Rico):!!35 to 44 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Subway or elevated rail, Light rail, streetcar, or trolley (carro público in Puerto Rico):!!45 to 59 minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Subway or elevated rail, Light rail, streetcar, or trolley (carro público in Puerto Rico):!!60 or more minutes",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Subway or elevated rail, Light rail, streetcar, or trolley (carro público in Puerto Rico):!!Less than 10 minutes",
                    "Estimate!!Total:!!Taxicab, motorcycle, bicycle, or other means:",
                    "Estimate!!Total:!!Taxicab, motorcycle, bicycle, or other means:!!10 to 14 minutes",
                    "Estimate!!Total:!!Taxicab, motorcycle, bicycle, or other means:!!15 to 19 minutes",
                    "Estimate!!Total:!!Taxicab, motorcycle, bicycle, or other means:!!20 to 24 minutes",
                    "Estimate!!Total:!!Taxicab, motorcycle, bicycle, or other means:!!25 to 29 minutes",
                    "Estimate!!Total:!!Taxicab, motorcycle, bicycle, or other means:!!30 to 34 minutes",
                    "Estimate!!Total:!!Taxicab, motorcycle, bicycle, or other means:!!35 to 44 minutes",
                    "Estimate!!Total:!!Taxicab, motorcycle, bicycle, or other means:!!45 to 59 minutes",
                    "Estimate!!Total:!!Taxicab, motorcycle, bicycle, or other means:!!60 or more minutes",
                    "Estimate!!Total:!!Taxicab, motorcycle, bicycle, or other means:!!Less than 10 minutes",
                    "Estimate!!Total:!!Walked:",
                    "Estimate!!Total:!!Walked:!!10 to 14 minutes",
                    "Estimate!!Total:!!Walked:!!15 to 19 minutes",
                    "Estimate!!Total:!!Walked:!!20 to 24 minutes",
                    "Estimate!!Total:!!Walked:!!25 to 29 minutes",
                    "Estimate!!Total:!!Walked:!!30 to 34 minutes",
                    "Estimate!!Total:!!Walked:!!35 to 44 minutes",
                    "Estimate!!Total:!!Walked:!!45 to 59 minutes",
                    "Estimate!!Total:!!Walked:!!60 or more minutes",
                    "Estimate!!Total:!!Walked:!!Less than 10 minutes",
                ],
            },
        )
