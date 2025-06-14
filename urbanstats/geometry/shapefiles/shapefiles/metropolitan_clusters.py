from urbanstats.geometry.shapefiles.shapefiles.urban_centers import (
    create_urban_center_like_shapefile,
)
from urbanstats.special_cases.taylor_metropolitan_cluster import (
    load_taylor_metropolitan_clusters_post_pruning,
)

METROPOLITAN_CLUSTERS = create_urban_center_like_shapefile(
    hash_key="metropolitan_clusters_3",
    path=load_taylor_metropolitan_clusters_post_pruning,
    meta=dict(
        type="Metropolitan Cluster", source="Taylor", type_category="International City"
    ),
    abbreviation="METC",
    data_credit=dict(
        text="See Taylor (elpis on bluesky) for more information on the methodology used to define metropolitan clusters.",
        linkText="Taylor's Bluesky",
        link="https://bsky.app/profile/elpis.bsky.social",
    ),
)
