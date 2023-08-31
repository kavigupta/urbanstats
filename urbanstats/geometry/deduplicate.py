import geopandas as gpd


def deduplicate_polygons(result):
    shape = result.unary_union
    return (
        gpd.GeoDataFrame(geometry=[shape], crs=result.crs)
        .explode(index_parts=True)
        .reset_index(drop=True)
    )
