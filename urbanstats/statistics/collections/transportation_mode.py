# pylint: disable=duplicate-code
from urbanstats.acs.load import ACSDataEntity
from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.games.quiz_question_metadata import (
    COMMUTE_MODE,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.national_census import (
    ACSCounts,
    NationalCensusStatistics,
    StatCanCounts,
)
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class TransportationModeStatistics(ACSStatisticsColection):
    """The US-only shares, which count working from home as a mode."""

    version = 4

    def legacy_statistic_names(self):
        # Old quiz data used these names for the (incl WFH) stats
        return {
            "Commute Car %": "Commute Car % (incl WFH)",
            "Commute Bike %": "Commute Bike % (incl WFH)",
            "Commute Walk %": "Commute Walk % (incl WFH)",
            "Commute Transit %": "Commute Transit % (incl WFH)",
            "Commute Work From Home %": "Commute Work From Home % (incl WFH)",
        }

    def name_for_each_statistic(self):
        return {
            "transportation_means_car": "Commute Car % (incl WFH)",
            "transportation_means_bike": "Commute Bike % (incl WFH)",
            "transportation_means_walk": "Commute Walk % (incl WFH)",
            "transportation_means_transit": "Commute Transit % (incl WFH)",
            "transportation_means_worked_at_home": "Commute Work From Home % (incl WFH)",
        }

    def unit_for_each_statistic(self):
        return self.same_for_each_name("percentage")

    def varname_for_each_statistic(self):
        return {
            "transportation_means_car": "commute_car_incl_wfh",
            "transportation_means_bike": "commute_bike_incl_wfh",
            "transportation_means_walk": "commute_walk_incl_wfh",
            "transportation_means_transit": "commute_transit_incl_wfh",
            "transportation_means_worked_at_home": "commute_work_from_home_incl_wfh",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("deprecated")

    def deprecation_for_each_statistic(self):
        no_wfh = TransportationModeNoWFHStatistics()
        vname = no_wfh.varname_for_each_statistic()
        nname = no_wfh.name_for_each_statistic()
        result = {}
        for mode in ["car", "bike", "walk", "transit"]:
            new_key = f"transportation_means_{mode}_no_wfh"
            result[f"transportation_means_{mode}"] = (
                f"Use {vname[new_key]} ({nname[new_key]}) instead,"
                " which excludes work-from-home from the denominator and is more accurate for comparisons"
            )
        result[
            "transportation_means_worked_at_home"
        ] = "This statistic is deprecated because it is highly inconsistent across time"
        return result

    def quiz_question_descriptors(self):
        return QuizQuestionSkip.several(*self.internal_statistic_names_list())

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
        return "transportation_mode"

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


class TransportationModeNoWFHStatistics(NationalCensusStatistics):
    """The shares of commuters who don't work from home."""

    version = {"USA": 1, "Canada": 1}

    def name_for_each_statistic(self):
        return {
            "transportation_means_car_no_wfh": "Commute Car %",
            "transportation_means_bike_no_wfh": "Commute Bike %",
            "transportation_means_walk_no_wfh": "Commute Walk %",
            "transportation_means_transit_no_wfh": "Commute Transit %",
        }

    def unit_for_each_statistic(self):
        return self.same_for_each_name("percentage")

    def varname_for_each_statistic(self):
        return {
            "transportation_means_car_no_wfh": "commute_car",
            "transportation_means_bike_no_wfh": "commute_bike",
            "transportation_means_walk_no_wfh": "commute_walk",
            "transportation_means_transit_no_wfh": "commute_transit",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("transportation")

    def quiz_question_descriptors(self):
        return QuizQuestionDescriptor.several(
            COMMUTE_MODE,
            {
                "transportation_means_car_no_wfh": "higher % of people who commute by car",
                "transportation_means_bike_no_wfh": "higher % of people who commute by bike",
                "transportation_means_walk_no_wfh": "higher % of people who commute by walking",
                "transportation_means_transit_no_wfh": "higher % of people who commute by transit",
            },
        )

    def mutate_counts(self, counts):
        modes = ["car", "bike", "walk", "transit", "other"]
        for mode in modes:
            counts[f"transportation_means_{mode}_no_wfh"] = counts[
                f"transportation_means_{mode}"
            ]
        fractionalize(
            counts, *[f"transportation_means_{mode}_no_wfh" for mode in modes]
        )

    def country_inputs(self):
        return {
            "USA": ACSCounts(TransportationModeStatistics().acs_entity()),
            "Canada": StatCanCounts(self.census_tables_canada()),
        }

    def census_tables_canada(self):
        # pylint: disable=line-too-long
        main_mode_table = "Total - Main mode of commuting for the employed labour force aged 15 years and over with a usual place of work or no fixed workplace address - 25% sample data (200)"
        return CensusTables(
            [main_mode_table],
            {
                "transportation_means_car": [
                    "  Car, truck or van",
                ],
                "transportation_means_transit": [
                    "  Public transit",
                ],
                "transportation_means_walk": [
                    "  Walked",
                ],
                "transportation_means_bike": [
                    "  Bicycle",
                ],
                "transportation_means_other": [
                    "  Other method",
                ],
                None: [
                    main_mode_table,
                    "    Car, truck or van - as a driver",
                    "    Car, truck or van - as a passenger",
                ],
            },
            "population",
        )
