# pylint: disable=duplicate-code
from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class TransportationModeStatistics(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "transportation_means_car": "Commute Car %",
            "transportation_means_bike": "Commute Bike %",
            "transportation_means_walk": "Commute Walk %",
            "transportation_means_transit": "Commute Transit %",
            "transportation_means_worked_at_home": "Commute Work From Home %",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("transportation")

    def quiz_question_names(self):
        return {
            "transportation_means_car": "higher % of people who commute by car",
            "transportation_means_bike": "higher % of people who commute by bike",
            "transportation_means_walk": "higher % of people who commute by walking",
            "transportation_means_transit": "higher % of people who commute by transit",
            "transportation_means_worked_at_home": "higher % of people who work from home",
        }

    def mutate_acs_results(self, statistics_table):
        fractionalize(
            statistics_table,
            "transportation_means_car",
            "transportation_means_bike",
            "transportation_means_walk",
            "transportation_means_transit",
            "transportation_means_worked_at_home",
            "transportation_means_other",
        )
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
