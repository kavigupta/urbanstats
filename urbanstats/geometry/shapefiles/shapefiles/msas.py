from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.geometry.shapefiles.utils import name_components
from urbanstats.universe.universe_provider.constants import us_domestic_provider

MSAs = Shapefile(
    hash_key="census_msas_4",
    path="named_region_shapefiles/cb_2018_us_cbsa_500k.zip",
    shortname_extractor=lambda x: name_components("MSA", x)[0],
    longname_extractor=lambda x: ", ".join(name_components("MSA", x, abbreviate=True)),
    filter=lambda x: True,
    meta=dict(type="MSA", source="Census", type_category="Census"),
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
)
