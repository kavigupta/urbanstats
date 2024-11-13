from permacache import permacache


def compute_universes_for_shapefile(shapefiles, shapefile):
    """
    Computes universes for a given shapefile using a universe provider

    :param provider: The universe provider to use
    :param shapefiles: A dictionary of shapefiles, mapping relevant shapefile keys to shapefiles
    :param shapefile: The shapefile to compute universes for
    """
    relevant_shapefiles = shapefile.universe_provider.relevant_shapefiles()
    return _compute_universes_for_shapefile_cached(
        shapefile.universe_provider,
        {k: shapefiles[k] for k in relevant_shapefiles},
        shapefile,
    )


@permacache(
    "urbanstats/universe/universe_provider/universe_provider/_compute_universes_for_shapefile_cached_3",
    key_function=dict(
        provider=lambda provider: provider.hash_key(),
        shapefiles=lambda shapefiles: {k: v.hash_key for k, v in shapefiles.items()},
        shapefile=lambda shapefile: shapefile.hash_key,
    ),
)
def _compute_universes_for_shapefile_cached(provider, shapefiles, shapefile):
    """
    Computes universes for a given shapefile using a universe provider

    :param provider: The universe provider to use
    :param shapefiles: A dictionary of shapefiles, mapping relevant shapefile keys to shapefiles
    :param shapefile: The shapefile to compute universes for
    """
    t = shapefile.load_file()
    universes = provider.universes_for_shapefile(shapefiles, shapefile, t)
    return universes
