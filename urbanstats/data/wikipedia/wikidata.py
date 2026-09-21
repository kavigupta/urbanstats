import time
from typing import Optional

import requests
from permacache import drop_if_equal, permacache

WDQS_TIMEOUT = 300
WDQS_ATTEMPTS = 5


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
    bindings = fetch_sparql_bindings(query)
    for binding in bindings:
        entity_uri = binding.get("item", {}).get("value", "")
        if "/entity/" in entity_uri:
            entity_id = entity_uri.split("/entity/")[-1]
            yield entity_id


def backoff_delay(response, attempt):
    """Seconds to wait before retrying, doubling each attempt absent a Retry-After."""
    # a 429/503 is falsy, so this must not test `response` for truthiness
    retry_after = response.headers.get("Retry-After") if response is not None else None
    try:
        # Retry-After is legally either seconds or an HTTP-date
        return float(retry_after)
    except (TypeError, ValueError):
        return 2**attempt


@permacache(
    "urbanstats/data/wikipedia/wikidata/fetch_sparql_bindings",
    key_function=dict(version=drop_if_equal(0)),
)
def fetch_sparql_bindings(query, version=0):
    del version
    sparql_url = "https://query.wikidata.org/sparql"
    headers = {
        "User-Agent": "urbanstats (https://github.com/kavigupta/urbanstats; contact@urbanstats.org)",
        "Accept": "application/json",
    }

    params = {"query": query, "format": "json"}

    for attempt in range(WDQS_ATTEMPTS):
        response = None
        try:
            response = requests.get(
                sparql_url, params=params, headers=headers, timeout=WDQS_TIMEOUT
            )
            response.raise_for_status()
            data = response.json()
            return data.get("results", {}).get("bindings", [])
        except (requests.RequestException, ValueError):
            # under load WDQS stalls past the timeout, and also serves error
            # pages with a 200, which is why a decode failure is retried too
            if attempt == WDQS_ATTEMPTS - 1:
                raise
        time.sleep(backoff_delay(response, attempt))
    raise AssertionError("unreachable")


@permacache("urbanstats/data/wikipedia/wikidata/fetch_sparql_as_list")
def fetch_sparql_as_list(query):
    return list(fetch_sparql(query))
