import re
from functools import lru_cache
from typing import Dict, List


def _words(*suffixes: str) -> List[str]:
    return [re.escape(suffix) for suffix in suffixes]


_YEAR = r"\(\d{4}\)"

# Case matters: the Census writes a place's kind in lower case, so "Salt Lake City city" loses
# only its last word.
_SUFFIXES: Dict[str, List[str]] = {
    "City": _words(
        "CDP",
        "city and borough",
        "city",
        "town",
        "village",
        "borough",
        "comunidad",
        "zona urbana",
        "municipality",
    ),
    "CCD": _words(
        "CCD",
        "township",
        "town",
        "city",
        "borough",
        "barrio",
        "precinct",
        "village",
        "district",
        "UT",
    ),
    "County": _words(
        "County",
        "city-County",
        "City-County",
        "Parish",
        "Borough",
        "City and Borough",
        "Census Area",
        "Municipality",
        "Municipio",
        "Planning Region",
    ),
    "CA Census Subdivision": _words(
        "Subdivision of County Municipality",
        "Indian Reserve",
        "Indian Settlement",
        "Rural Municipality",
        "Municipal District",
        "District Municipality",
        "County Municipality",
        "Summer Village",
        "Resort Village",
        "Village Nordique",
        "Reserve",
        "Town",
        "Municipalité",
        "Municipality",
        "Village",
        "Ville",
        "Township",
        "City",
        "Parish",
        "Paroisse",
        "District",
        "Hamlet",
        "Canton",
        "Settlement",
    ),
    "CA Census Division": _words(
        "Regional district",
        "Regional municipality",
        "United counties",
        "CRM",
        "CDR",
        "County",
        "Territory",
        "Region",
        "District",
        "district",
        "municipality",
    ),
    "CA CMA": _words("CMA"),
    "CA Population Center": _words("Population Center"),
    "CSA": _words("CSA"),
    "MSA": _words("MSA"),
    "Urban Area": _words("Urban Area"),
    "Urban Center": _words("Urban Center"),
    "Metropolitan Cluster": _words("Metropolitan Cluster"),
    "Media Market": _words("Media Market"),
    "Hospital Referral Region": _words("HRR"),
    "Hospital Service Area": _words("HSA"),
    "USDA County Type": _words("[USDA County Type]"),
    "Native Area": _words(
        "Reservation and Off-Reservation Trust Land",
        "and Off-Reservation Trust Land",
        "Off-Reservation Trust Land",
        "Hawaiian Home Land",
        "Indian Reservation",
        "Reservation",
        "Indian Rancheria",
        "Rancheria",
        "Indian Colony",
        "Colony",
        "Pueblo",
    ),
    "Native Statistical Area": _words("ANVSA", "SDTSA", "OTSA", "TDSA"),
    "School District": _words(
        "Independent School District",
        "Elementary School District",
        "County School District",
        "City School District",
        "Central School District",
        "Community School District",
        "Unified School District",
        "Local School District",
        "Area School District",
        "Public School District",
        "Township School District",
        "Borough School District",
        "High School District",
        "Free School District",
        "Regional School District",
        "School District",
        "Public Schools",
        "Community Schools",
        "Area Schools",
        "Municipal Schools",
        "School Corporation",
    ),
}

_PERSON_CIRCLE = [r"\d+[MB]PC"]


def _suffixes_for(typ: str) -> List[str]:
    if typ.endswith("Person Circle"):
        return _PERSON_CIRCLE
    if typ.startswith(
        (
            "Congressional District",
            "State House District",
            "State Senate District",
            "County Cross CD",
        )
    ):
        return [_YEAR]
    return _SUFFIXES.get(typ, [])


@lru_cache(maxsize=None)
def _pattern(typ: str) -> "re.Pattern[str] | None":
    suffixes = _suffixes_for(typ)
    if not suffixes:
        return None
    # the prefix is lazy, so of the suffixes that fit, the longest is the one removed
    return re.compile(rf"^(.+?) (?:{'|'.join(suffixes)})$")


def shortest_name(shortname: str, typ: str) -> str:
    """e.g. "Los Angeles" for "Los Angeles County", to label a map with."""
    pattern = _pattern(typ)
    if pattern is None:
        return shortname
    match = pattern.match(shortname)
    # e.g. "Lowville Academy and Central School District", where the suffix is only part of the kind
    if match is None or re.search(r" (and|of)$", match.group(1)):
        return shortname
    return match.group(1)
