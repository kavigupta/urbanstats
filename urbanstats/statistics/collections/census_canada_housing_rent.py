from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.games.quiz_question_metadata import (
    HOUSING,
    RENT_BURDEN,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.collections.census import Census2020
from urbanstats.statistics.collections.census_canada_same_as_us import (
    CensusCanadaSameAsUS,
)
from urbanstats.statistics.collections.housing_rent_or_own import HousingRentOrOwn
from urbanstats.statistics.utils import fractionalize


class CensusCanadaHousingRent(CensusCanadaSameAsUS):
    version = 4

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
                "rent_burden_over_30_canada": "Housing Cost/Income > 30% [StatCan]",
            }
        )
        return names

    def varname_for_each_statistic(self):
        varnames = super().varname_for_each_statistic()
        varnames.update(
            {
                "rent_burden_over_30_canada": "housing_cost_30_percent_or_more",
            }
        )
        return varnames

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census-disaggregated")

    def quiz_question_descriptors(self):
        rent_or_own_desc = HousingRentOrOwn().quiz_question_descriptors()[
            "rent_or_own_rent"
        ]
        return {
            "rent_or_own_rent_canada": rent_or_own_desc,
            "rent_burden_over_30_canada": QuizQuestionDescriptor(
                "higher % of households spending 30% or more of income on shelter costs",
                RENT_BURDEN,
            ),
        }

    def compute_statistics_dictionary_canada(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        del existing_statistics, shapefile_table
        statistics_table = self.census_tables().compute(2021, shapefile)
        statistics_table = statistics_table.copy()
        return self.post_process(statistics_table)

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
        del statistic_table["rent_burden_under_30_canada"]
        return statistic_table


class CensusCanadaHousingPerPerson(CensusCanadaSameAsUS):
    version = 5

    def us_equivalent_fields(self):
        return ["housing_per_person", "housing_per_pop"]

    def census_tables(self) -> CensusTables:
        return CensusTables(
            ["Total private dwellings (2)"],
            {
                "total_dwellings_canada": ["Total private dwellings (2)"],
            },
            "total_dwellings",
        )

    def us_equivalent(self):
        return Census2020()

    def housing_population_tables(self) -> CensusTables:
        return CensusTables(
            ["Total - Age groups of the population - 100% data"],
            {
                None: [
                    "  0 to 14 years",
                    "    0 to 4 years",
                    "    5 to 9 years",
                    "    10 to 14 years",
                    "  15 to 64 years",
                    "  65 years and over",
                    "      85 to 89 years",
                    "      90 to 94 years",
                    "      95 to 99 years",
                    "      100 years and over",
                ],
                "population_total_canada": [
                    "Total - Age groups of the population - 100% data",
                ],
                "population_15_to_19_canada": [
                    "    15 to 19 years",
                ],
                "population_20_plus_canada": [
                    "    20 to 24 years",
                    "    25 to 29 years",
                    "    30 to 34 years",
                    "    35 to 39 years",
                    "    40 to 44 years",
                    "    45 to 49 years",
                    "    50 to 54 years",
                    "    55 to 59 years",
                    "    60 to 64 years",
                    "    65 to 69 years",
                    "    70 to 74 years",
                    "    75 to 79 years",
                    "    80 to 84 years",
                    "    85 years and over",
                ],
            },
            "population",
        )

    def compute_statistics_dictionary_canada(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        del existing_statistics, shapefile_table
        dwellings_table = self.census_tables().compute(2021, shapefile)
        population_table = self.housing_population_tables().compute(2021, shapefile)
        population_18_plus = population_table[
            "population_20_plus_canada"
        ] + population_table["population_15_to_19_canada"] * (2 / 5)
        return {
            "housing_per_person_canada": (
                dwellings_table["total_dwellings_canada"]
                / population_table["population_total_canada"]
            ),
            "housing_per_pop_canada": (
                dwellings_table["total_dwellings_canada"] / population_18_plus
            ),
        }
