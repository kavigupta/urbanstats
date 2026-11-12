from dataclasses import dataclass
from typing import Tuple

import pandas as pd

from urbanstats.acs.load import ACSDataEntity, aggregated_acs_data
from urbanstats.games.quiz_question_metadata import (
    EDUCATION_FIELD,
    EDUCATION_LEVEL,
    QuizQuestionDescriptor,
)
from urbanstats.statistics.national_census import (
    AustralianCounts,
    NationalCensusStatistics,
)

FIELDS = (
    "education_field_stem",
    "education_field_humanities",
    "education_field_business",
)

# 25 and over, matching the US. 85 and over is named differently (P_BachDeg_85ov), so by_age adds it.
AGES_25_TO_84 = ["25_34", "35_44", "45_54", "55_64", "65_74", "75_84"]


def by_age(prefix, suffix=""):
    """A cell's codes for each age group from 25 up, e.g. P_BachDeg_25_34 ... P_BachDeg_85ov."""
    return [f"{prefix}_{a}{suffix}" for a in AGES_25_TO_84] + [f"{prefix}_85ov"]


@dataclass(frozen=True)
class USEducationCounts:
    entities: Tuple[ACSDataEntity, ...]

    def compute(self, shapefile):
        return pd.concat(
            [aggregated_acs_data(2020, e, shapefile.geometry) for e in self.entities],
            axis=1,
        )


@dataclass(frozen=True)
class AustralianEducationCounts(AustralianCounts):
    """
    In the US's columns, with everyone without a degree under education_no, as there is no high
    school count.

    G50 gives the field of every non-school qualification, certificates included, so like Canada the
    split between fields is applied to the people with at least a bachelor's.
    """

    def compute(self, shapefile):
        c = super().compute(shapefile)
        answered = c.total - c.level_unknown
        degree = c.bachelor_or_graduate_diploma + c.postgraduate
        field_total = sum(c[field] for field in FIELDS)
        return pd.DataFrame(
            {
                "education_no": answered - degree,
                "education_ugrad": c.bachelor_or_graduate_diploma,
                "education_grad": c.postgraduate,
                **{field: c[field] / field_total * degree for field in FIELDS},
            }
        )


class EducationStatistics(NationalCensusStatistics):
    version = 1

    def name_for_each_statistic(self):
        return {
            "education_high_school": "High School %",
            "education_ugrad": "Undergrad %",
            "education_grad": "Grad %",
            "education_field_stem": "Undergrad STEM %",
            "education_field_humanities": "Undergrad Humanities %",
            "education_field_business": "Undergrad Business %",
        }

    def unit_for_each_statistic(self):
        return self.same_for_each_name("percentage")

    def varname_for_each_statistic(self):
        return {
            "education_high_school": "high_school",
            "education_ugrad": "undergrad",
            "education_grad": "graduate",
            "education_field_stem": "stem_degree",
            "education_field_humanities": "humanities_degree",
            "education_field_business": "business_degree",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("education")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                EDUCATION_LEVEL,
                {
                    "education_high_school": "higher % of people who have at least a high school diploma",
                    "education_ugrad": "higher % of people who have at least an undergrad degree",
                    "education_grad": "higher % of people who have a graduate degree",
                },
            ),
            **QuizQuestionDescriptor.several(
                EDUCATION_FIELD,
                {
                    "education_field_stem": "!FULL Which has more people with a STEM degree, as a percentage of the overall population?",
                    "education_field_humanities": "!FULL Which has more people with a humanities degree, as a percentage of the overall population?",
                    "education_field_business": "!FULL Which has more people with a business degree, as a percentage of the overall population?",
                },
            ),
        }

    def countries_for_each_statistic(self):
        return {
            name: ("USA",) if name == "education_high_school" else ("USA", "Australia")
            for name in self.internal_statistic_names_list()
        }

    def country_inputs(self):
        return {
            "USA": USEducationCounts(tuple(self.acs_entity_dict().values())),
            "Australia": AustralianEducationCounts(self.abs_tables()),
        }

    def abs_tables(self):
        return {
            # highest year of school, which counts everyone who has left school, so it gives the
            # denominator
            "G16": {"total": by_age("P_Tot", suffix="_yrs")},
            # level of highest non-school qualification, which only counts people with a qualification
            # or who did not say whether they have one
            "G49": {
                "postgraduate": by_age("P_PGrad_Deg"),
                # graduate diplomas and certificates sit above a bachelor's but are not graduate
                # degrees, as with Canada's university certificates above bachelor level
                "bachelor_or_graduate_diploma": by_age("P_BachDeg")
                + by_age("P_GradDip_and_GradCert"),
                # includes people who did not say whether they have a qualification, who are left
                # out of the denominator
                "level_unknown": by_age("P_Lev_Edu_IDes") + by_age("P_Lev_Edu_NS"),
            },
            "G50": {
                "education_field_stem": by_age("P_NatPhyl_Scn")
                + by_age("P_InfoTech")
                + by_age("P_Eng_RelTec")
                + by_age("P_ArchtBldng")
                + by_age("P_Ag_Envir_Rltd_Sts")
                + by_age("P_Health"),
                "education_field_humanities": by_age("P_Educ")
                + by_age("P_Society_Cult")
                + by_age("P_Creative_Arts")
                + by_age("P_Fd_Hosp_Psnl_Svcs")
                + by_age("P_MixFld_Prgm"),
                "education_field_business": by_age("P_Mgnt_Com"),
            },
        }

    def mutate_counts(self, counts):
        # Australia has no high school count
        if "education_high_school" not in counts:
            counts["education_high_school"] = 0
        education_denominator = (
            counts.education_no
            + counts.education_high_school
            + counts.education_ugrad
            + counts.education_grad
        )
        counts["education_high_school"] = (
            counts.education_high_school
            + counts.education_ugrad
            + counts.education_grad
        ) / education_denominator
        counts["education_ugrad"] = (
            counts.education_ugrad + counts.education_grad
        ) / education_denominator
        counts["education_grad"] = counts.education_grad / education_denominator
        del counts["education_no"]

        for column in FIELDS:
            counts[column] = counts[column] / education_denominator

    def acs_entity_dict(self):
        return dict(
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
        )
