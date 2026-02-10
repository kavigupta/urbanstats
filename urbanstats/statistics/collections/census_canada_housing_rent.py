from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.games.quiz_question_metadata import (
    HOUSING,
    RENT_BURDEN,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.collections.census_canada_same_as_us import (
    CensusCanadaSameAsUS,
)
from urbanstats.statistics.collections.housing_rent_or_own import HousingRentOrOwn
from urbanstats.statistics.utils import fractionalize


class CensusCanadaHousingRent(CensusCanadaSameAsUS):
    version = 1

    def us_equivalent_fields(self):
        return ["rent_or_own_rent"]

    def census_tables(self) -> CensusTables:
        tenure_table = "Total - Private households by tenure - 25% sample data (50)"
        burden_table = (
            "Total - Owner and tenant households with household total income greater than zero, "
            "in non-farm, non-reserve private dwellings by shelter-cost-to-income ratio - 25% sample data (61)"
        )
        return CensusTables(
            [tenure_table, burden_table],
            {
                "rent_or_own_rent_canada": [
                    "  Renter",
                    "  Dwelling provided by the local government, First Nation or Indian band",
                ],
                "rent_or_own_own_canada": [
                    "  Owner",
                ],
                "rent_burden_under_30_canada": [
                    "  Spending less than 30% of income on shelter costs",
                ],
                "rent_burden_over_30_canada": [
                    "  Spending 30% or more of income on shelter costs",
                ],
                None: [
                    tenure_table,
                    burden_table,
                    "    30% to less than 100%",
                ],
            },
            "total_dwellings",
        )

    def us_equivalent(self):
        return HousingRentOrOwn()

    def name_for_each_statistic(self):
        names = super().name_for_each_statistic()
        names.update(
            {
                "rent_burden_under_30_canada": "Housing Cost/Income < 30% [StatCan]",
                "rent_burden_over_30_canada": "Housing Cost/Income >= 30% [StatCan]",
            }
        )
        return names

    def varname_for_each_statistic(self):
        varnames = super().varname_for_each_statistic()
        varnames.update(
            {
                "rent_burden_under_30_canada": "housing_cost_under_30_percent",
                "rent_burden_over_30_canada": "housing_cost_30_percent_or_more",
            }
        )
        return varnames

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census-disaggregated")

    def quiz_question_descriptors(self):
        return {
            **super().quiz_question_descriptors(),
            "rent_burden_under_30_canada": QuizQuestionSkip(),
            "rent_burden_over_30_canada": QuizQuestionDescriptor(
                "higher % of households spending 30% or more of income on shelter costs",
                RENT_BURDEN,
            ),
        }

    def post_process(self, statistic_table):
        statistic_table = statistic_table.copy()
        fractionalize(
            statistic_table,
            "rent_or_own_rent_canada",
            "rent_or_own_own_canada",
        )
        del statistic_table["rent_or_own_own_canada"]
        fractionalize(
            statistic_table,
            "rent_burden_under_30_canada",
            "rent_burden_over_30_canada",
        )
        return statistic_table
