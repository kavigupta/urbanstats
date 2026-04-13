from .metadata_column import (
    CongressionalRepresentativesMetadata,
    DisplayedMetadata,
    ExternalLinkMetadata,
)

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
    "congressional_representatives": CongressionalRepresentativesMetadata(
        str,
        "Representatives",
        category="election",
        data_credit_explanation_page="congressional_representatives",
    ),
}
