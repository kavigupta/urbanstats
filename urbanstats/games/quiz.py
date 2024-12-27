import copy
import json
import os
import shutil
from datetime import datetime

import numpy as np
import pytz
import tqdm.auto as tqdm
from permacache import stable_hash

from urbanstats.games.quiz_columns import stat_to_quiz_name
from urbanstats.games.quiz_sampling import sample_quiz
from urbanstats.statistics.output_statistics_metadata import (
    statistic_internal_to_display_name,
)
from urbanstats.statistics.stat_path import get_statistic_column_path

from .fixed import juxtastat as fixed_up_to
from .quiz_custom import get_custom_quizzes


def generate_quiz(seed):
    if isinstance(seed, tuple) and seed[0] == "daily":
        check_quiz_is_guaranteed_future(seed[1])
        cq = get_custom_quizzes()
        if seed[1] in cq:
            return cq[seed[1]]

    rng = np.random.default_rng(int(stable_hash(seed), 16))
    return sample_quiz(rng)


def full_quiz(seed):
    res = generate_quiz(seed)
    return finish_quiz(res)


def finish_quiz(res):
    res = copy.deepcopy(res)
    outs = []
    for q in res:
        out = {}
        stat_column_original = q.pop("stat_column_original")
        out["stat_column"] = statistic_internal_to_display_name()[stat_column_original]
        out["stat_path"] = get_statistic_column_path(stat_column_original)
        out["question"] = stat_to_quiz_name()[stat_column_original]
        out.update(q)
        outs.append(out)
    return outs


def check_quiz_is_guaranteed_future(number):
    fractional_days = compute_fractional_days("Pacific/Kiritimati")
    if number <= fractional_days:
        raise RuntimeError(
            f"Quiz {number} is in the past! It is currently {fractional_days} in Kiribati + 4 hours."
        )


def quiz_is_guaranteed_past(number):
    fractional_days = compute_fractional_days("US/Samoa")
    if number < fractional_days - 1:
        return None
    return fractional_days


def compute_fractional_days(tz):
    now = datetime.now(pytz.timezone(tz))
    beginning = pytz.timezone(tz).localize(datetime(2023, 9, 2))
    fractional_days = (now - beginning).total_seconds() / (24 * 60 * 60)
    return fractional_days


def check_quiz_is_guaranteed_past(number):
    fractional_days = quiz_is_guaranteed_past(number)
    if fractional_days is not None:
        raise RuntimeError(
            f"Quiz {number} is not necessarily yet done! It is currently {fractional_days} in Samoa"
        )


def generate_quizzes(folder):
    def path(day):
        return os.path.join(folder, f"{day}")

    for i in range(fixed_up_to + 1):
        shutil.copy(f"quiz_old/{i}", path(i))
    for i in tqdm.trange(fixed_up_to + 1, 365 * 3):
        outs = full_quiz(("daily", i))
        with open(path(i), "w") as f:
            json.dump(outs, f)


def display_question(question):
    if question.startswith("!FULL"):
        return question[6:]
    return f"Which has a {question}?"


def discordify_question(question):
    return "\n".join(
        [
            display_question(question["question"]),
            "a) " + question["longname_a"],
            "b) " + question["longname_b"],
            "||" + ("a" if question["stat_a"] > question["stat_b"] else "b") + "||",
        ]
    )


def discordify(quiz):
    return "\n\n".join(discordify_question(q) for q in quiz)


renamed = {
    "higher housing units per adult": "housing_per_pop",
    "higher % of people who are born in the us outside their state of residence": "birthplace_us_not_state",
    "higher % of people who have commute time < 15 min": "transportation_commute_time_under_15",
    "higher % of people who have commute time > 60 min": "transportation_commute_time_over_60",
    "higher % of people who have household income > $100k": "household_income_over_100k",
    "higher % of people who have individual income > $100k": "individual_income_over_100k",
    "higher % of people who have household income < $50k": "household_income_under_50k",
    "higher % of people who have individual income < $50k": "individual_income_under_50k",
    "higher % of people who are non-citizens": "citizenship_not_citizen",
    "higher % of people who are citizens by birth": "citizenship_citizen_by_birth",
    "higher % of people who are citizens by naturalization": "citizenship_citizen_by_naturalization",
    "higher % of units with 2br rent < $750": "rent_2br_under_750",
    "higher % of units with 2br rent > $1500": "rent_2br_over_1500",
    "higher % of units with 1br rent < $750": "rent_1br_under_750",
    "higher % of units with 1br rent > $1500": "rent_1br_over_1500",
    "higher % of people who have a humanities degree": "education_field_humanities",
    "higher % of all people with a humanities degree (as a percentage of the overall population)": "education_field_humanities",
    "higher % of people who have a business degree": "education_field_business",
    "higher % of all people with a business degree (as a percentage of the overall population)": "education_field_business",
    "higher % of people who have a stem degree": "education_field_stem",
    "higher % of all people with a stem degree (as a percentage of the overall population)": "education_field_stem",
    "higher mean ditance to the nearest EPA superfund site": "mean_dist_Active Superfund Site_updated",
    "higher mean distance to the nearest EPA superfund site": "mean_dist_Active Superfund Site_updated",
    "more democratic in the 2020 presidential election": (
        "2020 Presidential Election",
        "margin",
    ),
    "more democratic in the 2016 presidential election": (
        "2016 Presidential Election",
        "margin",
    ),
    "more democratic in 2016 presidential election": (
        "2016 Presidential Election",
        "margin",
    ),
    "more democratic in 2016-2020 swing": ("2016-2020 Swing", "margin"),
    "higher % of people who have a high school diploma": "education_high_school",
    "higher % of people who have an undergrad degree": "education_ugrad",
    "higher % of people who have a graduate degree": "education_grad",
    "higher % of people who have rent/income > 40%": "rent_burden_over_40",
    "higher % of people who have rent/income < 20%": "rent_burden_under_20",
    "higher mean distance to the nearest airport": "mean_dist_Airport_updated",
    "higher mean distance to nearest hospital": "mean_dist_Hospital_updated",
    "higher mean distance to the nearest hospital": "mean_dist_Hospital_updated",
    "higher mean distance to the nearest superfund site": "mean_dist_Active Superfund Site_updated",
    "higher mean distance to the nearest public school": "mean_dist_Public School_updated",
    "higher % of people who are born outside the us": "birthplace_non_us",
    "higher % of people who are born in the us": "birthplace_us_state",
    "higher % of people who are born in the us in their state of residence": "birthplace_us_state",
    "higher % of households who have household income > $100k": "household_income_over_100k",
    "higher % of households who have household income < $50k": "household_income_under_50k",
    "higher population-weighted mean % of parkland within 1km": "park_percent_1km_v2",
    "!FULL Which has more hours of sun per day on average?": "hours_sunny_4",
    "higher rainfall": "rainfall_4",
    "higher mean daily high temperature": "mean_high_temp_4",
    "higher % of days with high temp < 40": "days_below_40_4",
    "higher % of days with high temp under 40°F (population weighted)": "days_below_40_4",
    "higher % of people who were born in the us and born outside their state of residence": "birthplace_us_not_state",
    "!FULL Which has less exposure to EPA superfund sites (higher population-weighted mean distance)?": "mean_dist_Active Superfund Site_updated",
    # pylint: disable=line-too-long
    "higher % of workers employed as health diagnosing and treating practitioners and other technical occupations": "occupation_health_diagnosing_and_treating_practitioners_and_other_technical_occupations",
    "higher % of workers employed as legal occupations": "occupation_legal_occupations",
    "higher % of workers employed as management occupations": "occupation_management_occupations",
    "higher % change in population from 2010 to 2020": "population_change_2010",
    "higher % change in population-weighted density (r=1km) from 2010 to 2020": "ad_1_change_2010",
    "higher % of adults with smoke": "CSMOKING_cdc_2",
    "% of people who are gay and cohabiting with a partner/spouse": "sors_cohabiting_partnered_gay",
    "increase in racial homogeneity from 2010 to 2020": "homogeneity_250_diff_2010",
}
