import copy
import os
import json

import numpy as np
from permacache import permacache, stable_hash
import tqdm.auto as tqdm

from create_website import full_shapefile, statistic_internal_to_display_name

min_pop = 250_000

ranges = [
    (0.7, 1),
    (0.5, 0.7),
    (0.35, 0.5),
    (0.25, 0.35),
    (0.25 * 0.7, 0.25),
]


def sample_quiz(rng):
    return [sample_quiz_question(rng, *range) for range in ranges]


def sample_quiz_question(rng, distance_pct_bot, distance_pct_top):
    full = full_shapefile()
    while True:
        type = rng.choice(types)
        stat_column_original = rng.choice(stats)
        filt = full[full.type == type]
        percentiles = filt[stat_column_original, "percentile_by_population"]
        central_values = filt[stat_column_original][
            (percentiles < 0.95) & (percentiles > 0.05)
        ]
        dynamic_range = central_values.max() - central_values.min()
        at_pop = filt[filt.population >= min_pop].set_index("longname")
        for _ in range(1000):
            a, b = rng.choice(at_pop.index, size=2)
            stat_a, stat_b = (
                at_pop.loc[a][stat_column_original],
                at_pop.loc[b][stat_column_original],
            )
            if (
                distance_pct_bot
                <= abs(stat_a - stat_b) / dynamic_range
                <= distance_pct_top
            ):
                return dict(
                    stat_column_original=stat_column_original,
                    longname_a=a,
                    longname_b=b,
                    stat_a=stat_a,
                    stat_b=stat_b,
                )


@permacache("urbanstats/games/quiz/generate_quiz_5")
def generate_quiz(seed):
    rng = np.random.default_rng(int(stable_hash(seed), 16))
    return sample_quiz(rng)


def generate_quizzes(folder):
    path = lambda day: os.path.join(folder, f"{day}")

    fixed_up_to = 10
    # 0-3 fixed in stone
    for i in range(fixed_up_to + 1):
        import shutil

        shutil.copy(f"quiz_old/{i}", path(i))
    for i in tqdm.trange(fixed_up_to + 1, 365 * 3):
        with open(path(i), "w") as f:
            res = generate_quiz(("daily", i))
            res = copy.deepcopy(res)
            outs = []
            for q in res:
                out = {}
                stat_column_original = q.pop("stat_column_original")
                out["stat_column"] = statistic_internal_to_display_name()[
                    stat_column_original
                ]
                out["question"] = stats_to_display[stat_column_original]
                out.update(q)
                outs.append(out)
            json.dump(outs, f)


types = [
    "City",
    "County",
    "MSA",
    "State",
    "Urban Area",
]

stats_to_display = {
    "population": "higher population",
    "ad_1": "higher population-weighted density (r=1km)",
    "sd": "higher area-weighted density",
    "area": "higher area",
    "white": "higher % of people who are White",
    "hispanic": "higher % of people who are Hispanic",
    "black": "higher % of people who are Black",
    "asian": "higher % of people who are Asian",
    "native": "higher % of people who are Native American",
    "hawaiian_pi": "higher % of people who are hawaiian / pi",
    "citizenship_citizen_by_birth": "higher % of people who are citizens by birth",
    "citizenship_citizen_by_naturalization": "higher % of people who are citizens by naturalization",
    "citizenship_not_citizen": "higher % of people who are non-citizens",
    "birthplace_non_us": "higher % of people who are born outside the us",
    "birthplace_us_not_state": "higher % of people who are born in the us outside their state of residence",
    "birthplace_us_state": "higher % of people who are born in their state of residence",
    "language_english_only": "higher % of people who only speak english at home",
    "language_spanish": "higher % of people who speak spanish at home",
    "education_high_school": "higher % of people who have a high school diploma",
    "education_ugrad": "higher % of people who have an undergrad degree",
    "education_grad": "higher % of people who have a graduate degree",
    "education_field_stem": "higher % of people who have a stem degree",
    "education_field_humanities": "higher % of people who have a humanities degree",
    "education_field_business": "higher % of people who have a business degree",
    "generation_silent": "higher % of people who are silent generation",
    "generation_boomer": "higher % of people who are boomers",
    "generation_genx": "higher % of people who are gen x",
    "generation_millenial": "higher % of people who are millennials",
    "generation_genz": "higher % of people who are gen z",
    "generation_genalpha": "higher % of people who are gen alpha",
    "poverty_below_line": "higher % of people who are in poverty",
    "household_income_under_50k": "higher % of people who have household income < $50k",
    "household_income_over_100k": "higher % of people who have household income > $100k",
    "individual_income_under_50k": "higher % of people who have individual income < $50k",
    "individual_income_over_100k": "higher % of people who have individual income > $100k",
    "housing_per_pop": "higher housing units per adult",
    "vacancy": "higher % of units that are vacant",
    "rent_or_own_rent": "higher % of people who are renters",
    "rent_burden_under_20": "higher % of people who have rent/income < 20%",
    "rent_burden_over_40": "higher % of people who have rent/income > 40%",
    "rent_1br_under_750": "higher % of units with 1br rent < $750",
    "rent_1br_over_1500": "higher % of units with 1br rent > $1500",
    "rent_2br_under_750": "higher % of units with 2br rent < $750",
    "rent_2br_over_1500": "higher % of units with 2br rent > $1500",
    "year_built_1969_or_earlier": "higher % units built pre-1970",
    "year_built_2010_or_later": "higher % units built in 2010s+",
    "transportation_means_car": "higher % of people who commute by car",
    "transportation_means_bike": "higher % of people who commute by bike",
    "transportation_means_walk": "higher % of people who commute by walking",
    "transportation_means_transit": "higher % of people who commute by transit",
    "transportation_means_worked_at_home": "higher % of people who work from home",
    "transportation_commute_time_under_15": "higher % of people who have commute time < 15 min",
    "transportation_commute_time_over_60": "higher % of people who have commute time > 60 min",
    (
        "2020 Presidential Election",
        "margin",
    ): "more democratic in the 2020 presidential election",
    (
        "2016 Presidential Election",
        "margin",
    ): "more democratic in 2016 presidential election",
    ("2016-2020 Swing", "margin"): "more democratic in 2016-2020 swing",
    "within_Hospital_10": "higher % of people who are within 10km of hospital",
    "mean_dist_Hospital_updated": "higher mean distance to nearest hospital",
    "internet_no_access": "higher % of people who have no internet access",
    "insurance_coverage_none": "higher % of people who are uninsured",
    "insurance_coverage_govt": "higher % of people who are on public insurance",
    "insurance_coverage_private": "higher % of people who are on private insurance",
    "marriage_divorced": "higher % of people who are divorced",
}


stats = list(stats_to_display)
