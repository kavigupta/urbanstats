# pylint: disable=duplicate-code
import numpy as np

from urbanstats.acs.load import ACSDataEntity
from urbanstats.games.quiz_question_metadata import (
    COMMUTE_MODE,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class TransportationModeStatistics(ACSStatisticsColection):
    version = 3
    def name_for_each_statistic(self):
        return {
            "transportation_means_car": "Commute Car % (incl WFH)",
            "transportation_means_bike": "Commute Bike % (incl WFH)",
            "transportation_means_walk": "Commute Walk % (incl WFH)",
            "transportation_means_transit": "Commute Transit % (incl WFH)",
            "transportation_means_worked_at_home": "Commute Work From Home % (incl WFH)",
            "transportation_means_car_no_wfh": "Commute Car %",
            "transportation_means_bike_no_wfh": "Commute Bike %",
            "transportation_means_walk_no_wfh": "Commute Walk %",
            "transportation_means_transit_no_wfh": "Commute Transit %",
        }

    def varname_for_each_statistic(self):
        return {
            "transportation_means_car": "commute_car_incl_wfh",
            "transportation_means_bike": "commute_bike_incl_wfh",
            "transportation_means_walk": "commute_walk_incl_wfh",
            "transportation_means_transit": "commute_transit_incl_wfh",
            "transportation_means_worked_at_home": "commute_work_from_home_incl_wfh",
            "transportation_means_car_no_wfh": "commute_car",
            "transportation_means_bike_no_wfh": "commute_bike",
            "transportation_means_walk_no_wfh": "commute_walk",
            "transportation_means_transit_no_wfh": "commute_transit",
        }

    def explanation_page_for_each_statistic(self):
        result = self.same_for_each_name("transportation")
        for key in [
            "transportation_means_car",
            "transportation_means_bike",
            "transportation_means_walk",
            "transportation_means_transit",
            "transportation_means_worked_at_home",
        ]:
            result[key] = "deprecated"
        return result

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                COMMUTE_MODE,
                {
                    "transportation_means_car_no_wfh": "higher % of people who commute by car",
                    "transportation_means_bike_no_wfh": "higher % of people who commute by bike",
                    "transportation_means_walk_no_wfh": "higher % of people who commute by walking",
                    "transportation_means_transit_no_wfh": "higher % of people who commute by transit",
                },
            ),
            **QuizQuestionSkip.several(
                "transportation_means_car",
                "transportation_means_bike",
                "transportation_means_walk",
                "transportation_means_transit",
                "transportation_means_worked_at_home",
            ),
        }

    def mutate_acs_results(self, statistics_table):
        statistics_table["transportation_means_car_no_wfh"] = statistics_table[
            "transportation_means_car"
        ]
        statistics_table["transportation_means_bike_no_wfh"] = statistics_table[
            "transportation_means_bike"
        ]
        statistics_table["transportation_means_walk_no_wfh"] = statistics_table[
            "transportation_means_walk"
        ]
        statistics_table["transportation_means_transit_no_wfh"] = statistics_table[
            "transportation_means_transit"
        ]
        statistics_table["transportation_means_other_no_wfh"] = statistics_table[
            "transportation_means_other"
        ]
        fractionalize(
            statistics_table,
            "transportation_means_car",
            "transportation_means_bike",
            "transportation_means_walk",
            "transportation_means_transit",
            "transportation_means_worked_at_home",
            "transportation_means_other",
        )
        fractionalize(
            statistics_table,
            "transportation_means_car_no_wfh",
            "transportation_means_bike_no_wfh",
            "transportation_means_walk_no_wfh",
            "transportation_means_transit_no_wfh",
            "transportation_means_other_no_wfh",
        )
        del statistics_table["transportation_means_other_no_wfh"]
        del statistics_table["transportation_means_other"]

    def acs_name(self):
        return "transportation_means"

    def acs_entity(self):
        return ACSDataEntity(
            "MEANS OF TRANSPORTATION TO WORK",
            "population_18",
            "block group",
            {
                "transportation_means_car": [
                    "Estimate!!Total:!!Car, truck, or van:",
                    "Estimate!!Total:!!Taxicab",
                ],
                "transportation_means_bike": [
                    "Estimate!!Total:!!Bicycle",
                    "Estimate!!Total:!!Motorcycle",
                ],
                "transportation_means_walk": [
                    "Estimate!!Total:!!Walked",
                ],
                "transportation_means_transit": [
                    "Estimate!!Total:!!Public transportation (excluding taxicab):",
                ],
                "transportation_means_worked_at_home": [
                    "Estimate!!Total:!!Worked from home",
                ],
                "transportation_means_other": [
                    "Estimate!!Total:!!Other means",
                ],
                None: [
                    "Estimate!!Total:",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 2-person carpool",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 3-person carpool",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 4-person carpool",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 5- or 6-person carpool",
                    "Estimate!!Total:!!Car, truck, or van:!!Carpooled:!!In 7-or-more-person carpool",
                    "Estimate!!Total:!!Car, truck, or van:!!Drove alone",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Bus",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Ferryboat",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Light rail, streetcar or trolley (carro público in Puerto Rico)",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Long-distance train or commuter rail",
                    "Estimate!!Total:!!Public transportation (excluding taxicab):!!Subway or elevated rail",
                ],
            },
        )
