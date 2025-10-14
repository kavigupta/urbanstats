import us

from urbanstats.acs.load import ACSDataEntityForMultipleLevels
from urbanstats.games.quiz_question_metadata import (
    INCOME_MEDIAN,
    QuizQuestionDescriptor,
)
from urbanstats.statistics.statistic_collection import GeoIDStatisticsACS


class IncomeMedian(GeoIDStatisticsACS):
    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("income")

    def name_for_each_statistic(self):
        return {
            "median_household_income": "Median Household Income (USD)",
        }

    def quiz_question_descriptors(self):
        return {
            "median_household_income": QuizQuestionDescriptor(
                "higher median household income", INCOME_MEDIAN
            )
        }

    def varname_for_each_statistic(self):
        return {
            "median_household_income": "median_household_income_usd",
        }

    def acs_data_entity_multi(self):
        return ACSDataEntityForMultipleLevels(
            "Median Family Income in the Past 12 Months (in 2023 Inflation-Adjusted Dollars)",
            [
                "state",
                "combined statistical area",
                "metropolitan statistical area/micropolitan statistical area",
                "county",
                "county subdivision",
                "place",
                "urban area",
                "zip code tabulation area",
            ],
            [],
            {
                "median_household_income": [
                    "Estimate!!Median family income in the past 12 months (in 2023 inflation-adjusted dollars)",
                ]
            },
            replace_negatives_with_nan=True,
            year=2023,
        )

    def allow_missing_geoid(self, census_level, geoid, name, population):
        state = lambda: us.states.lookup(geoid[:2])
        if population < 10000:
            return True
        if census_level in ["state", "county", "place"] and state() in [
            us.states.VI,
            us.states.AS,
            us.states.GU,
            us.states.MP,
        ]:
            return True
        if census_level in ["county subdivision"] and state() in [us.states.AR]:
            # For some reason some Arkansas county subdivisions are missing; this is fine
            return True
        if name in [
            "Brentwood CDP, New York, USA",
            "Louisville city, Kentucky, USA",
            "Wyandanch CDP, New York, USA",
            "Lee district [CCD], Fairfax County, Virginia, USA",
            # these zips correspond to the above CCDs. Some weird consistency here
            "11717, USA",
            "11798, USA",
            "98205, USA",
            "Laplace-Lutcher-Gramercy [Urban Area], LA, USA",
        ]:
            # idk why, but this is missing
            return True
        if (
            census_level
            == "metropolitan statistical area/micropolitan statistical area"
            or census_level == "combined statistical area"
        ):
            # a bunch of these are missing for unknown reasons
            return True
        return False
