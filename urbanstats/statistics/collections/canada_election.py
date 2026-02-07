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


class CanadaElectionStatistics(CanadaStatistics):
    version = 4

    def name_for_each_statistic(self):
        result = {}
        for elect in canada_elections:
            # Per-party vote shares
            result[(elect.name, "V_LIB")] = f"{elect.name} Lib %"
            result[(elect.name, "V_CON")] = f"{elect.name} Con %"
            result[(elect.name, "V_NDP")] = f"{elect.name} NDP %"
            result[(elect.name, "V_BQ")] = f"{elect.name} BQ %"
            result[(elect.name, "V_GRN")] = f"{elect.name} Grn %"
            # PPC didn't exist in 2015
            if elect.name != "2015GE":
                result[(elect.name, "V_PPC")] = f"{elect.name} PPC %"
            # 2-Coalition Margin
            result[(elect.name, "coalition_margin")] = f"{elect.name} 2-Coalition Margin"
        
        # Swings between elections
        result[("2015-2019 Swing", "coalition_margin")] = "2015-2019 Swing 2-Coalition Margin"
        result[("2019-2021 Swing", "coalition_margin")] = "2019-2021 Swing 2-Coalition Margin"
        result[("2021-2025 Swing", "coalition_margin")] = "2021-2025 Swing 2-Coalition Margin"
        result[("2015-2019 Swing", "V_LIB")] = "2015-2019 Swing Lib %"
        result[("2019-2021 Swing", "V_LIB")] = "2019-2021 Swing Lib %"
        result[("2021-2025 Swing", "V_LIB")] = "2021-2025 Swing Lib %"
        result[("2015-2019 Swing", "V_CON")] = "2015-2019 Swing Con %"
        result[("2019-2021 Swing", "V_CON")] = "2019-2021 Swing Con %"
        result[("2021-2025 Swing", "V_CON")] = "2021-2025 Swing Con %"
        result[("2015-2019 Swing", "V_NDP")] = "2015-2019 Swing NDP %"
        result[("2019-2021 Swing", "V_NDP")] = "2019-2021 Swing NDP %"
        result[("2021-2025 Swing", "V_NDP")] = "2021-2025 Swing NDP %"
        
        return result

    def varname_for_each_statistic(self):
        result = {}
        for elect in canada_elections:
            name_key = elect.name.lower()
            result[(elect.name, "V_LIB")] = f"canada_{name_key}_lib_voteshare"
            result[(elect.name, "V_CON")] = f"canada_{name_key}_con_voteshare"
            result[(elect.name, "V_NDP")] = f"canada_{name_key}_ndp_voteshare"
            result[(elect.name, "V_BQ")] = f"canada_{name_key}_bq_voteshare"
            result[(elect.name, "V_GRN")] = f"canada_{name_key}_grn_voteshare"
            # PPC didn't exist in 2015
            if elect.name != "2015GE":
                result[(elect.name, "V_PPC")] = f"canada_{name_key}_ppc_voteshare"
            result[(elect.name, "coalition_margin")] = f"canada_{name_key}_coalition_margin"
        
        # Swings
        result[("2015-2019 Swing", "coalition_margin")] = "canada_swing_2015_2019_coalition_margin"
        result[("2019-2021 Swing", "coalition_margin")] = "canada_swing_2019_2021_coalition_margin"
        result[("2021-2025 Swing", "coalition_margin")] = "canada_swing_2021_2025_coalition_margin"
        result[("2015-2019 Swing", "V_LIB")] = "canada_swing_2015_2019_lib"
        result[("2019-2021 Swing", "V_LIB")] = "canada_swing_2019_2021_lib"
        result[("2021-2025 Swing", "V_LIB")] = "canada_swing_2021_2025_lib"
        result[("2015-2019 Swing", "V_CON")] = "canada_swing_2015_2019_con"
        result[("2019-2021 Swing", "V_CON")] = "canada_swing_2019_2021_con"
        result[("2021-2025 Swing", "V_CON")] = "canada_swing_2021_2025_con"
        result[("2015-2019 Swing", "V_NDP")] = "canada_swing_2015_2019_ndp"
        result[("2019-2021 Swing", "V_NDP")] = "canada_swing_2019_2021_ndp"
        result[("2021-2025 Swing", "V_NDP")] = "canada_swing_2021_2025_ndp"
        
        return result

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("election")

    def quiz_question_descriptors(self):
        descriptors = {}
        
        # Map short names to full names for quiz questions
        full_names = {
            "2025GE": "the 2025 Canadian general election",
            "2021GE": "the 2021 Canadian general election",
            "2019GE": "the 2019 Canadian general election",
            "2015GE": "the 2015 Canadian general election",
        }
        
        # Add questions for LIB, CON, and NDP vote shares
        for elect in canada_elections:
            full_name = full_names.get(elect.name, elect.name)
            descriptors[
                (elect.name, "V_LIB")
            ] = f"!FULL Which voted more for the Liberal Party in {full_name}?"
            descriptors[
                (elect.name, "V_CON")
            ] = f"!FULL Which voted more for the Conservative Party in {full_name}?"
            descriptors[
                (elect.name, "V_NDP")
            ] = f"!FULL Which voted more for the NDP in {full_name}?"
        
        # Mark the rest as skips
        skip_keys = []
        for elect in canada_elections:
            skip_keys.append((elect.name, "V_BQ"))
            skip_keys.append((elect.name, "V_GRN"))
            # PPC didn't exist in 2015
            if elect.name != "2015GE":
                skip_keys.append((elect.name, "V_PPC"))
            skip_keys.append((elect.name, "coalition_margin"))
        
        # Mark all swings as skips
        skip_keys.extend([
            ("2015-2019 Swing", "coalition_margin"),
            ("2019-2021 Swing", "coalition_margin"),
            ("2021-2025 Swing", "coalition_margin"),
            ("2015-2019 Swing", "V_LIB"),
            ("2019-2021 Swing", "V_LIB"),
            ("2021-2025 Swing", "V_LIB"),
            ("2015-2019 Swing", "V_CON"),
            ("2019-2021 Swing", "V_CON"),
            ("2021-2025 Swing", "V_CON"),
            ("2015-2019 Swing", "V_NDP"),
            ("2019-2021 Swing", "V_NDP"),
            ("2021-2025 Swing", "V_NDP"),
        ])
                
        return {**QuizQuestionDescriptor.several(ELECTION, descriptors), **QuizQuestionSkip.several(*skip_keys)}

    def compute_statistics_dictionary_canada(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        table = aggregated_election_results_canada(shapefile)
        result = {}
        
        # Track which elections actually have data
        elections_with_data = set()
        
        for elect_k in canada_elections:
            total_col = (elect_k.name, "total")
            if total_col not in table.columns:
                continue
            
            elections_with_data.add(elect_k.name)
            total = table[total_col]
            
            # Calculate vote shares for each party
            # PPC didn't exist in 2015
            party_cols = ["V_LIB", "V_CON", "V_NDP", "V_BQ", "V_GRN"]
            if elect_k.name != "2015GE":
                party_cols.append("V_PPC")
            
            for party_col in party_cols:
                party_key = (elect_k.name, party_col)
                if party_key in table.columns:
                    result[party_key] = table[party_key] / total
            
            # Calculate 2-Coalition Margin: (LIB + NDP + BQ + GRN) - (CON + PPC)
            # Note: PPC didn't exist in 2015, so for 2015 it's just (LIB + NDP + BQ + GRN) - CON
            coalition_left = 0
            coalition_right = 0
            
            if (elect_k.name, "V_LIB") in table.columns:
                coalition_left += table[(elect_k.name, "V_LIB")]
            if (elect_k.name, "V_NDP") in table.columns:
                coalition_left += table[(elect_k.name, "V_NDP")]
            if (elect_k.name, "V_BQ") in table.columns:
                coalition_left += table[(elect_k.name, "V_BQ")]
            if (elect_k.name, "V_GRN") in table.columns:
                coalition_left += table[(elect_k.name, "V_GRN")]
            
            if (elect_k.name, "V_CON") in table.columns:
                coalition_right += table[(elect_k.name, "V_CON")]
            if elect_k.name != "2015GE" and (elect_k.name, "V_PPC") in table.columns:
                coalition_right += table[(elect_k.name, "V_PPC")]
            
            result[(elect_k.name, "coalition_margin")] = (coalition_left - coalition_right) / total

        # Calculate swings between elections (only for elections that have data)
        # Coalition margin swings
        if "2015GE" in elections_with_data and "2019GE" in elections_with_data:
            if ("2015GE", "coalition_margin") in result and ("2019GE", "coalition_margin") in result:
                result[("2015-2019 Swing", "coalition_margin")] = (
                    result[("2019GE", "coalition_margin")] - result[("2015GE", "coalition_margin")]
                )
        
        if "2019GE" in elections_with_data and "2021GE" in elections_with_data:
            if ("2019GE", "coalition_margin") in result and ("2021GE", "coalition_margin") in result:
                result[("2019-2021 Swing", "coalition_margin")] = (
                    result[("2021GE", "coalition_margin")] - result[("2019GE", "coalition_margin")]
                )
        
        if "2021GE" in elections_with_data and "2025GE" in elections_with_data:
            if ("2021GE", "coalition_margin") in result and ("2025GE", "coalition_margin") in result:
                result[("2021-2025 Swing", "coalition_margin")] = (
                    result[("2025GE", "coalition_margin")] - result[("2021GE", "coalition_margin")]
                )
        
        # Party vote share swings (LIB, CON, NDP)
        for party in ["V_LIB", "V_CON", "V_NDP"]:
            if "2015GE" in elections_with_data and "2019GE" in elections_with_data:
                if ("2015GE", party) in result and ("2019GE", party) in result:
                    result[("2015-2019 Swing", party)] = (
                        result[("2019GE", party)] - result[("2015GE", party)]
                    )
            
            if "2019GE" in elections_with_data and "2021GE" in elections_with_data:
                if ("2019GE", party) in result and ("2021GE", party) in result:
                    result[("2019-2021 Swing", party)] = (
                        result[("2021GE", party)] - result[("2019GE", party)]
                    )
            
            if "2021GE" in elections_with_data and "2025GE" in elections_with_data:
                if ("2021GE", party) in result and ("2025GE", party) in result:
                    result[("2021-2025 Swing", party)] = (
                        result[("2025GE", party)] - result[("2021GE", party)]
                    )

        return result

