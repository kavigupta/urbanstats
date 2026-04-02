from collections import defaultdict
from dataclasses import dataclass
from time import time
from typing import List

from permacache import permacache
from requests import HTTPError
import tqdm.auto as tqdm

from urbanstats.data.wikipedia.wikidata import fetch_sparql_bindings
from urbanstats.data.wikipedia.wikidata_sourcer import (
    WikidataSourcer,
    compute_wikidata_and_wikipedia,
)
from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefiles.historical_congressional import to_year


@dataclass
class Representative:
    name: str
    wikidata_id: str
    wikipedia_page: str
    party: str


_US_HOUSE_POSITION = "wd:Q13218630"


def term_label_to_start_year(term_label: str):
    # Example term labels: "118th United States Congress"
    first_token = term_label.split()[0]
    congress_number_str = (
        first_token.removesuffix("st")
        .removesuffix("nd")
        .removesuffix("rd")
        .removesuffix("th")
    )
    if not congress_number_str.isdigit():
        raise ValueError(f"Unexpected term label format: {term_label}")
    return to_year(int(congress_number_str))


def query_wikipedia_page_and_party(wikidata_id, *, version):
    query = f"""
    SELECT ?rel_wikipedia_page ?rel_partyLabel WHERE {{
      wd:{wikidata_id} wdt:P31 wd:Q5 .
      OPTIONAL {{
        ?rel_wikipedia_page <http://schema.org/about> wd:{wikidata_id} .
        ?rel_wikipedia_page <http://schema.org/isPartOf> <https://en.wikipedia.org/> .
      }}
      OPTIONAL {{ wd:{wikidata_id} wdt:P102 ?rel_party . }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}
    """
    bindings = fetch_sparql_bindings(query, version=version)
    if bindings:
        return (
            bindings[0]
            .get("rel_wikipedia_page", bindings[0].get("wikipedia_page", {}))
            .get("value"),
            bindings[0]
            .get("rel_partyLabel", bindings[0].get("partyLabel", {}))
            .get("value"),
        )
    return None, None


def representatives_for_district(
    wikidata_district_id: str, start_year, end_year, *, sparlql_cache_version
) -> List[Representative]:
    query = f"""
    SELECT ?person ?personLabel ?parliamentary_termLabel WHERE {{
    ?person p:P39 ?st .
    ?st ps:P39 {_US_HOUSE_POSITION} .
    ?st pq:P768 wd:{wikidata_district_id} .
    OPTIONAL {{ ?st pq:P2937 ?parliamentary_term }}
    SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}
    """
    bindings = fetch_sparql_bindings(query, version=sparlql_cache_version)
    representatives = defaultdict(list)
    for b in bindings:
        name = b["personLabel"]["value"]
        wikidata_id = b["person"]["value"].split("/")[-1]
        wikipedia_page, party = query_wikipedia_page_and_party(
            wikidata_id, version=sparlql_cache_version
        )
        term_label = b.get("parliamentary_termLabel", {}).get("value")
        term_start_year = term_label_to_start_year(term_label) if term_label else None
        if term_start_year is None:
            print(
                f"Warning: Missing or unknown parliamentary term for representative {name} ({wikidata_id}), skipping"
            )
            continue
        representatives[term_start_year].append(
            Representative(
                name=name,
                wikidata_id=wikidata_id,
                wikipedia_page=wikipedia_page,
                party=party,
            )
        )
    representatives = dict(sorted(representatives.items(), key=lambda x: x[0]))
    return {k: v for k, v in representatives.items() if start_year <= k <= end_year}


def representatives_for_district_with_backoff(*args, **kwargs):
    for _ in range(3):
        try:
            return representatives_for_district(*args, **kwargs)
        except HTTPError as e:
            print(f"HTTP error {e.response.status_code} for district, retrying...")
            time.sleep(1)
    raise RuntimeError("Failed to fetch representatives after 3 attempts")


@permacache(
    "urbanstats/metadata/congressional_representatives/compute_representatives_for_shapefile",
    key_function=dict(sf=lambda x: x.hash_key),
)
def compute_representatives_for_shapefile(
    sf: Shapefile, wds: WikidataSourcer, *, sparlql_cache_version
) -> List[dict]:
    table = sf.load_file()
    wikidata_ids, _ = compute_wikidata_and_wikipedia(sf, wds)
    results = []
    pbar = tqdm.tqdm(total=len(table), desc="Computing representatives for districts")
    for (_, row), wd_id in zip(table.iterrows(), wikidata_ids):
        pbar.set_postfix({"current_district": row["longname"]})
        results.append(
            representatives_for_district_with_backoff(
                wd_id,
                row.start_date,
                row.end_date,
                sparlql_cache_version=sparlql_cache_version,
            )
        )
        pbar.update(1)
    pbar.close()
    return results
