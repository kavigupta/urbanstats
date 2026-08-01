from typing import Optional

import tqdm.auto as tqdm
from permacache import permacache

from urbanstats.data.wikipedia.wikidata import query_sparlql, wikidata_to_wikipage

predefined = {
    "13041": "Campbell County, Georgia",
    "51189": "Warwick County, Virginia",
    "13203": "Milton County, Georgia",
    "32025": "Ormsby County, Nevada",
    "46001": "Armstrong County, South Dakota",
    "46131": "Washabaugh County, South Dakota",
    "46133": "Washington County, South Dakota",
}


def fipses_to_wikipedia_pages(fipses):
    """
    Convert FIPS codes to Wikipedia pages.

    Args:
        fipses: List or set of FIPS codes (strings)

    Returns:
        Dict mapping FIPS codes to Wikipedia pages
    """
    result = {}

    for fips in tqdm.tqdm(fipses):
        if fips in predefined:
            result[fips] = predefined[fips]
            continue
        wikidata_id = search_wikidata_by_fips(fips)
        if not wikidata_id:
            print(f"No Wikidata ID found for FIPS {fips}")
            continue

        wikipedia_page = wikidata_to_wikipage(wikidata_id)
        if not wikipedia_page:
            print(f"No Wikipedia page found for Wikidata ID {wikidata_id}")
            continue

        result[fips] = wikipedia_page

    return result


@permacache("election_data_by_county/historic_wiki/search_wikidata_by_fips")
def search_wikidata_by_fips(fips: str) -> Optional[str]:
    return query_sparlql("wdt:P882", fips)
