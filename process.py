import numpy as np

from geometry import locate_blocks
from load_data import load_blocks


def load_and_process_data():
    blocks = load_blocks("/home/kavi/temp/census.csv")
    blocks["FIPS"] = blocks.FIPS.apply(
        lambda x: "02261" if x in {"02063", "02066"} else x
    )
    blocks["FIPS_SUB"] = blocks.FIPS + blocks.COUSUB.apply(lambda x: f"{int(x):05d}")
    population = np.array(
        blocks[
            [
                "POP100",
                "P0010003",
                "P0010004",
                "P0010005",
                "P0010006",
                "P0010007",
                "P0010008",
                "P0010009",
            ]
        ]
    )
    coordinates = np.array([blocks.INTPTLAT, blocks.INTPTLON]).T
    population_in_radius = locate_blocks(coordinates=coordinates, population=population)
    # blocks["population_within_1km"] = population_in_radius[0]
    blocks["population_weighted_within_1km"] = (
        population_in_radius[:, 0] * population[:, 0]
    )
    blocks["homogenous_population_weighted_within_1km"] = (
        population_in_radius * population
    )[:, 1:].sum(-1)
    return blocks


def groupby(blocks, x):
    grouped = blocks.groupby(x).sum()
    grouped["mean_within_1km"] = grouped.population_weighted_within_1km / grouped.POP100
    grouped["homogenity_within_1km"] = (
        grouped.homogenous_population_weighted_within_1km
        / grouped.population_weighted_within_1km
    )
    return grouped
