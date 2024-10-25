from urbanstats.acs.load import ACSDataEntity
from urbanstats.statistics.statistic_collection import ACSStatisticsColection
from urbanstats.statistics.utils import fractionalize


class SexualOrientationRelationshipStatusStatistics(ACSStatisticsColection):
    def name_for_each_statistic(self):
        return {
            "sors_unpartnered_householder": "Not Cohabiting With Partner %",
            "sors_cohabiting_partnered_gay": "Cohabiting With Partner (Gay) %",
            "sors_cohabiting_partnered_straight": "Cohabiting With Partner (Straight) %",
            "sors_child": "Living With Parents %",
            "sors_other": "Other Living Situation %",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("sors")

    def quiz_question_names(self):
        return {
            "sors_cohabiting_partnered_gay": "higher % of people who are gay and cohabiting with a partner/spouse",
        }

    def quiz_question_unused(self):
        return [
            "sors_unpartnered_householder",
            "sors_cohabiting_partnered_straight",
            "sors_child",
            "sors_other",
        ]

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        fractionalize(
            statistics_table,
            "household_type_by_relationship_other",
            "household_type_by_relationship_child",
            "household_type_by_relationship_householder",
            "household_type_by_relationship_straight",
            "household_type_by_relationship_gay",
        )
        statistics_table["sors_unpartnered_householder"] = (
            statistics_table["household_type_by_relationship_householder"]
            - statistics_table["household_type_by_relationship_straight"]
            - statistics_table["household_type_by_relationship_gay"]
        )
        del statistics_table["household_type_by_relationship_householder"]
        for coupled in ["straight", "gay"]:
            statistics_table[f"sors_cohabiting_partnered_{coupled}"] = (
                statistics_table[f"household_type_by_relationship_{coupled}"] * 2
            )
            del statistics_table[f"household_type_by_relationship_{coupled}"]
        statistics_table["sors_child"] = statistics_table[
            "household_type_by_relationship_child"
        ]
        del statistics_table["household_type_by_relationship_child"]
        statistics_table["sors_other"] = statistics_table[
            "household_type_by_relationship_other"
        ]
        del statistics_table["household_type_by_relationship_other"]

    def acs_name(self):
        raise NotImplementedError

    def acs_entity(self):
        raise NotImplementedError

    def acs_entity_dict(self):
        return {
            "household_type_by_relationship": ACSDataEntity(
                "HOUSEHOLD TYPE (INCLUDING LIVING ALONE) BY RELATIONSHIP",
                "population",
                "block group",
                {
                    None: [
                        # too high level
                        "Estimate!!Total:",
                        "Estimate!!Total:!!In households:",
                        # too low level
                        "Estimate!!Total:!!In households:!!Child:!!Adopted child",
                        "Estimate!!Total:!!In households:!!Child:!!Biological child",
                        "Estimate!!Total:!!In households:!!Child:!!Stepchild",
                        "Estimate!!Total:!!In households:!!Householder:!!Female:",
                        "Estimate!!Total:!!In households:!!Householder:!!Female:!!Living alone",
                        "Estimate!!Total:!!In households:!!Householder:!!Female:!!Not living alone",
                        "Estimate!!Total:!!In households:!!Householder:!!Male:",
                        "Estimate!!Total:!!In households:!!Householder:!!Male:!!Living alone",
                        "Estimate!!Total:!!In households:!!Householder:!!Male:!!Not living alone",
                    ],
                    "household_type_by_relationship_other": [
                        "Estimate!!Total:!!In group quarters",
                        "Estimate!!Total:!!In households:!!Brother or sister",
                        "Estimate!!Total:!!In households:!!Other nonrelatives",
                        "Estimate!!Total:!!In households:!!Other relatives",
                        "Estimate!!Total:!!In households:!!Parent",
                        "Estimate!!Total:!!In households:!!Parent-in-law",
                    ],
                    "household_type_by_relationship_child": [
                        "Estimate!!Total:!!In households:!!Child:",
                        "Estimate!!Total:!!In households:!!Foster child",
                        "Estimate!!Total:!!In households:!!Grandchild",
                        "Estimate!!Total:!!In households:!!Son-in-law or daughter-in-law",
                    ],
                    "household_type_by_relationship_householder": [
                        "Estimate!!Total:!!In households:!!Householder:",
                    ],
                    "household_type_by_relationship_straight": [
                        "Estimate!!Total:!!In households:!!Opposite-sex spouse",
                        "Estimate!!Total:!!In households:!!Opposite-sex unmarried partner",
                    ],
                    "household_type_by_relationship_gay": [
                        "Estimate!!Total:!!In households:!!Same-sex spouse",
                        "Estimate!!Total:!!In households:!!Same-sex unmarried partner",
                    ],
                },
            ),
        }
