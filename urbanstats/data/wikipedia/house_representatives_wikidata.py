"""
US House members for a congressional district Wikidata item, via SPARQL.

Wikidata models each biennial stint as a separate position-held statement on the
person, with qualifiers P580/P582 (start/end) and P768 (electoral district).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional, Tuple

from permacache import permacache

from urbanstats.data.wikipedia.congressional_wikidata import (
    CongressionalDistrictWikidataSourcer,
)
from urbanstats.data.wikipedia.wikidata import fetch_sparql_bindings

# member of the United States House of Representatives
_US_HOUSE_POSITION = "wd:Q13218630"


def _parse_time(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _binding_str(binding: dict, key: str) -> Optional[str]:
    return binding.get(key, {}).get("value")


def _house_terms_from_bindings(
    bindings: list,
) -> List[Tuple[datetime, Optional[datetime], str]]:
    rows = []
    for b in bindings:
        name = _binding_str(b, "personLabel")
        if not name:
            continue
        start = _parse_time(_binding_str(b, "start"))
        if start is None:
            continue
        end = _parse_time(_binding_str(b, "end"))
        rows.append((start, end, name))
    return rows


def _biennium_starts(first_year: int, last_year: int) -> List[datetime]:
    """House terms begin January 3 of each odd year (modern era)."""
    if first_year % 2 == 0:
        first_year += 1
    return [
        datetime(year, 1, 3, tzinfo=timezone.utc)
        for year in range(first_year, last_year + 1, 2)
    ]


def _representative_at_biennium_start(
    term_start: datetime, rows: List[Tuple[datetime, Optional[datetime], str]]
) -> Optional[str]:
    """Pick the narrowest Wikidata interval that contains term_start."""
    best: Optional[Tuple[int, str]] = None
    for start, end, name in rows:
        if term_start < start:
            continue
        if end is not None and term_start >= end:
            continue
        span_days = (end - start).days if end is not None else 10**6
        if best is None or span_days < best[0]:
            best = (span_days, name)
    return best[1] if best else None


@permacache(
    "urbanstats/data/wikipedia/house_representatives_wikidata/representatives_string_for_district",
    version=1,
)
def representatives_string_for_district(wikidata_district_id: Optional[str]) -> str:
    """
    Human-readable list of US House members by two-year term for a district Q-id.

    Resolves one representative per biennium (Jan 3 odd year – Jan 3 odd year+2)
    using the most specific matching position-held statement in Wikidata.
    """
    if not wikidata_district_id:
        return ""

    query = f"""
    SELECT ?person ?personLabel ?start ?end WHERE {{
      ?person p:P39 ?st .
      ?st ps:P39 {_US_HOUSE_POSITION} .
      ?st pq:P768 wd:{wikidata_district_id} .
      OPTIONAL {{ ?st pq:P580 ?start }}
      OPTIONAL {{ ?st pq:P582 ?end }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}
    """
    bindings = fetch_sparql_bindings(query)
    rows = _house_terms_from_bindings(bindings)
    if not rows:
        return ""

    min_start = min(r[0] for r in rows)
    max_year = datetime.now(timezone.utc).year + 4
    bienniums = _biennium_starts(max(1789, min_start.year), max_year)
    lines = []
    for ts in bienniums:
        rep = _representative_at_biennium_start(ts, rows)
        if rep is None:
            continue
        y0 = ts.year
        y1 = y0 + 2
        lines.append(f"{y0}–{y1}: {rep}")

    # Most recent terms first (matches how users read current officeholders).
    lines.reverse()
    return "; ".join(lines)


@permacache(
    "urbanstats/data/wikipedia/house_representatives_wikidata/representatives_string_for_district_shortname",
    version=1,
)
def representatives_string_for_district_shortname(shortname: str) -> str:
    """Resolve district Wikidata from a shapefile shortname, then format members."""
    sourcer = CongressionalDistrictWikidataSourcer()
    try:
        wdid = sourcer.compute_wikidata(shortname)
    except ValueError:
        return ""
    return representatives_string_for_district(wdid)
