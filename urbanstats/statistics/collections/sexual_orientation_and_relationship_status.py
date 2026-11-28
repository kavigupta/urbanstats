from dataclasses import dataclass

import pandas as pd

from urbanstats.acs.load import ACSDataEntity
from urbanstats.games.quiz_question_metadata import (
    SORS,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.national_census import (
    ACSCounts,
    AustralianCounts,
    NationalCensusStatistics,
    australian_counts,
)

US_ONLY = ("sors_cohabiting_partnered_gay", "sors_cohabiting_partnered_straight")


@dataclass(frozen=True)
class USRelationshipCounts(ACSCounts):
    def compute(self, shapefile):
        counts = super().compute(shapefile)
        counts["household_type_by_relationship_partner"] = (
            counts["household_type_by_relationship_straight"]
            + counts["household_type_by_relationship_gay"]
        )
        return counts


@dataclass(frozen=True)
class AustralianRelationshipCounts(AustralianCounts):
    """
    In the US's columns, where each household has one householder and partners are those of the
    householder, one per couple. ABS counts both partners in every couple, and every member of a
    group household, so one of each group household's members is taken as its householder.
    """

    def compute(self, shapefile):
        c = super().compute(shapefile)
        group_households = australian_counts(
            "G35",
            {
                "group_households": [
                    f"Num_Psns_UR_{n}_NonFamHhold" for n in ["2", "3", "4", "5", "6mo"]
                ]
            },
            "dwellings",
            shapefile.geometry,
        ).group_households
        couples = (c.registered_partner + c.de_facto_partner) / 2
        return pd.DataFrame(
            {
                "household_type_by_relationship_householder": c.lone_person
                + c.lone_parent
                + group_households
                + couples,
                "household_type_by_relationship_partner": couples,
                "household_type_by_relationship_child": c.child_under_15
                + c.dependent_student
                + c.non_dependent_child,
                "household_type_by_relationship_other": c.other_related
                + c.unrelated_in_family_household
                + (c.group_household_member - group_households).clip(lower=0)
                + c.in_non_private_dwellings,
            }
        )


class SexualOrientationRelationshipStatusStatistics(NationalCensusStatistics):
    version = 1

    def name_for_each_statistic(self):
        return {
            "sors_unpartnered_householder": "Not Cohabiting With Partner %",
            "sors_cohabiting_partnered": "Cohabiting With Partner %",
            "sors_cohabiting_partnered_gay": "Cohabiting With Partner (Gay) %",
            "sors_cohabiting_partnered_straight": "Cohabiting With Partner (Straight) %",
            "sors_child": "Living With Parents %",
            "sors_other": "Other Living Situation %",
        }

    def unit_for_each_statistic(self):
        return self.same_for_each_name("percentage")

    def varname_for_each_statistic(self):
        return {
            "sors_unpartnered_householder": "single_householder",
            "sors_cohabiting_partnered": "cohabiting",
            "sors_cohabiting_partnered_gay": "cohabiting_gay",
            "sors_cohabiting_partnered_straight": "cohabiting_straight",
            "sors_child": "living_with_parents",
            "sors_other": "other_living_situation",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("sors")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                SORS,
                {
                    "sors_cohabiting_partnered_gay": "higher % of people who are gay and cohabiting with a partner/spouse",
                },
            ),
            **QuizQuestionSkip.several(
                "sors_unpartnered_householder",
                "sors_cohabiting_partnered",
                "sors_cohabiting_partnered_straight",
                "sors_child",
                "sors_other",
            ),
        }

    def countries_for_each_statistic(self):
        return {
            name: ("USA",) if name in US_ONLY else ("USA", "Australia")
            for name in self.internal_statistic_names_list()
        }

    def country_inputs(self):
        return {
            "USA": USRelationshipCounts(
                self.acs_entity_dict()["household_type_by_relationship"]
            ),
            "Australia": AustralianRelationshipCounts(
                {
                    # Visitors are left out, as the US counts people where they usually live.
                    "G27": {
                        "registered_partner": ["P_Ptn_in_RM_Tot"],
                        "de_facto_partner": ["P_Ptn_in_DFM_Tot"],
                        "lone_parent": ["P_LonePnt_Tot"],
                        "child_under_15": ["P_CU15_Tot"],
                        "dependent_student": ["P_DpStu_Tot"],
                        "non_dependent_child": ["P_NDpChl_Tot"],
                        "other_related": ["P_OthRI_Tot"],
                        "unrelated_in_family_household": ["P_URI_in_FH_Tot"],
                        "group_household_member": ["P_GrpH_Mem_Tot"],
                        "lone_person": ["P_LonePsn_Tot"],
                    },
                    # G27 only counts private dwellings, so this is the US's group quarters
                    "G01": {"in_non_private_dwellings": ["Count_Persons_other_dwgs_P"]},
                }
            ),
        }

    def mutate_counts(self, counts):
        # Australia has no split between same-sex and opposite-sex couples
        for coupled in ["straight", "gay"]:
            if f"household_type_by_relationship_{coupled}" not in counts:
                counts[f"household_type_by_relationship_{coupled}"] = 0
        householder = counts.household_type_by_relationship_householder
        partner = counts.household_type_by_relationship_partner
        total = (
            counts.household_type_by_relationship_other
            + counts.household_type_by_relationship_child
            + householder
            + partner
        )
        counts["sors_unpartnered_householder"] = (householder - partner) / total
        counts["sors_cohabiting_partnered"] = partner * 2 / total
        for coupled in ["straight", "gay"]:
            counts[f"sors_cohabiting_partnered_{coupled}"] = (
                counts[f"household_type_by_relationship_{coupled}"] * 2 / total
            )
        counts["sors_child"] = counts.household_type_by_relationship_child / total
        counts["sors_other"] = counts.household_type_by_relationship_other / total

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
