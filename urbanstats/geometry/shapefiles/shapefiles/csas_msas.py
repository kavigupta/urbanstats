from urbanstats.data.wikipedia.wikidata_sourcer import SimpleWikidataSourcer
from urbanstats.geometry.shapefiles.row_functions import column
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import us_domestic_provider


def csa_or_msa(hash_key, typ, census_name, wikidata_sourcer, path):
    return make_shapefile(
        hash_key=hash_key,
        path=path,
        shortname_extractor=column("NAME").split_part(", ", 0) + " " + typ,
        cleanname_extractor=column("NAME").split_part(", ", 0),
        longname_extractor=column("NAME").split_part(", ", 0)
        + " "
        + typ
        + ", "
        + column("NAME").split_part(", ", 1)
        + ", USA",
        additional_columns_computer={"geoid": column("GEOID")},
        filter=lambda x: True,
        meta=dict(type=typ, source="Census", type_category="Census"),
        does_overlap_self=False,
        universe_provider=us_domestic_provider(),
        source_countries=InCountry("USA"),
        abbreviation=typ,
        data_credit=dict(
            linkText="US Census",
            link="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html",
        ),
        include_in_syau=True,
        special_data_sources=[
            "composed_of_counties",
            ("census", census_name),
            "congressional_representatives_indirect",
        ],
        wikidata_sourcer=wikidata_sourcer,
    )


CSAs = csa_or_msa(
    "census_csas_4",
    "CSA",
    "combined statistical area",
    None,
    "named_region_shapefiles/cb_2018_us_csa_500k.zip",
)
MSAs = csa_or_msa(
    "census_msas_4",
    "MSA",
    "metropolitan statistical area/micropolitan statistical area",
    SimpleWikidataSourcer("wdt:P882", "geoid"),
    "named_region_shapefiles/cb_2018_us_cbsa_500k.zip",
)
