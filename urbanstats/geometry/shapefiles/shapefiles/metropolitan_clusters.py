

from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import FilteringSubset
from urbanstats.special_cases.taylor_metropolitan_cluster import load_taylor_metropolitan_clusters
from urbanstats.universe.universe_provider.combined_universe_provider import CombinedUniverseProvider
from urbanstats.universe.universe_provider.constants import INTERNATIONAL_PROVIDERS
from urbanstats.universe.universe_provider.universe_provider import UrbanCenterlikeStateUniverseProvider


METROPOLITAN_CLUSTERS = Shapefile(
    hash_key="metropolitan_clusters_1",
    path=load_taylor_metropolitan_clusters,
    shortname_extractor=lambda x: x["shortname"],
    longname_extractor=lambda x: x["longname"],
    additional_columns_to_keep=["subnationals_ISO_CODE"],
    meta=dict(type="Metropolitan Clusters", source="Taylor", type_category="International"),
    filter=lambda x: True,
    special_data_sources=["international_gridded_data"],
    universe_provider=CombinedUniverseProvider(
        [*INTERNATIONAL_PROVIDERS, UrbanCenterlikeStateUniverseProvider()]
    ),
    subset_masks={
        "USA": FilteringSubset("US Metropolitan Cluster", lambda x: "USA" == x.suffix),
        "Canada": FilteringSubset("CA Metropolitan Cluster", lambda x: "Canada" == x.suffix),
    },
    abbreviation="METC",
    data_credit=dict(
        text="See Taylor (elpis on bluesky) for more information on the methodology used to define metropolitan clusters.",
        linkText="Taylor's Bluesky",
        link="https://bsky.app/profile/elpis.bsky.social",
    ),
    include_in_syau=True,
)
