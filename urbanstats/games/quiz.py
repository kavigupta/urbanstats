import base64
import copy
import gzip
import json
import os
import shutil
import urllib
from datetime import datetime

import numpy as np
import pandas as pd
import pytz
import tqdm.auto as tqdm
from permacache import permacache, stable_hash

from urbanstats.games.quiz_columns import stats_to_display, types
from urbanstats.geometry.relationship import states_for_all
from urbanstats.geometry.shapefiles.shapefiles_list import (
    american_to_international,
    filter_table_for_type,
)
from urbanstats.shortener import shorten
from urbanstats.statistics.collections_list import statistic_collections
from urbanstats.statistics.output_statistics_metadata import (
    get_statistic_categories,
    get_statistic_column_path,
    internal_statistic_names,
    statistic_internal_to_display_name,
)
from urbanstats.website_data.sharding import create_filename
from urbanstats.website_data.statistic_index_lists import index_list_for_longname
from urbanstats.website_data.table import shapefile_without_ordinals

from .fixed import juxtastat as fixed_up_to
from .quiz_columns import categories, stats, stats_to_display, types
from .quiz_custom import get_custom_quizzes

min_pop = 250_000
min_pop_international = 2_500_000
version_numeric = 67

version = str(version_numeric) + stable_hash(statistic_collections)

# ranges = [
#     (0.7, 1),
#     (0.5, 0.7),
#     (0.35, 0.5),
#     (0.25, 0.35),
#     (0.25 * 0.7, 0.25),
# ]

ranges = [
    (200, 500),
    (125, 200),
    (75, 125),
    (40, 75),
    (5, 40),
]

difficulties = {
    "education": 0.5,
    "election": 3,
    "feature": 1.5,
    "generation": 2,
    "housing": 1.5,
    "2010": 1.5,
    "2000": 1.5,
    "health": 1.5,
    "climate": 1.5,
    "relationships": 0.5,
    "income": 0.6,
    "main": 0.25,
    "misc": 2,
    "national_origin": 1.5,
    "race": 0.75,
    "transportation": 3,
    "industry": 2,
    "occupation": 2,
    "weather": 0.3,
}

skip_category_probs = {
    "industry": 0.75,
    "occupation": 0.75,
}


def pct_diff(x, y):
    if np.isnan(x) or np.isnan(y):
        return 0
    return abs(x - y) / min(abs(y), abs(y)) * 100


def randomize_q(rng, q):
    q = copy.deepcopy(q)
    if rng.choice(2):
        q["longname_a"], q["longname_b"] = q["longname_b"], q["longname_a"]
        q["stat_a"], q["stat_b"] = q["stat_b"], q["stat_a"]
    return q


def randomize_quiz(rng, quiz):
    return [randomize_q(rng, q) for q in quiz]


def sample_quiz(rng):
    banned_categories = []
    banned_types = []
    if rng.uniform() < 0.75:
        banned_types.append("Judicial Circuit")
    if rng.uniform() < 0.35:
        banned_types.append("Media Market")
    if rng.uniform() < 0.5:
        banned_types.append("international")
    result = []
    for r in ranges:
        typ, question = sample_quiz_question(rng, banned_categories, banned_types, *r)
        banned_categories.append(
            get_statistic_categories()[question["stat_column_original"]]
        )
        banned_types.append(type_ban_categorize(typ))
        result.append(question)
    result = randomize_quiz(rng, result)
    return result


def difficulty_multiplier(stat_column_original, typ):
    if is_international(typ):
        return 4
    return difficulties[get_statistic_categories()[stat_column_original]]


def compute_difficulty(stat_a, stat_b, stat_column_original, typ):
    diff = pct_diff(stat_a, stat_b)
    if diff > ranges[0][1]:
        return float("inf")
    diff = diff / difficulty_multiplier(stat_column_original, typ)
    if "mean_high_temp" in stat_column_original:
        diff = diff / 0.25
    return diff


def same_state(a, b):
    sfa = states_for_all()
    return set(sfa[a]) & set(sfa[b]) != set()


def is_international(typ):
    return typ in {"Country", "Subnational Region", "Urban Center"}


def sample_quiz_question(
    rng, banned_categories, banned_type_categories, distance_pct_bot, distance_pct_top
):
    while True:
        typ = rng.choice(types)
        if type_ban_categorize(typ) in banned_type_categories:
            continue
        at_pop = filter_for_pop(typ)
        stat_column_original = rng.choice(at_pop.columns)
        cat = get_statistic_categories()[stat_column_original]
        p_skip = skip_category_probs.get(cat, 0)
        if rng.uniform() < p_skip:
            continue
        if cat in banned_categories:
            continue
        for _ in range(1000):
            a, b = rng.choice(at_pop.index, size=2)
            if typ == "State":
                if "District of Columbia, USA" in (a, b):
                    continue
            if same_state(a, b):
                continue
            stat_a, stat_b = (
                at_pop.loc[a][stat_column_original],
                at_pop.loc[b][stat_column_original],
            )
            stat_a, stat_b = float(stat_a), float(stat_b)
            if np.isnan(stat_a) or np.isnan(stat_b) or stat_a == 0 or stat_b == 0:
                continue
            diff = compute_difficulty(stat_a, stat_b, stat_column_original, typ)
            if distance_pct_bot <= diff <= distance_pct_top:
                return typ, dict(
                    stat_column_original=stat_column_original,
                    longname_a=a,
                    longname_b=b,
                    stat_a=stat_a,
                    stat_b=stat_b,
                )
        print("FAILED", typ, stat_column_original, distance_pct_bot, distance_pct_top)


@permacache(f"urbanstats/games/quiz/filter_for_pop_{version}")
def filter_for_pop(typ):
    full = shapefile_without_ordinals()
    filt = filter_table_for_type(full, typ)
    at_pop = filt[filt.best_population_estimate >= minimum_population(typ)].set_index(
        "longname"
    )
    # make sure to only include the appropriate columns
    idxs = index_list_for_longname(
        "" if is_international(typ) else "USA",
        american_to_international.get(typ, typ),
        strict_display=True,
    )
    stats_filter = {internal_statistic_names()[i] for i in idxs}
    at_pop = pd.DataFrame({s: at_pop[s] for s in stats if s in stats_filter})
    mask = ~at_pop.applymap(np.isnan).all()
    assert mask.all()
    at_pop = at_pop.loc[:, mask]
    return at_pop


def entire_table():
    return pd.concat(
        [
            filter_for_pop(type)
            for type in types
            if type not in american_to_international
        ]
    )


def minimum_population(typ):
    if is_international(typ):
        return min_pop_international
    return min_pop


@permacache(f"urbanstats/games/quiz/generate_quiz_{version}")
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
    res = copy.deepcopy(res)
    outs = []
    for q in res:
        out = {}
        stat_column_original = q.pop("stat_column_original")
        out["stat_column"] = statistic_internal_to_display_name()[stat_column_original]
        out["question"] = stats_to_display[stat_column_original]
        out.update(q)
        outs.append(out)
    return outs


def custom_quiz_link(seed, name, *, localhost):
    quiz = full_quiz(seed)
    quiz_long = base64.b64encode(
        gzip.compress(json.dumps(quiz).encode("utf-8"))
    ).decode("utf-8")
    long = dict(
        mode="custom",
        name=name,
        quiz=quiz_long,
    )
    long = urllib.parse.urlencode(long)
    short = shorten(long)
    params = urllib.parse.urlencode(dict(short=short))
    if localhost:
        return f"http://localhost:8000/quiz.html?{params}"
    return f"https://urbanstats.org/quiz.html?{params}"


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
        with open(path(i), "w") as f:
            outs = full_quiz(("daily", i))
            json.dump(outs, f)


def generate_quiz_info_for_website(site_folder):
    folder = "react/src/data/quiz"
    try:
        os.mkdir(folder)
    except FileExistsError:
        pass

    try:
        os.mkdir(f"{site_folder}/quiz_sample_info")
    except FileExistsError:
        pass

    with open(f"{folder}/categories.json", "w") as f:
        json.dump(categories, f)

    with open(f"{folder}/types.json", "w") as f:
        json.dump(types, f)

    with open(f"{folder}/stat_to_question.json", "w") as f:
        json.dump(
            {get_statistic_column_path(k): v for k, v in stats_to_display.items()}, f
        )

    with open(f"{folder}/list_of_regions.json", "w") as f:
        json.dump({type: list(filter_for_pop(type).index) for type in types}, f)

    table = entire_table()
    table = {
        x: {
            get_statistic_column_path(col): float(table[col][x])
            for col in stats_to_display
        }
        for x in table.index
    }
    for loc in table:
        path = f"{site_folder}/quiz_sample_info/{create_filename(loc, 'json')}"
        folder = os.path.dirname(path)
        # this should just be a library function but whatever
        # pylint: disable=duplicate-code
        try:
            os.makedirs(folder)
        except FileExistsError:
            pass
        with open(path, "w") as f:
            json.dump(table[loc], f)


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


def type_ban_categorize(typ):
    if is_international(typ):
        return "international"
    return typ


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
}
