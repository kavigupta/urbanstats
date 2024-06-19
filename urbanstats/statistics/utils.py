def fractionalize(shapefile_table, *columns):
    denominator = sum(shapefile_table[c] for c in columns)
    for c in columns:
        shapefile_table[c] = shapefile_table[c] / denominator
