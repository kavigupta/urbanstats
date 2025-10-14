from urbanstats.data.wikipedia.wikidata_sourcer import SimpleWikidataSourcer
from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.geometry.shapefiles.utils import name_components
from urbanstats.universe.universe_provider.constants import us_domestic_provider


def csa_or_msa(hash_key, typ, census_name, wikidata_sourcer, path):
    return Shapefile(
        hash_key=hash_key,
        path=path,
        shortname_extractor=lambda x: name_components(typ, x)[0],
        longname_extractor=lambda x: ", ".join(
            name_components(typ, x, abbreviate=True)
        ),
        additional_columns_computer={"geoid": lambda x: x.GEOID},
        filter=lambda x: True,
        meta=dict(type=typ, source="Census", type_category="Census"),
        does_overlap_self=False,
        universe_provider=us_domestic_provider(),
        subset_masks={"USA": SelfSubset()},
        abbreviation=typ,
        data_credit=dict(
            linkText="US Census",
            link="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html",
        ),
        include_in_syau=True,
        special_data_sources=["composed_of_counties", ("census", census_name)],
        metadata_columns=["geoid"],
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
