from urbanstats.data.canada_election_data import (
    aggregated_election_results_canada,
    canada_elections,
)
from urbanstats.games.quiz_question_metadata import (
    ELECTION,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.statistic_collection import CanadaStatistics

COALITION_TOOLTIP = (
    "!TOOLTIP By 2-Coalition Margin, which is calculated as "
    + "(Lib + NDP + Grn) - (Con + PPC). BQ is excluded from the coalition margin calculation."
)


class CanadaElectionStatistics(CanadaStatistics):
    version = 9

    def name_for_each_statistic(self):
        result = {}
        for elect in canada_elections:
            name = f"{elect.year}GE"
            # Per-party vote shares
            result[(name, "V_LIB")] = f"{name} Lib %"
            result[(name, "V_CON")] = f"{name} Con %"
            result[(name, "V_NDP")] = f"{name} NDP %"
            result[(name, "V_BQ")] = f"{name} BQ %"
            result[(name, "V_GRN")] = f"{name} Grn %"
            # PPC didn't exist in 2015
            if elect.year != 2015:
                result[(name, "V_PPC")] = f"{name} PPC %"
            # 2-Coalition Margin
            result[(name, "coalition_margin")] = f"{name} 2-Coalition Margin"

        # Swings between elections (automatically generated from consecutive pairs)
        for elect1, elect2 in zip(canada_elections, canada_elections[1:]):
            swing_name = f"{elect1.year}-{elect2.year} Swing"

            # Coalition margin swing
            result[
                (swing_name, "coalition_margin")
            ] = f"{swing_name} 2-Coalition Margin"

            # Party swings (all parties that exist in both elections)
            for party_col, party_name in [
                ("V_LIB", "Lib"),
                ("V_CON", "Con"),
                ("V_NDP", "NDP"),
                ("V_BQ", "BQ"),
                ("V_GRN", "Grn"),
            ]:
                result[(swing_name, party_col)] = f"{swing_name} {party_name} %"

            # PPC didn't exist in 2015, so skip 2015-2019 swing for PPC
            if elect1.year != 2015:
                result[(swing_name, "V_PPC")] = f"{swing_name} PPC %"

        return result

    def varname_for_each_statistic(self):
        result = {}
        for elect in canada_elections:
            name = f"{elect.year}GE"
            name_key = name.lower()
            result[(name, "V_LIB")] = f"canada_{name_key}_lib_voteshare"
            result[(name, "V_CON")] = f"canada_{name_key}_con_voteshare"
            result[(name, "V_NDP")] = f"canada_{name_key}_ndp_voteshare"
            result[(name, "V_BQ")] = f"canada_{name_key}_bq_voteshare"
            result[(name, "V_GRN")] = f"canada_{name_key}_grn_voteshare"
            # PPC didn't exist in 2015
            if elect.year != 2015:
                result[(name, "V_PPC")] = f"canada_{name_key}_ppc_voteshare"
            result[(name, "coalition_margin")] = f"canada_{name_key}_coalition_margin"

        # Swings (automatically generated from consecutive pairs)
        for elect1, elect2 in zip(canada_elections, canada_elections[1:]):
            swing_name = f"{elect1.year}-{elect2.year} Swing"

            # Coalition margin swing
            result[
                (swing_name, "coalition_margin")
            ] = f"canada_swing_{elect1.year}_{elect2.year}_coalition_margin"

            # Party swings
            for party_col, party_abbr in [
                ("V_LIB", "lib"),
                ("V_CON", "con"),
                ("V_NDP", "ndp"),
                ("V_BQ", "bq"),
                ("V_GRN", "grn"),
            ]:
                result[
                    (swing_name, party_col)
                ] = f"canada_swing_{elect1.year}_{elect2.year}_{party_abbr}"

            # PPC didn't exist in 2015, so skip 2015-2019 swing for PPC
            if elect1.year != 2015:
                result[
                    (swing_name, "V_PPC")
                ] = f"canada_swing_{elect1.year}_{elect2.year}_ppc"

        return result

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("election")

    def quiz_question_descriptors(self):
        descriptors = {}

        # Add questions only for 2-Coalition Margin
        for elect in canada_elections:
            name = f"{elect.year}GE"
            full_name = f"the {elect.year} Canadian general election"
            descriptors[(name, "coalition_margin")] = (
                f"!FULL Which voted more for the left-of-center parties in {full_name}?"
                + COALITION_TOOLTIP
            )

        for elect1, elect2 in zip(canada_elections, canada_elections[1:]):
            swing_name = f"{elect1.year}-{elect2.year} Swing"
            descriptors[(swing_name, "coalition_margin")] = (
                "!FULL Which swung less towards the right-of-center parties "
                + f"between the {elect1.year} and {elect2.year} elections?"
                + COALITION_TOOLTIP
            )

        skip_keys = sorted(set(self.name_for_each_statistic()) - set(descriptors))

        return {
            **QuizQuestionDescriptor.several(ELECTION, descriptors),
            **QuizQuestionSkip.several(*skip_keys),
        }

    def compute_statistics_dictionary_canada(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        # pylint: disable=too-many-locals
        table = aggregated_election_results_canada(shapefile)
        result = {}

        # Track which elections actually have data
        elections_with_data = set()

        for elect_k in canada_elections:
            name = f"{elect_k.year}GE"
            total_col = (name, "total")
            if total_col not in table.columns:
                continue

            elections_with_data.add(name)
            total = table[total_col]

            # Calculate vote shares for each party
            # PPC didn't exist in 2015
            party_cols = ["V_LIB", "V_CON", "V_NDP", "V_BQ", "V_GRN"]
            if elect_k.year != 2015:
                party_cols.append("V_PPC")

            for party_col in party_cols:
                party_key = (name, party_col)
                if party_key in table.columns:
                    result[party_key] = table[party_key] / total

            # Calculate 2-Coalition Margin: (LIB + NDP + GRN) - (CON + PPC)
            # Note: PPC didn't exist in 2015, so for 2015 it's just (LIB + NDP + GRN) - CON
            # BQ is excluded from the coalition margin
            raw_vote_margin = 0

            raw_vote_margin += table[(name, "V_LIB")]
            raw_vote_margin += table[(name, "V_NDP")]
            raw_vote_margin += table[(name, "V_GRN")]
            raw_vote_margin -= table[(name, "V_CON")]
            raw_vote_margin -= table[(name, "V_PPC")] if elect_k.year != 2015 else 0
            result[(name, "coalition_margin")] = raw_vote_margin / total

        # Calculate swings between elections (automatically generated from consecutive pairs)
        for elect1, elect2 in zip(canada_elections, canada_elections[1:]):
            name1 = f"{elect1.year}GE"
            name2 = f"{elect2.year}GE"
            swing_name = f"{elect1.year}-{elect2.year} Swing"

            # Only compute swings if both elections have data
            if name1 not in elections_with_data or name2 not in elections_with_data:
                continue

            # Coalition margin swing
            if (name1, "coalition_margin") in result and (
                name2,
                "coalition_margin",
            ) in result:
                result[(swing_name, "coalition_margin")] = (
                    result[(name2, "coalition_margin")]
                    - result[(name1, "coalition_margin")]
                )

            # Party vote share swings (all parties that exist in both elections)
            for party in ["V_LIB", "V_CON", "V_NDP", "V_BQ", "V_GRN", "V_PPC"]:
                if party == "V_PPC" and (elect1.year == 2015 or elect2.year == 2015):
                    # Skip PPC swing if either election is 2015 (PPC didn't exist)
                    continue
                if (name1, party) in result and (name2, party) in result:
                    result[(swing_name, party)] = (
                        result[(name2, party)] - result[(name1, party)]
                    )

        return result
