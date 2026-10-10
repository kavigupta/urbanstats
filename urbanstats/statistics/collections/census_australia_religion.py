import pandas as pd

from urbanstats.statistics.collections.census_australia_same_as_us import (
    CensusAustraliaSA1,
)
from urbanstats.statistics.collections.census_canada_religion import (
    CensusCanadaReligion,
)
from urbanstats.statistics.utils import fractionalize


class CensusAustraliaReligion(CensusAustraliaSA1):
    """The same categories as CensusCanadaReligion, which names the rows these share."""

    version = 1

    def abs_tables(self):
        return [
            (
                "G14",
                {
                    "catholic": ["Christianity_Catholic_P"],
                    "christian": ["Christianity_Tot_P"],
                    "hindu": ["Hinduism_P"],
                    "jewish": ["Judaism_P"],
                    "muslim": ["Islam_P"],
                    "sikh": ["Othr_Rel_Sikhism_P"],
                    "buddhist": ["Buddhism_P"],
                    # Canada's "No religion and secular perspectives"
                    "no_religion": ["SB_OSB_NRA_NR_P", "SB_OSB_NRA_SB_P"],
                    # Sikhism is one of these, and is taken out below
                    "other_religions": ["Other_Religions_Tot_P"],
                    # Canada counts spiritual traditions as other religions
                    "other_spiritual": ["SB_OSB_NRA_OSB_P"],
                },
            )
        ]

    @staticmethod
    def australia_name(canada_name):
        return canada_name.replace("_canada", "_australia")

    def name_for_each_statistic(self):
        return {
            self.australia_name(k): f"{v} [AuBS]"
            for k, v in CensusCanadaReligion().name_for_each_statistic().items()
        }

    def unit_for_each_statistic(self):
        return self.same_for_each_name("percentage")

    def varname_for_each_statistic(self):
        return {
            self.australia_name(k): v
            for k, v in CensusCanadaReligion().varname_for_each_statistic().items()
        }

    def quiz_question_descriptors(self):
        return {
            self.australia_name(k): v
            for k, v in CensusCanadaReligion().quiz_question_descriptors().items()
        }

    def post_process(self, statistic_table):
        st = statistic_table
        result = pd.DataFrame(
            {
                "religion_catholic_australia": st.catholic,
                "religion_protestant_australia": (st.christian - st.catholic).clip(
                    lower=0
                ),
                "religion_hindu_australia": st.hindu,
                "religion_jewish_australia": st.jewish,
                "religion_muslim_australia": st.muslim,
                "religion_sikh_australia": st.sikh,
                "religion_buddhist_australia": st.buddhist,
                "religion_no_religion_australia": st.no_religion,
                "religion_other_australia": (st.other_religions - st.sikh).clip(lower=0)
                + st.other_spiritual,
            }
        )
        fractionalize(result, *self.internal_statistic_names_list())
        return result
