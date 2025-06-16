from urbanstats.geometry.shapefiles.shapefiles.urban_centers import (
    create_urban_center_like_shapefile,
)
from urbanstats.special_cases.taylor_metropolitan_cluster import (
    load_taylor_metropolitan_clusters_post_pruning,
)

METROPOLITAN_CLUSTERS = create_urban_center_like_shapefile(
    hash_key="metropolitan_clusters_4",
    path=load_taylor_metropolitan_clusters_post_pruning,
    meta=dict(
        type="Metropolitan Cluster", source="Taylor", type_category="International City"
    ),
    abbreviation="METC",
    data_credit=dict(
        text="""
        Taylor computed metropolitan clusters as follows:
        <ol>
        <li>
            A cell (3&quot;x3&quot; area in the GHS-POP grid) is initially designated as urban if it has:
            <ul>
            <li>at least 20% built area, or</li>
            <li>at least 10% built area, and at least 1000/km<sup>2</sup> population density.</li>
            </ul>
            Each diagonal-contiguous set of urban cells forms an urban sector.
        </li>
        <li>
            We then merge sectors into clusters in multiple stages:
            <ul>
            <li>sectors of any size with gaps under 300m are merged.</li>
            <li>sectors of at least 10000 population and with gaps under 1 km are merged.</li>
            <li>sectors of population A, B and with a gap under (min(pop(A), 50000) + min(pop(B), 50000))/20000 km are merged, if the gap contains no cells that have nonzero population or built surface that are not directly adjacent to the two sectors.</li>
            <li>sectors of under 10000 population at this stage are excluded; the remaining sectors are combined with the cells within 150m of their boundaries, and any now-overlapping sectors are merged.</li>
            <li>any holes in the sectors are filled, forming clusters.</li>
        </li>
        <li>
            A cluster is metropolitan if it has a population of at least 50000 and contains a core, and micropolitan otherwise. A core is a diagonal-contiguous set of cells which are either:
            <ul>
            <li>all at least 10% built area and at least 2500/km<sup>2</sup> population density, with a total population of 5000, or</li>
            <li>all at least 5000/km<sup>2</sup> population density, with a total population of 1000.</li>
            </ul>
        </li>
        </ol>
        <p>
        for efficiency, distances are computed taxicab on a diagonal grid; the overall effect of this is probably negligible.
        </p>
        <p>
        Clusters with an area of less than 0.5 km<sup>2</sup> are excluded.
        </p>

        <p>
        Names are assigned from datasets OSM, GeoNames cities, and Wikidata. In each case,
        a name is assigned to a cluster if either it is within the cluster, or the cluster is
        uniquely within a square of either 1&apos; by 1&apos; or 5&apos; by 5&apos; centered on the name.
        </p>

        <p>
        For each of these 3 datasets, we first see if any names are assigned to the cluster. If so,
        we prune all names with population less than half the largest, deduplicate the names for
        ones that are similar, and then prune to at most 3 names, then hyphenate the names together.
        If not, we move to the following dataset and repeat the process.
        </p>

        <p>
        if no names are assigned, the cluster is named after its centroid coordinates,
        with a parenthetical containing other geonames that map to the cluster. These
        parenthetical names should not be treated as official names.
        </p>
        """,
        linkText="Taylor (Elpis)",
        link="https://bsky.app/profile/elpis.bsky.social",
    ),
)
