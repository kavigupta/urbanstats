import base64
import copy
from datetime import datetime, timedelta
import pytz
from functools import lru_cache
import gzip
import os
import json

import numpy as np
import pandas as pd
from permacache import permacache, stable_hash
import tqdm.auto as tqdm
import urllib

from create_website import full_shapefile, statistic_internal_to_display_name
from produce_html_page import get_statistic_categories
from urbanstats.acs import industry, occupation
from urbanstats.shortener import shorten

from relationship import states_for_all

from .fixed import juxtastat as fixed_up_to

min_pop = 250_000
min_pop_international = 20_000_000
version = 44

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
    if rng.uniform() < 0.75:
        banned_types.append("international")
    result = []
    for range in ranges:
        type, question = sample_quiz_question(
            rng, banned_categories, banned_types, *range
        )
        banned_categories.append(
            get_statistic_categories()[question["stat_column_original"]]
        )
        banned_types.append(type_ban_categorize(type))
        result.append(question)
    result = randomize_quiz(rng, result)
    return result


def difficulty_multiplier(stat_column_original, type):
    if is_international(type):
        return 4
    return difficulties[get_statistic_categories()[stat_column_original]]


def compute_difficulty(stat_a, stat_b, stat_column_original, type):
    diff = pct_diff(stat_a, stat_b)
    if diff > ranges[0][1]:
        return float("inf")
    diff = diff / difficulty_multiplier(stat_column_original, type)
    if "mean_high_temp" in stat_column_original:
        diff = diff / 0.25
    return diff


def same_state(a, b):
    sfa = states_for_all()
    return set(sfa[a]) & set(sfa[b]) != set()


def is_international(type):
    return type in {"Country", "Subnational Region"}


def sample_quiz_question(
    rng, banned_categories, banned_type_categories, distance_pct_bot, distance_pct_top
):
    while True:
        type = rng.choice(types)
        if type_ban_categorize(type) in banned_type_categories:
            continue
        at_pop = filter_for_pop(type)
        stat_column_original = rng.choice(at_pop.columns)
        cat = get_statistic_categories()[stat_column_original]
        p_skip = skip_category_probs.get(cat, 0)
        if rng.uniform() < p_skip:
            continue
        if cat in banned_categories:
            continue
        for _ in range(1000):
            a, b = rng.choice(at_pop.index, size=2)
            if type == "State":
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
            diff = compute_difficulty(stat_a, stat_b, stat_column_original, type)
            if distance_pct_bot <= diff <= distance_pct_top:
                return type, dict(
                    stat_column_original=stat_column_original,
                    longname_a=a,
                    longname_b=b,
                    stat_a=stat_a,
                    stat_b=stat_b,
                )
        print("FAILED", type, stat_column_original, distance_pct_bot, distance_pct_top)


@permacache(f"urbanstats/games/quiz/filter_for_pop_{version}")
def filter_for_pop(type):
    full = full_shapefile()
    filt = full[full.type == type]
    at_pop = filt[filt.best_population_estimate >= minimum_population(type)].set_index(
        "longname"
    )
    at_pop = at_pop[stats]
    at_pop = at_pop.loc[:, ~at_pop.applymap(np.isnan).all()]
    return at_pop


def entire_table():
    return pd.concat([filter_for_pop(type) for type in types])


def minimum_population(type):
    if is_international(type):
        return min_pop_international
    return min_pop


@permacache(f"urbanstats/games/quiz/generate_quiz_{version}")
def generate_quiz(seed):
    from .quiz_custom import get_custom_quizzes

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
    now = datetime.now(pytz.timezone("Pacific/Kiritimati"))
    beginning = pytz.timezone("Pacific/Kiritimati").localize(datetime(2023, 9, 2))
    fractional_days = (now - beginning + timedelta(hours=4)).total_seconds() / (
        24 * 60 * 60
    )
    if number <= fractional_days:
        raise Exception(
            f"Quiz {number} is in the past! It is currently {fractional_days} in Kiribati + 4 hours."
        )

def quiz_is_guaranteed_past(number):
    now = datetime.now(pytz.timezone("US/Samoa"))
    beginning = pytz.timezone("US/Samoa").localize(datetime(2023, 9, 2))
    fractional_days = (now - beginning).total_seconds() / (24 * 60 * 60)
    if number < fractional_days - 1:
        return None
    return fractional_days

def check_quiz_is_guaranteed_past(number):
    fractional_days = quiz_is_guaranteed_past(number)
    if fractional_days is not None:
        raise Exception(
            f"Quiz {number} is not necessarily yet done! It is currently {fractional_days} in Samoa"
        )


def generate_quizzes(folder):
    path = lambda day: os.path.join(folder, f"{day}")

    for i in range(fixed_up_to + 1):
        import shutil

        shutil.copy(f"quiz_old/{i}", path(i))
    for i in tqdm.trange(fixed_up_to + 1, 365 * 3):
        with open(path(i), "w") as f:
            outs = full_quiz(("daily", i))
            json.dump(outs, f)


def generate_quiz_info_for_website(site_folder):
    from create_website import get_statistic_column_path

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

    with open(f"{folder}/category_to_stats.json", "w") as f:
        json.dump(
            {
                category: [
                    get_statistic_column_path(stat)
                    for stat in stats
                    if get_statistic_categories()[stat] == category
                ]
                for category in categories
            },
            f,
        )

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
        with open(
            f"{site_folder}/quiz_sample_info/{loc.replace('/', 'slash')}", "w"
        ) as f:
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


def type_ban_categorize(type):
    if is_international(type):
        return "international"
    return type


types = [
    "City",
    "County",
    "MSA",
    "State",
    "Urban Area",
    "Congressional District",
    "Media Market",
    "Judicial Circuit",
    "Country",
    "Subnational Region",
]

stats_to_display = {
    "population": "higher population",
    "ad_1": "higher population-weighted density (r=1km)",
    "sd": "higher area-weighted density",
    "white": "higher % of people who are White",
    "hispanic": "higher % of people who are Hispanic",
    "black": "higher % of people who are Black",
    "asian": "higher % of people who are Asian",
    "citizenship_citizen_by_birth": "higher % of residents who are citizens by birth",
    "citizenship_citizen_by_naturalization": "higher % of residents who are citizens by naturalization",
    "citizenship_not_citizen": "higher % of residents who are non-citizens",
    "birthplace_non_us": "higher % of people who were born outside the US",
    "birthplace_us_not_state": "higher % of people who were born in the US and outside their state of residence",
    "birthplace_us_state": "higher % of people who were born in their state of residence",
    "language_english_only": "higher % of people who only speak english at home",
    "language_spanish": "higher % of people who speak spanish at home",
    "education_high_school": "higher % of people who have at least a high school diploma",
    "education_ugrad": "higher % of people who have at least an undergrad degree",
    "education_grad": "higher % of people who have a graduate degree",
    "education_field_stem": "!FULL Which has more people with a STEM degree, as a percentage of the overall population?",
    "education_field_humanities": "!FULL Which has more people with a humanities degree, as a percentage of the overall population?",
    "education_field_business": "!FULL Which has more people with a business degree, as a percentage of the overall population?",
    "generation_silent": "higher % of people who are silent generation",
    "generation_boomer": "higher % of people who are boomers",
    "generation_genx": "higher % of people who are gen x",
    "generation_millenial": "higher % of people who are millennials",
    "generation_genz": "higher % of people who are gen z",
    "generation_genalpha": "higher % of people who are gen alpha",
    "poverty_below_line": "higher % of people who are in poverty",
    "household_income_under_50k": "higher % of households who have household income under $50k",
    "household_income_over_100k": "higher % of households who have household income over $100k",
    "individual_income_under_50k": "higher % of people who have individual income under $50k",
    "individual_income_over_100k": "higher % of people who have individual income over $100k",
    "housing_per_pop": "higher number of housing units per adult",
    "vacancy": "higher % of units that are vacant",
    "rent_or_own_rent": "higher % of people who are renters",
    "rent_burden_under_20": "higher % of people whose rent is less than 20% of their income",
    "rent_burden_over_40": "higher % of people whose rent is greater than 40% of their income",
    "rent_1br_under_750": "higher % of units with 1br rent under $750",
    "rent_1br_over_1500": "higher % of units with 1br rent over $1500",
    "rent_2br_under_750": "higher % of units with 2br rent under $750",
    "rent_2br_over_1500": "higher % of units with 2br rent over $1500",
    "year_built_1969_or_earlier": "higher % units built pre-1970",
    "year_built_2010_or_later": "higher % units built in 2010s+",
    "transportation_means_car": "higher % of people who commute by car",
    "transportation_means_bike": "higher % of people who commute by bike",
    "transportation_means_walk": "higher % of people who commute by walking",
    "transportation_means_transit": "higher % of people who commute by transit",
    "transportation_means_worked_at_home": "higher % of people who work from home",
    "transportation_commute_time_under_15": "higher % of people who have commute time under 15 min",
    "transportation_commute_time_over_60": "higher % of people who have commute time over 60 min",
    (
        "2020 Presidential Election",
        "margin",
    ): "!FULL Which voted more for Biden in the 2020 presidential election?",
    (
        "2016 Presidential Election",
        "margin",
    ): "!FULL Which voted more for Clinton in the 2016 presidential election?",
    (
        "2016-2020 Swing",
        "margin",
    ): "!FULL Which swung towards Democrats more from 2016 to 2020?",
    "park_percent_1km_v2": "!FULL Which has more access to parks (higher % of area within 1km of a park, population weighted)?",
    "mean_dist_Hospital_updated": "!FULL Which has less access to hospitals (higher population-weighted mean distance)?",
    "mean_dist_Active Superfund Site_updated": "!FULL Which has less exposure to EPA superfund sites (higher population-weighted mean distance)?",
    "mean_dist_Airport_updated": "!FULL Which has less access to airports (higher population-weighted mean distance)?",
    "mean_dist_Public School_updated": "!FULL Which has less access to public schools (higher population-weighted mean distance)?",
    "internet_no_access": "higher % of people who have no internet access",
    "insurance_coverage_none": "higher % of people who are uninsured",
    "insurance_coverage_govt": "higher % of people who are on public insurance",
    "insurance_coverage_private": "higher % of people who are on private insurance",
    "marriage_divorced": "higher % of people who are divorced",
    "mean_high_temp_4": "higher mean daily high temperature (population weighted)",
    "mean_high_temp_winter_4": "higher mean daily high temperature in winter (population weighted)",
    "mean_high_temp_spring_4": "higher mean daily high temperature in spring (population weighted)",
    "mean_high_temp_summer_4": "higher mean daily high temperature in summer (population weighted)",
    "mean_high_temp_fall_4": "higher mean daily high temperature in fall (population weighted)",
    "mean_high_heat_index_4": "higher mean daily high heat index (population weighted)",
    # "mean_high_dewpoint_4": "more humid (higher mean daily high dewpoint, population weighted)",
    # "days_dewpoint_70_inf_4": "higher % of humid days (days with dewpoint over 70°F, population weighted)",
    # "days_dewpoint_-inf_50_4": "higher % of dry days (days with dewpoint under 50°F, population weighted)",
    "days_above_90_4": "higher % of hot days (days with high temp over 90°F, population weighted)",
    "days_below_40_4": "higher % of cold days (days with high temp under 40°F, population weighted)",
    "wind_speed_over_10mph_4": "higher % of days with wind speed over 10mph (population weighted)",
    "snowfall_4": "higher snowfall (population weighted)",
    "rainfall_4": "higher rainfall (population weighted)",
    "hours_sunny_4": "!FULL Which has more hours of sun per day on average? (population weighted)",
    "gpw_aw_density": "higher area-weighted population density",
    "gpw_population": "higher population",
    "gpw_pw_density_4": "higher population-weighted density (r=4km)",
    "vehicle_ownership_at_least_1": "higher % of households with at least 1 vehicle",
    "industry_agriculture,_forestry,_fishing_and_hunting": "higher % of workers employed in the agriculture, forestry, fishing, and hunting industries",
    "industry_mining,_quarrying,_and_oil_and_gas_extraction": "higher % of workers employed in the mining, quarrying, and oil/gas extraction industries",
    "industry_accommodation_and_food_services": "higher % of workers employed in the accommodation and food services industry",
    "industry_arts,_entertainment,_and_recreation": "higher % of workers employed in the arts, entertainment, and recreation industry",
    "industry_construction": "higher % of workers employed in the construction industry",
    "industry_educational_services": "higher % of workers employed in the educational services industry",
    "industry_health_care_and_social_assistance": "higher % of workers employed in the health care and social assistance industry",
    "industry_finance_and_insurance": "higher % of workers employed in the finance and insurance industry",
    "industry_real_estate_and_rental_and_leasing": "higher % of workers employed in the real estate and rental and leasing industry",
    "industry_information": "higher % of workers employed in the information industry",
    "industry_manufacturing": "higher % of workers employed in the manufacturing industry",
    "industry_other_services,_except_public_administration": "higher % of workers employed in other service industries, except public administration",
    "industry_administrative_and_support_and_waste_management_services": "higher % of workers employed in the administrative/support/waste management services industries",
    "industry_management_of_companies_and_enterprises": "higher % of workers employed in the management industry",
    "industry_professional,_scientific,_and_technical_services": "higher % of workers employed in the professional, scientific, and technical services industry",
    "industry_public_administration": "higher % of workers employed in public administration",
    "industry_retail_trade": "higher % of workers employed in the retail trade industry",
    "industry_transportation_and_warehousing": "higher % of workers employed in the transportation and warehousing industry",
    "industry_utilities": "higher % of workers employed in the utilities industry",
    "industry_wholesale_trade": "higher % of workers employed in the wholesale trade industry",
    "occupation_architecture_and_engineering_occupations": "higher % of workers employed as architects and engineers",
    "occupation_computer_and_mathematical_occupations": "higher % of workers employed in computer and mathematical occupations",
    "occupation_life,_physical,_and_social_science_occupations": "higher % of workers employed in life, physical, and social science occupations",
    "occupation_arts,_design,_entertainment,_sports,_and_media_occupations": "higher % of workers employed in arts, design, entertainment, sports, and media occupations",
    "occupation_community_and_social_service_occupations": "higher % of workers employed in community and social service occupations",
    "occupation_educational_instruction,_and_library_occupations": "higher % of workers employed in educational instruction, and library occupations",
    "occupation_legal_occupations": "higher % of workers employed in legal occupations",
    "occupation_health_diagnosing_and_treating_practitioners_and_other_technical_occupations": "higher % of workers employed in health diagnosing and treating practitioners and other technical occupations",
    "occupation_health_technologists_and_technicians": "higher % of workers employed as health technologists and technicians",
    "occupation_business_and_financial_operations_occupations": "higher % of workers employed in business and financial operations occupations",
    "occupation_management_occupations": "higher % of workers employed as managers",
    "occupation_construction_and_extraction_occupations": "higher % of workers employed in construction and extraction occupations",
    "occupation_farming,_fishing,_and_forestry_occupations": "higher % of workers employed in farming, fishing, and forestry occupations",
    "occupation_installation,_maintenance,_and_repair_occupations": "higher % of workers employed in installation, maintenance, and repair occupations",
    "occupation_material_moving_occupations": "higher % of workers employed as material movers",
    "occupation_transportation_occupations": "higher % of workers employed in transportation occupations",
    "occupation_office_and_administrative_support_occupations": "higher % of workers employed as office and administrative support workers",
    "occupation_sales_and_related_occupations": "higher % of workers employed in sales and related occupations",
    "occupation_building_and_grounds_cleaning_and_maintenance_occupations": "higher % of workers employed in building and grounds cleaning and maintenance occupations",
    "occupation_food_preparation_and_serving_related_occupations": "higher % of workers employed as food preparers or servers",
    "occupation_healthcare_support_occupations": "higher % of workers employed in healthcare support occupations",
    "occupation_personal_care_and_service_occupations": "higher % of workers employed in personal care and service occupations",
    "occupation_firefighting_and_prevention,_and_other_protective_service_workers_including_supervisors": "higher % of workers employed as firefighting and prevention, and other protective service workers including supervisors",
    "occupation_law_enforcement_workers_including_supervisors": "higher % of workers employed as law enforcement workers including supervisors",
}

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
    "!FULL Which has more hours of sun per day on average?": "hours_sunny_4",
    "higher % of days with high temp < 40": "days_below_40_4",
    "higher % of days with high temp under 40°F (population weighted)": "days_below_40_4",
    "higher % of people who were born in the us and born outside their state of residence": "birthplace_us_not_state",
}

not_included = {
    # duplicate
    "ad_0.25",
    "ad_0.5",
    "ad_2",
    "ad_4",
    # irrelevant
    "area",
    "compactness",
    # middle / obscure
    "native",
    "hawaiian_pi",
    "household_income_50k_to_100k",
    "individual_income_50k_to_100k",
    "year_built_1970_to_1979",
    "year_built_1980_to_1989",
    "year_built_1990_to_1999",
    "year_built_2000_to_2009",
    "rent_1br_750_to_1500",
    "rent_2br_750_to_1500",
    "rent_burden_20_to_40",
    "language_other",
    "other / mixed",
    "transportation_commute_time_15_to_29",
    "transportation_commute_time_30_to_59",
    "days_dewpoint_50_70_4",
    "days_between_40_and_90_4",
    "mean_high_dewpoint_4",
    "days_dewpoint_70_inf_4",
    "days_dewpoint_-inf_50_4",
    "female_hs_gap_4",
    "female_ugrad_gap_4",
    "female_grad_gap_4",
    "vehicle_ownership_none",
    "vehicle_ownership_at_least_2",
    "occupation_production_occupations",
    # meh whatever
    "marriage_married_not_divorced",
    "marriage_never_married",
    # duplicates
    "within_Active Superfund Site_10",
    "within_Airport_30",
    "within_Public School_2",
    "within_Hospital_10",
    "gpw_pw_density_2",
    "gpw_pw_density_1",
}

stats = list(stats_to_display)
categories = sorted({get_statistic_categories()[x] for x in stats})

unrecognized = (set(stats) | set(not_included)) - set(
    statistic_internal_to_display_name()
)
assert not unrecognized, unrecognized

extras = set(statistic_internal_to_display_name()) - (set(stats) | set(not_included))
assert not extras, extras
