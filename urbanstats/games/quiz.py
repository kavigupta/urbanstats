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
        stat_column = rng.choice(stats)
        filt = full[full.type == type]
        [stat_column_original] = [
            k
            for k, v in statistic_internal_to_display_name().items()
            if v == stat_column
        ]
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


@permacache("urbanstats/games/quiz/generate_quiz_4")
def generate_quiz(seed):
    rng = np.random.default_rng(int(stable_hash(seed), 16))
    return sample_quiz(rng)


def generate_quizzes(folder):
    path = lambda day: os.path.join(folder, f"{day}")
    # 0-3 fixed in stone
    for i in range(4):
        import shutil

        shutil.copy(f"quiz_old/{i}", path(i))
    for i in tqdm.trange(4, 365 * 3):
        with open(path(i), "w") as f:
            res = generate_quiz(("daily", i))
            res = copy.deepcopy(res)
            outs = []
            for q in res:
                out = {}
                out["stat_column"] = statistic_internal_to_display_name()[
                    q.pop("stat_column_original")
                ]
                out["question"] = stats_to_display[out["stat_column"]]
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
    "Population": "higher population",
    "PW Density (r=1km)": "higher population-weighted density (r=1km)",
    "AW Density": "higher area-weighted density",
    "Area": "higher area",
    "White %": "higher % of people who are White",
    "Hispanic %": "higher % of people who are Hispanic",
    "Black %": "higher % of people who are Black",
    "Asian %": "higher % of people who are Asian",
    "Native %": "higher % of people who are Native American",
    "Hawaiian / PI %": "higher % of people who are hawaiian / pi",
    "Citizen by Birth %": "higher % of people who are citizens by birth",
    "Citizen by Naturalization %": "higher % of people who are citizens by naturalization",
    "Non-citizen %": "higher % of people who are non-citizens",
    "Born outside US %": "higher % of people who are born outside the us",
    "Born in us outside state %": "higher % of people who are born in the us outside their state of residence",
    "Born in state of residence %": "higher % of people who are born in their state of residence",
    "Only English at Home %": "higher % of people who only speak english at home",
    "Spanish at Home %": "higher % of people who speak spanish at home",
    "High School %": "higher % of people who have a high school diploma",
    "Undergrad %": "higher % of people who have an undergrad degree",
    "Grad %": "higher % of people who have a graduate degree",
    "Undergrad STEM %": "higher % of people who have a stem degree",
    "Undergrad Humanities %": "higher % of people who have a humanities degree",
    "Undergrad Business %": "higher % of people who have a business degree",
    "Silent %": "higher % of people who are silent generation",
    "Boomer %": "higher % of people who are boomers",
    "Gen X %": "higher % of people who are gen x",
    "Millennial %": "higher % of people who are millennials",
    "Gen Z %": "higher % of people who are gen z",
    "Gen Alpha %": "higher % of people who are gen alpha",
    "Poverty %": "higher % of people who are in poverty",
    "Household Income < $50k %": "higher % of people who have household income < $50k",
    "Household Income > $100k %": "higher % of people who have household income > $100k",
    "Individual Income < $50k %": "higher % of people who have individual income < $50k",
    "Individual Income > $100k %": "higher % of people who have individual income > $100k",
    "Housing Units per Adult": "higher housing units per adult",
    "Vacancy %": "higher % of units that are vacant",
    "Renter %": "higher % of people who are renters",
    "Rent/Income < 20%": "higher % of people who have rent/income < 20%",
    "Rent/Income > 40%": "higher % of people who have rent/income > 40%",
    "1BR Rent < $750 %": "higher % of units with 1br rent < $750",
    "1BR Rent > $1500 %": "higher % of units with 1br rent > $1500",
    "2BR Rent < $750 %": "higher % of units with 2br rent < $750",
    "2BR Rent > $1500 %": "higher % of units with 2br rent > $1500",
    "% units built pre-1970": "higher % units built pre-1970",
    "% units built in 2010s+": "higher % units built in 2010s+",
    "Commute Car %": "higher % of people who commute by car",
    "Commute Bike %": "higher % of people who commute by bike",
    "Commute Walk %": "higher % of people who commute by walking",
    "Commute Transit %": "higher % of people who commute by transit",
    "Commute Work From Home %": "higher % of people who work from home",
    "Commute Time < 15 min %": "higher % of people who have commute time < 15 min",
    "Commute Time > 60 min %": "higher % of people who have commute time > 60 min",
    "2020 Presidential Election": "more democratic in the 2020 presidential election",
    "2016 Presidential Election": "more democratic in 2016 presidential election",
    "2016-2020 Swing": "more democratic in 2016-2020 swing",
    "Within 10km of Hospital %": "higher % of people who are within 10km of hospital",
    "Mean distance to nearest Hospital": "higher mean distance to nearest hospital",
    "No internet access %": "higher % of people who have no internet access",
    "Uninsured %": "higher % of people who are uninsured",
    "Public Insurance %": "higher % of people who are on public insurance",
    "Private Insurance %": "higher % of people who are on private insurance",
    "Divorced %": "higher % of people who are divorced",
}


stats = list(stats_to_display)
