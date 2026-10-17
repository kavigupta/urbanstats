from permacache import stable_hash

from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.geometry.shapefiles.shapefile import keyed_on


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


@permacache_with_remapping_pickle(
    "urbanstats/universe/universe_provider/universe_provider/_compute_universes_for_shapefile_cached_3",
    key_function=dict(
        provider=lambda provider: provider.hash_key(),
        shapefiles=lambda shapefiles: {
            k: keyed_on("longname")(v) for k, v in shapefiles.items()
        },
        # providers read the longnames and the intermediate columns
        shapefile=lambda shapefile: stable_hash(
            shapefile.key_for_columns(
                ["longname", *shapefile.intermediate_computation_columns]
            )
        ),
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
