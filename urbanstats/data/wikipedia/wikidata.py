from typing import Optional
from permacache import permacache
import requests


@permacache("election_data_by_county/historic_wiki/wikidata_to_wikipage")
def wikidata_to_wikipage(wikidata_id: str) -> Optional[str]:
    """
    Convert a Wikidata Q-identifier to the corresponding enwiki page.

    Args:
        wikidata_id: Wikidata Q-identifier

    Returns:
        enwiki page if found, None otherwise
    """
    if wikidata_id is None:
        return None
    url = f"https://www.wikidata.org/wiki/Special:EntityData/{wikidata_id}.json"

    headers = {
        "User-Agent": "urbanstats (https://github.com/kavigupta/urbanstats; contact@urbanstats.org)"
    }

    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    data = response.json()

    # pylint: disable=duplicate-code
    entities = data.get("entities", {})
    if not entities:
        return None

    entity = next(iter(entities.values()))
    sitelinks = entity.get("sitelinks", {})

    enwiki_sitelink = sitelinks.get("enwiki")
    if enwiki_sitelink:
        return enwiki_sitelink.get("title")

    return None


@permacache("urbanstats/data/wikipedia/wikidata/query_sparlql")
def query_sparlql(column, value):
    query = f"""
    SELECT ?item WHERE {{
      ?item {column} "{value}" .
    }}
    LIMIT 1
    """
    for result in fetch_sparql(query):
        print(f"Found entity {result} for query {value}")
        return result

    return None


def fetch_sparql(query):
    sparql_url = "https://query.wikidata.org/sparql"
    headers = {
        "User-Agent": "urbanstats (https://github.com/kavigupta/urbanstats; contact@urbanstats.org)",
        "Accept": "application/json",
    }

    params = {"query": query, "format": "json"}

    response = requests.get(sparql_url, params=params, headers=headers, timeout=10)
    response.raise_for_status()
    data = response.json()

    bindings = data.get("results", {}).get("bindings", [])
    for binding in bindings:
        entity_uri = binding.get("item", {}).get("value", "")
        if "/entity/" in entity_uri:
            entity_id = entity_uri.split("/entity/")[-1]
            yield entity_id


@permacache("urbanstats/data/wikipedia/wikidata/fetch_sparql_as_list")
def fetch_sparql_as_list(query):
    return list(fetch_sparql(query))

