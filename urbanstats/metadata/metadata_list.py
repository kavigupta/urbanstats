from .metadata_column import (
    CongressionalRepresentativesMetadata,
    DisplayedMetadata,
    ExternalLinkMetadata,
)
from .congressional_representatives import TERM_START_YEARS, key_for_term_start_year


def representative_display_name(term_start_year: int) -> str:
    term_end_suffix = str(term_start_year + 1)[-2:]
    return f"Representative ({term_start_year}-{term_end_suffix})"

metadata_types = {
    "geoid": DisplayedMetadata(
        str, "FIPS", category="geoid", data_credit_explanation_page="geoid"
    ),
    "scgc": DisplayedMetadata(
        str, "StatCan GeoCode", category="geoid", data_credit_explanation_page="geoid"
    ),
    "wikidata": ExternalLinkMetadata("Wikidata", "https://www.wikidata.org/wiki/"),
    "wikipedia_page": ExternalLinkMetadata(
        "Wikipedia", "https://en.wikipedia.org/wiki/", normalizer="wikipedia"
    ),
    "iso": DisplayedMetadata(
        str, "ISO Code", category="geoid", data_credit_explanation_page="geoid"
    ),
    **{
        key_for_term_start_year(term_start_year): CongressionalRepresentativesMetadata(
            str,
            representative_display_name(term_start_year),
            category="geoid",
            data_credit_explanation_page="geoid",
            term_start_year=term_start_year,
        )
        for term_start_year in TERM_START_YEARS
    },
}
