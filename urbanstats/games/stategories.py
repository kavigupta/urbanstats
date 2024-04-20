from dataclasses import dataclass
from functools import lru_cache
import itertools
from typing import Counter
import numpy as np
import pandas as pd
from tqdm import auto as tqdm
from permacache import permacache

from create_website import full_shapefile
from produce_html_page import get_statistic_categories

from .quiz import stats

version = 4
num_categories_per_game = 2
num_geographies_per_category = 4

stategories_stats = [
    "population",
    "ad_1",
    "sd",
    "white",
    "hispanic",
    "black",
    "asian",
    "citizenship_citizen_by_birth",
    "citizenship_not_citizen",
    "language_spanish",
    "education_ugrad",
    "education_grad",
    "individual_income_over_100k",
    "rent_burden_over_40",
    "rent_1br_over_1500",
    "rent_2br_over_1500",
    "year_built_2010_or_later",
    "transportation_means_car",
    "transportation_means_transit",
    "transportation_commute_time_over_60",
    ("2020 Presidential Election", "margin"),
    ("2016 Presidential Election", "margin"),
    ("2016-2020 Swing", "margin"),
    "mean_high_temp_4",
    "vehicle_ownership_at_least_1",
    "industry_agriculture,_forestry,_fishing_and_hunting",
    "industry_mining,_quarrying,_and_oil_and_gas_extraction",
    "industry_accommodation_and_food_services",
    "industry_arts,_entertainment,_and_recreation",
    "industry_construction",
    "industry_educational_services",
    "industry_health_care_and_social_assistance",
    "industry_finance_and_insurance",
    "industry_real_estate_and_rental_and_leasing",
    "industry_information",
    "industry_manufacturing",
    "industry_other_services,_except_public_administration",
    "industry_administrative_and_support_and_waste_management_services",
    "industry_management_of_companies_and_enterprises",
    "industry_professional,_scientific,_and_technical_services",
    "industry_public_administration",
    "industry_retail_trade",
    "industry_transportation_and_warehousing",
    "industry_utilities",
    "industry_wholesale_trade",
    "occupation_architecture_and_engineering_occupations",
    "occupation_computer_and_mathematical_occupations",
    "occupation_life,_physical,_and_social_science_occupations",
    "occupation_arts,_design,_entertainment,_sports,_and_media_occupations",
    "occupation_community_and_social_service_occupations",
    "occupation_educational_instruction,_and_library_occupations",
    "occupation_legal_occupations",
    "occupation_health_diagnosing_and_treating_practitioners_and_other_technical_occupations",
    "occupation_health_technologists_and_technicians",
    "occupation_business_and_financial_operations_occupations",
    "occupation_management_occupations",
    "occupation_construction_and_extraction_occupations",
    "occupation_farming,_fishing,_and_forestry_occupations",
    "occupation_installation,_maintenance,_and_repair_occupations",
    "occupation_material_moving_occupations",
    "occupation_transportation_occupations",
    "occupation_office_and_administrative_support_occupations",
    "occupation_sales_and_related_occupations",
    "occupation_building_and_grounds_cleaning_and_maintenance_occupations",
    "occupation_food_preparation_and_serving_related_occupations",
    "occupation_healthcare_support_occupations",
    "occupation_personal_care_and_service_occupations",
    "occupation_firefighting_and_prevention,_and_other_protective_service_workers_including_supervisors",
    "occupation_law_enforcement_workers_including_supervisors",
]
stategories_types = ["City", "Urban Area", "MSA"]
stategory_categories = [(x, which) for x in stategories_stats for which in (0, 1)]
percentile_clip = 5


@lru_cache(None)
def weights():
    cats = [get_statistic_categories()[x] for x, _ in stategory_categories]
    frequencies = Counter(cats)
    print(frequencies)
    weights = np.array([1 / frequencies[cat] for cat in cats])
    weights = weights / weights.sum()
    return weights


@permacache(f"urbanstats/games/stategories/stategory_table_version{version}")
def compute_stategory_table():
    full = full_shapefile()
    by_type = {type: full[(full.type == type)] for type in stategories_types}
    by_type_filt = {k: v[v.population > 10e4] for k, v in by_type.items()}
    stategory_table = pd.concat(list(by_type_filt.values()))
    return stategory_table


@lru_cache(None)
def compute_masks():
    stategory_table = compute_stategory_table()
    percentile_bins = {
        stat: np.percentile(
            stategory_table[stat], (percentile_clip, 100 - percentile_clip)
        )
        for stat in stategories_stats
    }

    masks = []

    for x, which in stategory_categories:
        column = stategory_table[x]
        if which == 0:
            mask = column < percentile_bins[x][which]
        else:
            mask = column > percentile_bins[x][which]
        masks.append(mask)
    masks = np.array(masks)
    return masks


def sample_stategory_board(rng):
    masks = compute_masks()
    for _ in tqdm.tqdm(itertools.count()):
        categories = rng.choice(
            masks.shape[0], size=num_categories_per_game, replace=False, p=weights()
        )
        mask_for_categories = masks[categories]
        single_category = mask_for_categories.sum(0) == 1
        mask_for_categories = single_category & mask_for_categories

        geographies_for_each_cat = [np.where(m)[0] for m in mask_for_categories]

        if not all(
            len(gs) >= num_geographies_per_category for gs in geographies_for_each_cat
        ):
            continue

        for _ in range(1000):
            geographies = np.array(
                [
                    rng.choice(gs, size=num_geographies_per_category, replace=False)
                    for gs in geographies_for_each_cat
                ]
            )
            geographies_flat = geographies.flatten()
            cats = (
                masks[:, geographies_flat].sum(1) >= num_geographies_per_category
            ).sum()
            if cats > num_categories_per_game:
                continue
            return StategoryBoard(
                categories,
                geographies,
                rng.permutation(num_categories_per_game * num_geographies_per_category),
            )


@dataclass
class StategoryBoard:
    categories: np.ndarray  # (num_categories_per_game,)
    geographies: np.ndarray  # (num_categories_per_game, num_geographies_per_category)
    random_order: np.ndarray  # (num_categories_per_game * num_geographies_per_category,)

    def replace_with_names(self):
        stategory_table = compute_stategory_table()
        stats, whichs = zip(*[stategory_categories[i] for i in self.categories])
        named_stats = [
            f"{stat} ({'Low' if which == 0 else 'High'})"
            for stat, which in zip(stats, whichs)
        ]
        named_geographies_flat = stategory_table.iloc[
            self.geographies.flatten()
        ].longname
        named_geographies = named_geographies_flat.values.reshape(
            self.geographies.shape
        )
        return named_stats, named_geographies

    def render_board(self):
        _, named_geographies = self.replace_with_names()
        flat_geographies = named_geographies.flatten()[self.random_order]
        print("\n".join(flat_geographies))

    def render_solution(self):
        named_stats, named_geographies = self.replace_with_names()
        for stat, geographies in zip(named_stats, named_geographies):
            print(stat)
            print("\n".join(geographies))
            print()