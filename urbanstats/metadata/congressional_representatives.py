import json
import math
import urllib.request
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List

import pandas as pd
import tqdm.auto as tqdm
import us
from permacache import permacache

from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefiles.historical_congressional import to_year
from urbanstats.metadata.metadata_columns import (
    MetadataColumnProvider,
    MetadataColumnResult,
)

TERM_START_YEARS = [to_year(congress_number) for congress_number in range(1, 120)]


def key_for_term_start_year(term_start_year: int) -> str:
    return f"congressional_representatives_{term_start_year}"


@dataclass(frozen=True)
class Representative:
    name: str
    wikidata_id: str
    wikipedia_page: str
    party: str


@dataclass
class RepresentativeWithDateRange:
    representative: Representative
    start_year: int
    end_year: int


def district_shortname_to_state_and_district(shortname: str):
    # `shortname` is formatted as "ST-DD (YYYY)" for congressional districts.
    district_key = shortname.split(" ")[0]
    state_abbr, district = district_key.split("-", 1)
    return state_abbr, normalize_district(district)


def normalize_district(district):
    district = str(district).strip()
    if not district:
        return "AL"
    if district.upper() in {"AL", "AT LARGE", "AT-LARGE"}:
        return "AL"
    if district.isdigit():
        return f"{int(district):02d}"
    return district


def clean_optional_str(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    return str(value)


def to_bool(v):
    if isinstance(v, bool):
        return v
    return str(v).strip().lower() in {"true", "1", "yes"}


@permacache(
    "urbanstats/metadata/congressional_representatives/load_party_pages",
    key_function=dict(version=str),
)
def load_party_pages(*, version):
    party_pages_url = (
        "https://raw.githubusercontent.com/kavigupta/"
        f"all-congressional-representatives/{version}/party_pages.json"
    )
    with urllib.request.urlopen(party_pages_url) as response:
        party_pages = json.load(response)
    return {
        party: {
            "party_color": page["party_color"],
            "wikipedia_page": page["wikipedia_page"],
        }
        for party, page in party_pages.items()
    }


@permacache(
    "urbanstats/metadata/congressional_representatives/load_representatives_by_district",
    key_function=dict(version=str),
)
def load_representatives_by_district(*, version):
    representatives_url = (
        "https://raw.githubusercontent.com/kavigupta/"
        f"all-congressional-representatives/{version}/representatives.csv"
    )
    table = pd.read_csv(representatives_url)

    state_name_to_abbr = {
        state.name: state.abbr for state in us.states.STATES + [us.states.DC]
    }
    table["state_abbr"] = table["state"].map(state_name_to_abbr)
    table["district_norm"] = table["district"].map(normalize_district)
    table["term_start_year"] = table["term"].astype(int).map(to_year)

    result = defaultdict(lambda: defaultdict(list))
    for row in table.itertuples(index=False):
        if row.state_abbr is None:
            continue
        if to_bool(row.vacant):
            continue
        if isinstance(row.representative_name, float) and math.isnan(
            row.representative_name
        ):
            continue
        result[(row.state_abbr, row.district_norm)][row.term_start_year].append(
            Representative(
                name=clean_optional_str(row.representative_name),
                wikidata_id="",
                wikipedia_page=clean_optional_str(row.representative_wikipedia_page),
                party=clean_optional_str(row.party),
            )
        )

    return {
        district_key: dict(sorted(representatives_by_year.items(), key=lambda x: x[0]))
        for district_key, representatives_by_year in result.items()
    }


def representatives_for_district(
    state_abbr: str, district: str, start_year, end_year, *, representatives_csv_version
) -> List[Representative]:
    representatives = load_representatives_by_district(
        version=representatives_csv_version
    )
    district_representatives = representatives.get((state_abbr, district), {})
    return {
        year: reps
        for year, reps in district_representatives.items()
        if start_year <= year <= end_year
    }


@permacache(
    "urbanstats/metadata/congressional_representatives/compute_representatives_for_shapefile_3",
    key_function=dict(sf=lambda x: x.hash_key),
)
def compute_representatives_for_shapefile(
    sf: Shapefile, *, representatives_csv_version
) -> List[dict]:
    table = sf.load_file()
    results = []
    pbar = tqdm.tqdm(total=len(table), desc="Computing representatives for districts")
    for _, row in table.iterrows():
        pbar.set_postfix({"current_district": row["longname"]})
        state_abbr, district = district_shortname_to_state_and_district(row.shortname)
        results.append(
            representatives_for_district(
                state_abbr,
                district,
                row.start_date,
                row.end_date,
                representatives_csv_version=representatives_csv_version,
            )
        )
        pbar.update(1)
    pbar.close()
    return list(table.longname), results


class CongressionalRepresentativesMetadataProvider(MetadataColumnProvider):
    representatives_csv_version = "a38a7de"
    version = (
        f"congressional_representatives_structured_{representatives_csv_version}_v52"
    )

    def compute_metadata_columns(self, *, shapefile, shapefiles, shapefile_table):
        has_representatives = set(shapefile.special_data_sources) & {
            "congressional_representatives",
            "congressional_representatives_indirect",
        }
        if not has_representatives:
            return []
        representatives_by_row = self.compute_metadata_columns_indirect(
            shapefile, shapefile_table, shapefiles
        )
        return [
            MetadataColumnResult(
                key=key_for_term_start_year(term_start_year),
                values=[x.get(term_start_year, []) for x in representatives_by_row],
            )
            for term_start_year in TERM_START_YEARS
        ]

    def all_relationships(self, shapefiles, key_a, key_b):
        # pylint: disable=import-outside-toplevel,cyclic-import
        from urbanstats.geometry.relationship import create_relationships_dispatch

        a_contains_b, b_contains_a, a_intersects_b, _ = create_relationships_dispatch(
            shapefiles, key_a, key_b
        )
        return [*a_contains_b, *b_contains_a, *a_intersects_b]

    def name_to_representatives_for_shapefile(self, shapefile):
        names, representatives_by_row = compute_representatives_for_shapefile(
            shapefile,
            representatives_csv_version=self.representatives_csv_version,
        )
        return dict(zip(names, representatives_by_row))

    def compute_metadata_columns_indirect(self, shapefile, shapefile_table, shapefiles):
        [key_self] = [key for key, value in shapefiles.items() if value == shapefile]

        other_keys = [
            key
            for key, sf_other in shapefiles.items()
            if "congressional_representatives" in sf_other.special_data_sources
        ]
        results = defaultdict(lambda: defaultdict(list))
        for key_other in other_keys:
            relationships = self.all_relationships(shapefiles, key_self, key_other)
            if not relationships:
                continue
            name_to_representatives_other = self.name_to_representatives_for_shapefile(
                shapefiles[key_other]
            )
            for name, name_other in relationships:
                for term_start_year, reps in name_to_representatives_other.get(
                    name_other, {}
                ).items():
                    results[name][term_start_year].extend(reps)
        results = {
            name: attach_years(reps_by_year) for name, reps_by_year in results.items()
        }
        return [results.get(name, {}) for name in shapefile_table.longname]


def attach_years(
    reps_by_year: Dict[int, List[Representative]],
) -> Dict[int, List[RepresentativeWithDateRange]]:
    sorted_years = sorted(reps_by_year.keys())
    representative_to_years = defaultdict(list)
    for year in sorted_years:
        for rep in reps_by_year[year]:
            representative_to_years[rep].append(year)
    representative_to_year_range = {
        rep: compute_ranges(years) for rep, years in representative_to_years.items()
    }

    result = defaultdict(list)
    for year, reps in reps_by_year.items():
        for rep in reps:
            for start_year, end_year in representative_to_year_range[rep]:
                if start_year <= year <= end_year:
                    result[year].append(
                        RepresentativeWithDateRange(
                            representative=rep, start_year=start_year, end_year=end_year
                        )
                    )

    return dict(result)


def compute_ranges(years: List[int]) -> List[tuple]:
    sorted_years = sorted(years)
    ranges = [(sorted_years[0], sorted_years[0])]
    for year in sorted_years[1:]:
        last_range = ranges[-1]
        if year == last_range[1] + 2:
            ranges[-1] = (last_range[0], year)
        else:
            ranges.append((year, year))
    return ranges
