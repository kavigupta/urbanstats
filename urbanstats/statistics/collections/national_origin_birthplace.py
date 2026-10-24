from urbanstats.acs.load import ACSDataEntity
from urbanstats.games.quiz_question_metadata import (
    NATIONAL_ORIGIN,
    QuizQuestionDescriptor,
)
from urbanstats.statistics.national_census import (
    ACSUSPRCounts,
    AustralianCounts,
    NationalCensusStatistics,
)

US_ONLY = ("birthplace_us_not_state", "birthplace_us_state")


class NationalOriginBirthplaceStatistics(NationalCensusStatistics):
    version = 1

    def legacy_statistic_names(self):
        return {"Born outside US %": "Born outside country %"}

    def name_for_each_statistic(self):
        return {
            "birthplace_non_us": "Born outside country %",
            "birthplace_us_not_state": "Born in us outside state %",
            "birthplace_us_state": "Born in state of residence %",
        }

    def unit_for_each_statistic(self):
        return self.same_for_each_name("percentage")

    def varname_for_each_statistic(self):
        return {
            "birthplace_non_us": "foreign_born",
            "birthplace_us_not_state": "born_outside_state",
            "birthplace_us_state": "born_in_state",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("birthplace")

    def quiz_question_descriptors(self):
        return QuizQuestionDescriptor.several(
            NATIONAL_ORIGIN,
            {
                "birthplace_non_us": "higher % of people who were born outside the country",
                "birthplace_us_not_state": "higher % of people who were born in the US and outside their state of residence",
                "birthplace_us_state": "higher % of people who were born in their state of residence",
            },
        )

    def countries_for_each_statistic(self):
        return {
            name: ("USA",) if name in US_ONLY else ("USA", "Australia")
            for name in self.internal_statistic_names_list()
        }

    def mutate_counts(self, counts):
        # each country only has its own columns, and a shapefile might have just one country
        for column in [*US_ONLY, "birthplace_in_australia"]:
            if column not in counts:
                counts[column] = 0
        total = (
            counts.birthplace_non_us
            + counts.birthplace_us_not_state
            + counts.birthplace_us_state
            + counts.birthplace_in_australia
        )
        for column in self.internal_statistic_names_list():
            counts[column] = counts[column] / total

    def country_inputs(self):
        return {
            "USA": ACSUSPRCounts(*self.acs_entities()),
            "Australia": AustralianCounts(
                {
                    "G01": {
                        "birthplace_non_us": ["Birthplace_Elsewhere_P"],
                        "birthplace_in_australia": ["Birthplace_Australia_P"],
                    }
                }
            ),
        }

    def acs_entities(self):
        return [
            ACSDataEntity(
                "PLACE OF BIRTH BY SEX IN THE UNITED STATES",
                "population",
                "tract",
                {
                    None: [
                        "Estimate!!Total:",
                        "Estimate!!Total:!!Born in other state in the United States:!!Female",
                        "Estimate!!Total:!!Born in other state in the United States:!!Male",
                        "Estimate!!Total:!!Born in state of residence:!!Female",
                        "Estimate!!Total:!!Born in state of residence:!!Male",
                        "Estimate!!Total:!!Female",
                        "Estimate!!Total:!!Foreign born:!!Female",
                        "Estimate!!Total:!!Foreign born:!!Male",
                        "Estimate!!Total:!!Male",
                        "Estimate!!Total:!!Native; born outside the United States:!!Female",
                        "Estimate!!Total:!!Native; born outside the United States:!!Male",
                    ],
                    "birthplace_non_us": [
                        "Estimate!!Total:!!Foreign born:",
                    ],
                    "birthplace_us_not_state": [
                        "Estimate!!Total:!!Native; born outside the United States:",
                        "Estimate!!Total:!!Born in other state in the United States:",
                    ],
                    "birthplace_us_state": [
                        "Estimate!!Total:!!Born in state of residence:",
                    ],
                },
            ),
            ACSDataEntity(
                "PLACE OF BIRTH BY SEX IN PUERTO RICO",
                "population",
                "tract",
                {
                    None: [
                        "Estimate!!Total:",
                        "Estimate!!Total:!!Born in Puerto Rico:!!Female",
                        "Estimate!!Total:!!Born in Puerto Rico:!!Male",
                        "Estimate!!Total:!!Born in the United States:!!Female",
                        "Estimate!!Total:!!Born in the United States:!!Male",
                        "Estimate!!Total:!!Female",
                        "Estimate!!Total:!!Foreign born:!!Female",
                        "Estimate!!Total:!!Foreign born:!!Male",
                        "Estimate!!Total:!!Male",
                        "Estimate!!Total:!!Native; born elsewhere:!!Female",
                        "Estimate!!Total:!!Native; born elsewhere:!!Male",
                    ],
                    "birthplace_non_us": [
                        "Estimate!!Total:!!Foreign born:",
                    ],
                    "birthplace_us_not_state": [
                        "Estimate!!Total:!!Native; born elsewhere:",
                        "Estimate!!Total:!!Born in the United States:",
                    ],
                    "birthplace_us_state": [
                        "Estimate!!Total:!!Born in Puerto Rico:",
                    ],
                },
            ),
        ]
