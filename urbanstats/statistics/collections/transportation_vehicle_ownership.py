from urbanstats.acs.load import ACSDataEntity
from urbanstats.games.quiz_question_metadata import (
    VEHICLE_OWNERSHIP,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class TransportationVehicleOwnershipStatistics(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "vehicle_ownership_none": "Households With no Vehicle %",
            "vehicle_ownership_at_least_1": "Households With 1+ Vehicles %",
            "vehicle_ownership_at_least_2": "Households With 2+ Vehicles %",
        }

    def varname_for_each_statistic(self):
        return {
            "vehicle_ownership_none": "no_vehicle",
            "vehicle_ownership_at_least_1": "one_plus_vehicles",
            "vehicle_ownership_at_least_2": "two_plus_vehicles",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("transportation")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                VEHICLE_OWNERSHIP,
                {
                    "vehicle_ownership_at_least_1": "higher % of households with at least 1 vehicle"
                },
            ),
            **QuizQuestionSkip.several(
                "vehicle_ownership_none",
                "vehicle_ownership_at_least_2",
            ),
        }

    def mutate_acs_results(self, statistics_table):
        fractionalize(
            statistics_table,
            "vehicle_ownership_none",
            "vehicle_ownership_1",
            "vehicle_ownership_at_least_2",
        )

        statistics_table["vehicle_ownership_at_least_1"] = (
            statistics_table["vehicle_ownership_1"]
            + statistics_table["vehicle_ownership_at_least_2"]
        )
        del statistics_table["vehicle_ownership_1"]

    def acs_name(self):
        return "car_ownership"

    def acs_entity(self):
        return ACSDataEntity(
            "HOUSEHOLD SIZE BY VEHICLES AVAILABLE",
            "occupied",
            "tract",
            {
                None: [
                    "Estimate!!Total:",
                    "Estimate!!Total:!!1-person household:",
                    "Estimate!!Total:!!1-person household:!!1 vehicle available",
                    "Estimate!!Total:!!1-person household:!!2 vehicles available",
                    "Estimate!!Total:!!1-person household:!!3 vehicles available",
                    "Estimate!!Total:!!1-person household:!!4 or more vehicles available",
                    "Estimate!!Total:!!1-person household:!!No vehicle available",
                    "Estimate!!Total:!!2-person household:",
                    "Estimate!!Total:!!2-person household:!!1 vehicle available",
                    "Estimate!!Total:!!2-person household:!!2 vehicles available",
                    "Estimate!!Total:!!2-person household:!!3 vehicles available",
                    "Estimate!!Total:!!2-person household:!!4 or more vehicles available",
                    "Estimate!!Total:!!2-person household:!!No vehicle available",
                    "Estimate!!Total:!!3-person household:",
                    "Estimate!!Total:!!3-person household:!!1 vehicle available",
                    "Estimate!!Total:!!3-person household:!!2 vehicles available",
                    "Estimate!!Total:!!3-person household:!!3 vehicles available",
                    "Estimate!!Total:!!3-person household:!!4 or more vehicles available",
                    "Estimate!!Total:!!3-person household:!!No vehicle available",
                    "Estimate!!Total:!!4-or-more-person household:",
                    "Estimate!!Total:!!4-or-more-person household:!!1 vehicle available",
                    "Estimate!!Total:!!4-or-more-person household:!!2 vehicles available",
                    "Estimate!!Total:!!4-or-more-person household:!!3 vehicles available",
                    "Estimate!!Total:!!4-or-more-person household:!!4 or more vehicles available",
                    "Estimate!!Total:!!4-or-more-person household:!!No vehicle available",
                ],
                "vehicle_ownership_none": [
                    "Estimate!!Total:!!No vehicle available",
                ],
                "vehicle_ownership_1": [
                    "Estimate!!Total:!!1 vehicle available",
                ],
                "vehicle_ownership_at_least_2": [
                    "Estimate!!Total:!!2 vehicles available",
                    "Estimate!!Total:!!3 vehicles available",
                    "Estimate!!Total:!!4 or more vehicles available",
                ],
            },
        )
