from permacache import stable_hash

from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.geometry.shapefiles.shapefile import join_layers


def compute_universes_for_shapefile(shapefiles, shapefile):
    """
    Computes universes for a given shapefile using a universe provider

    :param shapefiles: A dictionary of shapefiles, mapping relevant shapefile keys to shapefiles
    :param shapefile: The shapefile to compute universes for
    """
    relevant_shapefiles = shapefile.universe_provider.relevant_shapefiles()
    return _compute_universes_for_shapefile_cached(
        shapefile.universe_provider,
        {k: shapefiles[k].names for k in relevant_shapefiles},
        shapefile.names,
        shapefile.identified,
    )


@permacache_with_remapping_pickle(
    "urbanstats/universe/universe_provider/universe_provider/_compute_universes_for_shapefile_cached_3",
    key_function=dict(
        provider=lambda provider: provider.hash_key(),
        names_by_key=stable_hash,
        names=stable_hash,
        identified=stable_hash,
    ),
)
def _compute_universes_for_shapefile_cached(provider, names_by_key, names, identified):
    table = join_layers(names, identified)
    return provider.universes_for_shapefile(names_by_key, names, table)
