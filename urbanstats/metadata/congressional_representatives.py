import math
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


@dataclass(frozen=True)
class Representative:
    name: str
    wikipedia_page: str
    party: str


@dataclass(frozen=True)
class RepresentativeWithTerms:
    representative: Representative
    district_longname: str
    start_term: int
    end_term: int


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


@permacache(
    "urbanstats/metadata/congressional_representatives/load_representatives_by_district_2",
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
        if isinstance(row.representative_name, float) and math.isnan(
            row.representative_name
        ):
            continue
        result[(row.state_abbr, row.district_norm)][row.term_start_year].append(
            Representative(
                name=clean_optional_str(row.representative_name),
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
) -> Dict[int, List[Representative]]:
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
    "urbanstats/metadata/congressional_representatives/compute_representatives_for_shapefile_6",
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
        f"congressional_representatives_structured_{representatives_csv_version}_v68"
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
                key="congressional_representatives",
                values=representatives_by_row,
            )
        ]

    def all_relationships(self, shapefiles, key_a, key_b):
        # pylint: disable=import-outside-toplevel,cyclic-import
        from urbanstats.geometry.relationship import create_relationships_dispatch

        a_contains_b, b_contains_a, a_intersects_b, _ = create_relationships_dispatch(
            shapefiles, key_a, key_b, check_temporal=False
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
        results = defaultdict(list)
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
                    with_terms = [
                        RepresentativeWithTerms(
                            representative=rep,
                            district_longname=name_other,
                            start_term=term_start_year,
                            end_term=term_start_year,
                        )
                        for rep in reps
                    ]
                    results[name].extend(with_terms)
        for name in results:
            results[name] = deduplicate_and_sort_representatives(results[name])
        return [results[name] for name in shapefile_table.longname]


def deduplicate_and_sort_representatives(
    representatives_with_terms: List[RepresentativeWithTerms],
) -> List[RepresentativeWithTerms]:
    # Sort representatives by start_term, then end_term, then name
    by_representative = defaultdict(set)
    for rep_with_terms in representatives_with_terms:
        by_representative[
            (rep_with_terms.representative, rep_with_terms.district_longname)
        ].add(rep_with_terms)
    result = []
    for rwts in by_representative.values():
        rwts = merge_adjacent_terms(
            sorted(rwts, key=lambda rwt: (rwt.start_term, rwt.end_term))
        )
        result.extend(rwts)
    result.sort(
        key=lambda rwt: (
            rwt.start_term,
            rwt.end_term,
            rwt.representative.name,
            rwt.district_longname,
        )
    )
    return result


def merge_adjacent_terms(
    rwts: List[RepresentativeWithTerms],
) -> List[RepresentativeWithTerms]:
    for rwt in rwts:
        assert (
            rwt.start_term == rwt.end_term
        ), f"Expected single-term representative, got {rwt.start_term} to {rwt.end_term}"
    merged = [rwts[0]]
    for rwt in rwts[1:]:
        last = merged[-1]
        if (
            rwt.representative == last.representative
            and rwt.district_longname == last.district_longname
            and rwt.start_term
            <= last.end_term + 2  # allow for 2 year gap between terms
        ):
            # Just doublechecking that thhe term distance is appropriate.
            # This does crash if there's any representatives < 2 years apart
            # But that is correct. Terms are 2 apart and there should not
            # be duplicate entries.
            assert (
                rwt.start_term == last.end_term + 2
            ), f"Unexpected gap between terms for {rwt.representative.name}: {last.end_term} to {rwt.start_term}"
            merged.pop()
            merged.append(
                RepresentativeWithTerms(
                    representative=last.representative,
                    district_longname=last.district_longname,
                    start_term=min(last.start_term, rwt.start_term),
                    end_term=max(last.end_term, rwt.end_term),
                )
            )
        else:
            merged.append(rwt)
    return merged
