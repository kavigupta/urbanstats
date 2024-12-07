from permacache import permacache, stable_hash

import geopandas as gpd
import shapely


pruid_to_province = {
    "48": "Alberta, Canada",
    "59": "British Columbia, Canada",
    "46": "Manitoba, Canada",
    "13": "New Brunswick, Canada",
    "10": "Newfoundland and Labrador, Canada",
    "61": "Northwest Territories, Canada",
    "12": "Nova Scotia, Canada",
    "62": "Nunavut, Canada",
    "35": "Ontario, Canada",
    "11": "Prince Edward Island, Canada",
    "24": "Quebec, Canada",
    "47": "Saskatchewan, Canada",
    "60": "Yukon, Canada",
}

pruid_to_province_abbr = {
    "48": "AB",
    "59": "BC",
    "46": "MB",
    "13": "NB",
    "10": "NL",
    "61": "NT",
    "12": "NS",
    "62": "NU",
    "35": "ON",
    "11": "PE",
    "24": "QC",
    "47": "SK",
    "60": "YT",
}


@permacache(
    "urbanstats/geometry/shapefiles/load_canada_shapefile/canada_shape",
    key_function=dict(countries_shapefile=lambda x: x.hash_key),
)
def compute_canada_shape(countries_shapefile):
    sh = countries_shapefile.load_file()
    sh = sh[sh.longname == "Canada"]
    return sh.iloc[0].geometry


@permacache(
    "urbanstats/geometry/shapefiles/load_canada_shapefile/compute_qconmt",
    key_function=dict(subnationals_shapefile=lambda x: x.hash_key),
)
def compute_qconmt(subnationals_shapefile):
    sh = subnationals_shapefile.load_file()
    geos = [
        sh[sh.longname == province].geometry.iloc[0]
        for province in ["Quebec, Canada", "Ontario, Canada", "Manitoba, Canada"]
    ]
    return shapely.ops.unary_union(geos)


@permacache(
    "urbanstats/geometry/shapefiles/load_canada_shapefile/load_canadian_shapefile_with_canada_shape_2",
    key_function=dict(
        canada_shape=lambda x: stable_hash(shapely.to_geojson(x)),
        qconmt_shape=lambda x: stable_hash(shapely.to_geojson(x)),
    ),
)
def load_canadian_shapefile_with_canada_shape(
    shapefile_path, canada_shape, qconmt_shape
):
    data = gpd.read_file(shapefile_path)
    data = data.to_crs(epsg=4326)
    data["geometry"] = data["geometry"].intersection(canada_shape)
    nunavut_mask = data.PRUID.apply(
        lambda x: pruid_to_province[str(x)] == "Nunavut, Canada"
    )
    data.loc[nunavut_mask, "geometry"] = data.loc[nunavut_mask, "geometry"].difference(
        qconmt_shape
    )
    return data


def load_canadian_shapefile(
    shapefile_path, countries_shapefile, subnationals_shapefile
):
    canada_shape = compute_canada_shape(countries_shapefile)
    qtconmt_shape = compute_qconmt(subnationals_shapefile)
    return load_canadian_shapefile_with_canada_shape(
        shapefile_path, canada_shape, qtconmt_shape
    )
