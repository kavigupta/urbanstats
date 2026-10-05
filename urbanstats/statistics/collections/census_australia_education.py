import pandas as pd

from urbanstats.statistics.collections.census_australia_same_as_us import (
    CensusAustraliaSameAsUS,
)
from urbanstats.statistics.collections.education_statistics import EducationStatistics
from urbanstats.statistics.utils import fractionalize

# 25 and over, matching the US. 85 and over is named differently (P_BachDeg_85ov), so by_age adds it.
AGES_25_TO_84 = ["25_34", "35_44", "45_54", "55_64", "65_74", "75_84"]


def by_age(prefix, suffix=""):
    """A cell's codes for each age group from 25 up, e.g. P_BachDeg_25_34 ... P_BachDeg_85ov."""
    return [f"{prefix}_{a}{suffix}" for a in AGES_25_TO_84] + [f"{prefix}_85ov"]


class CensusAustraliaEducation(CensusAustraliaSameAsUS):
    version = 1

    def us_equivalent(self):
        return EducationStatistics()

    def us_equivalent_fields(self):
        # No high school: the DataPack has Year 12 completion and post-school qualifications in
        # separate tables, so the share with either (the closest match to a US diploma) is unknown.
        return ["education_ugrad", "education_grad"]

    def abs_tables(self):
        return [
            # highest year of school, which counts everyone who has left school, so it gives the
            # denominator
            ("G16", {"total": by_age("P_Tot", suffix="_yrs")}),
            # level of highest non-school qualification, which only counts people with a qualification
            # or who did not say whether they have one
            (
                "G49",
                {
                    "postgraduate": by_age("P_PGrad_Deg"),
                    # graduate diplomas and certificates sit above a bachelor's but are not graduate
                    # degrees, as with Canada's university certificates above bachelor level
                    "bachelor_or_graduate_diploma": by_age("P_BachDeg")
                    + by_age("P_GradDip_and_GradCert"),
                    # includes people who did not say whether they have a qualification, who are left
                    # out of the denominator
                    "level_unknown": by_age("P_Lev_Edu_IDes") + by_age("P_Lev_Edu_NS"),
                },
            ),
        ]

    def post_process(self, statistic_table):
        st = statistic_table
        answered_level = st.total - st.level_unknown
        return pd.DataFrame(
            {
                "education_ugrad_australia": (
                    st.bachelor_or_graduate_diploma + st.postgraduate
                )
                / answered_level,
                "education_grad_australia": st.postgraduate / answered_level,
            }
        )


class CensusAustraliaEducationField(CensusAustraliaSameAsUS):
    """
    G50 gives the field of every non-school qualification, certificates included, so like Canada the
    split between fields is applied to the share with at least a bachelor's.
    """

    version = 1

    def dependencies(self):
        return ["education_ugrad_australia"]

    def us_equivalent(self):
        return EducationStatistics()

    def us_equivalent_fields(self):
        return [
            "education_field_stem",
            "education_field_humanities",
            "education_field_business",
        ]

    def abs_tables(self):
        return [
            (
                "G50",
                {
                    "education_field_stem_australia": by_age("P_NatPhyl_Scn")
                    + by_age("P_InfoTech")
                    + by_age("P_Eng_RelTec")
                    + by_age("P_ArchtBldng")
                    + by_age("P_Ag_Envir_Rltd_Sts")
                    + by_age("P_Health"),
                    "education_field_humanities_australia": by_age("P_Educ")
                    + by_age("P_Society_Cult")
                    + by_age("P_Creative_Arts")
                    + by_age("P_Fd_Hosp_Psnl_Svcs")
                    + by_age("P_MixFld_Prgm"),
                    "education_field_business_australia": by_age("P_Mgnt_Com"),
                },
            )
        ]

    def post_process(self, statistic_table):
        statistic_table = statistic_table.copy()
        fractionalize(statistic_table, *self.internal_statistic_names_list())
        return statistic_table

    def compute_statistics_dictionary_australia(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        statistic_table = self.post_process(self.compute_sa1_columns(shapefile))
        ugrad = existing_statistics["education_ugrad_australia"]
        return {k: v * ugrad for k, v in statistic_table.items()}


census_australia_education = [
    CensusAustraliaEducation(),
    CensusAustraliaEducationField(),
]
