from abc import abstractmethod

from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.games.quiz_question_metadata import (
    EDUCATION_LEVEL,
    INCOME,
    POVERTY,
    RACE,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.statistic_collection import CanadaStatistics
from urbanstats.statistics.utils import fractionalize


class CensusCanadaSimple(CanadaStatistics):
    """
    Represents a statistic found in one canadian table whose columns can be
    directly fractionalized and used with no further processing.

    You can override `post_process` to do something more sophisticated.

    Unlike `CensusCanadaSameAsUS`, you need to provide quiz question names,
    explanation pages, etc.
    """

    @abstractmethod
    def census_tables(self) -> CensusTables:
        pass

    def compute_statistics_dictionary_canada(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        st = self.census_tables().compute(2021, shapefile)
        return self.post_process(st, existing_statistics)

    def post_process(self, statistic_table, existing_statistics):
        del existing_statistics
        fractionalize(statistic_table, *self.internal_statistic_names_list())
        return statistic_table


class CensusCanadaIncomeIndividual(CensusCanadaSimple):
    def census_tables(self) -> CensusTables:
        return CensusTables(
            [
                "Total - Total income groups in 2020 for the population aged 15 years and over in private households - 100% data (21)",
            ],
            {
                None: [
                    "Total - Total income groups in 2020 for the population aged 15 years and over in private households - 100% data (21)",
                    "  Without total income",
                    "  With total income",
                    "      $100,000 to $149,999",
                    "      $150,000 and over",
                ],
                "individual_income_under_50cad": [
                    "    Under $10,000 (including loss)",
                    "    $10,000 to $19,999",
                    "    $20,000 to $29,999",
                    "    $30,000 to $39,999",
                    "    $40,000 to $49,999",
                ],
                "individual_income_50_to_100cad": [
                    "    $50,000 to $59,999",
                    "    $60,000 to $69,999",
                    "    $70,000 to $79,999",
                    "    $80,000 to $89,999",
                    "    $90,000 to $99,999",
                ],
                "individual_income_above_100_cad": [
                    "    $100,000 and over",
                ],
            },
            "population",
        )

    def name_for_each_statistic(self):
        return {
            "individual_income_under_50cad": "Individual income < C$50k %",
            "individual_income_50_to_100cad": "Individual income C$50k - C$100k %",
            "individual_income_above_100_cad": "Individual income > C$100k %",
        }

    def varname_for_each_statistic(self):
        return {
            "individual_income_under_50cad": "individual_income_under_50k_cad",
            "individual_income_50_to_100cad": "individual_income_50k_to_100k_cad",
            "individual_income_above_100_cad": "individual_income_over_100k_cad",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census-disaggregated")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                INCOME,
                {
                    "individual_income_under_50cad": "higher % of people who have individual income under C$50k",
                    "individual_income_above_100_cad": "higher % of people who have individual income over C$100k",
                },
            ),
            **QuizQuestionSkip.several("individual_income_50_to_100cad"),
        }


class CensusCanadaIncomeHousehold(CensusCanadaSimple):
    version = 2

    def census_tables(self) -> CensusTables:
        return CensusTables(
            [
                "Total - Household total income groups in 2020 for private households - 100% data (21)",
            ],
            {
                None: [
                    "Total - Household total income groups in 2020 for private households - 100% data (21)",
                    "    $100,000 to $124,999",
                    "    $125,000 to $149,999",
                    "    $150,000 to $199,999",
                    "    $200,000 and over",
                ],
                "household_income_under_50cad": [
                    "  Under $5,000",
                    "  $5,000 to $9,999",
                    "  $10,000 to $14,999",
                    "  $15,000 to $19,999",
                    "  $20,000 to $24,999",
                    "  $25,000 to $29,999",
                    "  $30,000 to $34,999",
                    "  $35,000 to $39,999",
                    "  $40,000 to $44,999",
                    "  $45,000 to $49,999",
                ],
                "household_income_50_to_100cad": [
                    "  $50,000 to $59,999",
                    "  $60,000 to $69,999",
                    "  $70,000 to $79,999",
                    "  $80,000 to $89,999",
                    "  $90,000 to $99,999",
                ],
                "household_income_above_100_cad": [
                    "  $100,000 and over",
                ],
            },
            "total_dwellings",
        )

    def name_for_each_statistic(self):
        return {
            "household_income_under_50cad": "Household income < C$50k %",
            "household_income_50_to_100cad": "Household income C$50k - C$100k %",
            "household_income_above_100_cad": "Household income > C$100k %",
        }

    def varname_for_each_statistic(self):
        return {
            "household_income_under_50cad": "income_under_50k",
            "household_income_50_to_100cad": "income_50k_to_100k",
            "household_income_above_100_cad": "income_over_100k",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census-disaggregated")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                INCOME,
                {
                    "household_income_under_50cad": "higher % of households that have household income under C$50k",
                    "household_income_above_100_cad": "higher % of households that have household income over C$100k",
                },
            ),
            **QuizQuestionSkip.several("household_income_50_to_100cad"),
        }


class CensusCanadaLICOAT(CensusCanadaSimple):
    version = 3

    def dependencies(self):
        return []

    def census_tables(self) -> CensusTables:
        # pylint: disable=line-too-long
        return CensusTables(
            [
                "In low income based on the Low-income cut-offs, after tax (LICO-AT)",
                (
                    "Total - LICO low-income status in 2020 for the population in private households to whom the low-income concept is applicable - 100% data (33)",
                    "universe: ",
                ),
            ],
            {
                None: [
                    "  0 to 17 years",
                    "    0 to 5 years",
                    "  18 to 64 years",
                    "  65 years and over",
                    "universe:   0 to 17 years",
                    "universe:     0 to 5 years",
                    "universe:   18 to 64 years",
                    "universe:   65 years and over",
                ],
                "lico_at_canada": [
                    "In low income based on the Low-income cut-offs, after tax (LICO-AT)",
                ],
                "lico_at_universe": [
                    "universe: Total - LICO low-income status in 2020 for the population in private households to whom the low-income concept is applicable - 100% data (33)",
                ],
            },
            "population",
        )

    def name_for_each_statistic(self):
        return {
            "lico_at_canada": "LICO-AT %",
        }

    def varname_for_each_statistic(self):
        return {
            "lico_at_canada": "low_income",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census-disaggregated")

    def quiz_question_descriptors(self):
        return QuizQuestionSkip.several("lico_at_canada")

    def post_process(self, statistic_table, existing_statistics):
        del existing_statistics
        statistic_table = statistic_table.copy()
        statistic_table.lico_at_canada = (
            statistic_table.lico_at_canada / statistic_table.lico_at_universe
        )
        del statistic_table["lico_at_universe"]
        return statistic_table


class CensusCanadaLIMAT(CensusCanadaSimple):
    version = 1

    def dependencies(self):
        return []

    def census_tables(self) -> CensusTables:
        # pylint: disable=line-too-long
        return CensusTables(
            [
                "In low income based on the Low-income measure, after tax (LIM-AT)",
                (
                    "Total - LIM low-income status in 2020 for the population in private households - 100% data (33)",
                    "universe: ",
                ),
            ],
            {
                None: [
                    "  0 to 17 years",
                    "    0 to 5 years",
                    "  18 to 64 years",
                    "  65 years and over",
                    "universe:   0 to 17 years",
                    "universe:     0 to 5 years",
                    "universe:   18 to 64 years",
                    "universe:   65 years and over",
                ],
                "lim_at_canada": [
                    "In low income based on the Low-income measure, after tax (LIM-AT)",
                ],
                "lim_at_universe": [
                    "universe: Total - LIM low-income status in 2020 for the population in private households - 100% data (33)",
                ],
            },
            "population",
        )

    def name_for_each_statistic(self):
        return {
            "lim_at_canada": "LIM-AT %",
        }

    def varname_for_each_statistic(self):
        return {
            "lim_at_canada": "low_income_lim",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census-disaggregated")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                POVERTY,
                {
                    "lim_at_canada": "higher % of people who are low income based on the Low-income measure, after tax (LIM-AT)",
                },
            ),
        }

    def post_process(self, statistic_table, existing_statistics):
        del existing_statistics
        statistic_table = statistic_table.copy()
        statistic_table.lim_at_canada = (
            statistic_table.lim_at_canada / statistic_table.lim_at_universe
        )
        del statistic_table["lim_at_universe"]
        return statistic_table


class CensusCanadaEducation(CensusCanadaSimple):
    version = 1

    def dependencies(self):
        return []

    def census_tables(self) -> CensusTables:
        # pylint: disable=line-too-long
        return CensusTables(
            [
                "Total - Highest certificate, diploma or degree for the population aged 25 to 64 years in private households - 25% sample data (165)",
            ],
            {
                None: [
                    "Total - Highest certificate, diploma or degree for the population aged 25 to 64 years in private households - 25% sample data (165)",
                    "  Postsecondary certificate, diploma or degree",
                    "      Apprenticeship or trades certificate or diploma",
                    "        Non-apprenticeship trades certificate or diploma (168)",
                    "        Apprenticeship certificate (169)",
                    "      College, CEGEP or other non-university certificate or diploma (170)",
                    "      University certificate or diploma below bachelor level",
                    "    Bachelor's degree or higher",
                ],
                "education_no_canada": [
                    "  No certificate, diploma or degree",
                ],
                "education_high_school_canada": [
                    "  High (secondary) school diploma or equivalency certificate (167)",
                    "    Postsecondary certificate or diploma below bachelor level",
                ],
                "education_ugrad_canada": [
                    "      Bachelor's degree",
                    "      University certificate or diploma above bachelor level",
                ],
                "education_grad_canada": [
                    "      Degree in medicine, dentistry, veterinary medicine or optometry",
                    "      Master's degree",
                    "      Earned doctorate (171)",
                ],
            },
            "population",
        )

    def name_for_each_statistic(self):
        return {
            "education_high_school_canada": "High school diploma [25-64] %",
            "education_ugrad_canada": "Bachelor's degree [25-64] %",
            "education_grad_canada": "Graduate degree [25-64] %",
        }

    def varname_for_each_statistic(self):
        return {
            "education_high_school_canada": "high_school_statcan",
            "education_ugrad_canada": "undergrad_statcan",
            "education_grad_canada": "graduate_statcan",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census-disaggregated")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                EDUCATION_LEVEL,
                {
                    "education_high_school_canada": "higher % of people between 25 and 64 who have at least a high school diploma",
                    "education_ugrad_canada": "higher % of people between 25 and 64 who have at least an undergrad degree",
                    "education_grad_canada": "higher % of people between 25 and 64 who have a graduate degree",
                },
            ),
        }

    def post_process(self, statistic_table, existing_statistics):
        del existing_statistics
        statistic_table = statistic_table.copy()
        total = (
            statistic_table.education_no_canada
            + statistic_table.education_high_school_canada
            + statistic_table.education_ugrad_canada
            + statistic_table.education_grad_canada
        )
        del statistic_table["education_no_canada"]
        # mutating in place. should not use .items()
        # pylint: disable=consider-iterating-dictionary
        for column in self.internal_statistic_names_list():
            statistic_table[column] = statistic_table[column] / total
        statistic_table["education_ugrad_canada"] += statistic_table[
            "education_grad_canada"
        ]
        statistic_table["education_high_school_canada"] += statistic_table[
            "education_ugrad_canada"
        ]
        return statistic_table


census_canada_simple = [
    CensusCanadaIncomeIndividual(),
    CensusCanadaIncomeHousehold(),
    CensusCanadaLICOAT(),
    CensusCanadaLIMAT(),
    CensusCanadaEducation(),
]
