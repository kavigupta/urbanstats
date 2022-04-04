import numpy as np

from types import SimpleNamespace

from permacache import permacache

from geometry import locate_blocks
from load_data import load_blocks


def load_and_process_data(*, year, radius):
    assert year == 2020
    blocks = load_blocks(f"/home/kavi/temp/census_{year}.csv")
    blocks["FIPS"] = blocks.FIPS.apply(
        lambda x: "02261" if x in {"02063", "02066"} else x
    )
    blocks["FIPS_SUB"] = blocks.FIPS + blocks.COUSUB.apply(lambda x: f"{int(x):05d}")
    population = np.array(
        blocks[
            [
                "POP100",
            ]
        ]
    )
    coordinates = np.array([blocks.INTPTLAT, blocks.INTPTLON]).T
    density_in_radius = locate_blocks(
        coordinates=coordinates, population=population, radius=radius
    ) / (np.pi * radius ** 2)
    blocks["population_density_weighted"] = density_in_radius[:, 0] * population[:, 0]
    return blocks


def groupby(blocks, x):
    grouped = blocks.groupby(x).sum()
    grouped["mean_density_weighted"] = (
        grouped.population_density_weighted / grouped.POP100
    )
    return grouped


@permacache("population_density/process/grouped_data_2")
def grouped_data(*, radius, year):
    blocks = load_and_process_data(radius=radius, year=year)
    by_zcta = groupby(blocks, "ZCTA")
    by_subcounty = groupby(blocks, "FIPS_SUB")
    by_county = groupby(blocks, "FIPS")
    by_state = groupby(blocks, "STUSAB")
    return SimpleNamespace(
        by_subcounty=by_subcounty,
        by_county=by_county,
        by_state=by_state,
        by_zcta=by_zcta,
    )
