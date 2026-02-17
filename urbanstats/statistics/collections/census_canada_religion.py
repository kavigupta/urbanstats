from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.games.quiz_question_metadata import (
    RACE,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.statistic_collection import CanadaStatistics


class CensusCanadaReligion(CanadaStatistics):
    version = 4

    def census_tables(self) -> CensusTables:
        religion_table = "Total - Religion for the population in private households - 25% sample data (161)"
        return CensusTables(
            [religion_table],
            {
                "religion_total_canada": [
                    "Total - Religion for the population in private households - 25% sample data (161)"
                ],
                "religion_christian_canada": ["  Christian"],
                "religion_catholic_canada": ["    Catholic"],
                "religion_hindu_canada": ["  Hindu"],
                "religion_jewish_canada": ["  Jewish"],
                "religion_muslim_canada": ["  Muslim"],
                "religion_sikh_canada": ["  Sikh"],
                "religion_buddhist_canada": ["  Buddhist"],
                "religion_no_religion_canada": [
                    "  No religion and secular perspectives"
                ],
                None: [
                    "    Christian, n.o.s. (162)",
                    "    Anabaptist",
                    "    Anglican",
                    "    Baptist",
                    "    Christian Orthodox",
                    "    Jehovah's Witness",
                    "    Latter Day Saints",
                    "    Lutheran",
                    "    Methodist and Wesleyan (Holiness)",
                    "    Pentecostal and other Charismatic",
                    "    Presbyterian",
                    "    Reformed",
                    "    United Church",
                    "    Other Christian and Christian-related traditions",
                    "  Traditional (North American Indigenous) spirituality",
                    "  Other religions and spiritual traditions",
                ],
            },
            "population",
        )

    def name_for_each_statistic(self):
        return {
            "religion_catholic_canada": "Catholic % [StatCan]",
            "religion_protestant_canada": "Protestant (non-Catholic Christian) % [StatCan]",
            "religion_hindu_canada": "Hindu % [StatCan]",
            "religion_jewish_canada": "Jewish % [StatCan]",
            "religion_muslim_canada": "Muslim % [StatCan]",
            "religion_sikh_canada": "Sikh % [StatCan]",
            "religion_buddhist_canada": "Buddhist % [StatCan]",
            "religion_no_religion_canada": "No religion % [StatCan]",
            "religion_other_canada": "Other religion % [StatCan]",
        }

    def varname_for_each_statistic(self):
        return {
            "religion_catholic_canada": "religion_catholic",
            "religion_protestant_canada": "religion_protestant",
            "religion_hindu_canada": "religion_hindu",
            "religion_jewish_canada": "religion_jewish",
            "religion_muslim_canada": "religion_muslim",
            "religion_sikh_canada": "religion_sikh",
            "religion_buddhist_canada": "religion_buddhist",
            "religion_no_religion_canada": "religion_no",
            "religion_other_canada": "religion_other",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census-disaggregated")

    def quiz_question_descriptors(self):
        return {
            **QuizQuestionDescriptor.several(
                RACE,
                {
                    "religion_catholic_canada": "higher % of people who are Catholic",
                    "religion_protestant_canada": "higher % of people who are Protestant",
                    "religion_hindu_canada": "higher % of people who are Hindu",
                    "religion_sikh_canada": "higher % of people who are Sikh",
                    "religion_muslim_canada": "higher % of people who are Muslim",
                    "religion_no_religion_canada": "higher % of people with no religion",
                },
            ),
            **QuizQuestionSkip.several(
                "religion_jewish_canada",
                "religion_buddhist_canada",
                "religion_other_canada",
            ),
        }

    def compute_statistics_dictionary_canada(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        del existing_statistics, shapefile_table
        table = self.census_tables().compute(2021, shapefile)
        table["religion_protestant_canada"] = (
            table["religion_christian_canada"] - table["religion_catholic_canada"]
        )
        del table["religion_christian_canada"]
        total = table["religion_total_canada"]
        del table["religion_total_canada"]
        assert {"religion_other_canada", *table.columns} == set(
            self.internal_statistic_names_list()
        )
        for col in table.columns:
            table[col] = table[col] / total
        table["religion_other_canada"] = 1 - table.sum(axis=1)
        return table
