from dataclasses import dataclass

import pandas as pd

from urbanstats.data.canada.canadian_da_data import CensusTables


def canadian_race_tables() -> CensusTables:
    return CensusTables(
        [
            "Total - Visible minority for the population in private households - 25% sample data (117)",
            "Total - Indigenous identity for the population in private households - 25% sample data (44)",
        ],
        {
            "tvmp": [
                "  Total visible minority population (118)",
            ],
            "nvmp": [
                "  Not a visible minority (120)",
            ],
            "native": [
                "  Indigenous identity (45)",
            ],
            "asian": [
                "    South Asian",
                "    Chinese",
                "    Filipino",
                "    Southeast Asian",
                "    Korean",
                "    Japanese",
            ],
            "black": [
                "    Black",
            ],
            "hispanic": [
                "    Latin American",
            ],
            "vm_white": [
                "    Arab",
                "    West Asian",
            ],
            "other / mixed": [
                "    Visible minority, n.i.e. (119)",
                "    Multiple visible minorities",
            ],
            None: [
                "Total - Visible minority for the population in private households - 25% sample data (117)",
            ]
            + [
                "Total - Indigenous identity for the population in private households - 25% sample data (44)",
                "    Single Indigenous responses (46)",
                "      First Nations (North American Indian)",
                "      Métis",
                "      Inuk\xa0(Inuit)",
                "    Multiple Indigenous responses (47)",
                "    Indigenous responses not included elsewhere (48)",
                "  Non-Indigenous identity",
            ],
        },
        "population",
    )


@dataclass(frozen=True)
class CanadianRaceCounts:
    """
    Counts in the US census's race categories. White is everyone not a visible minority or
    Indigenous, plus visible minorities who are White; visible minorities in no category go to
    other / mixed.
    """

    def compute(self, shapefile):
        t = canadian_race_tables().compute(2021, shapefile).copy()
        white = t["nvmp"] - t["native"]
        assert (
            white[white < 0].sum() > -100
        ), f"Negative white sum is {white[white < 0].sum()}, which is too high. Check the underlying data for issues."
        unallocated = (
            t["tvmp"]
            - t["asian"]
            - t["black"]
            - t["hispanic"]
            - t["vm_white"]
            - t["other / mixed"]
        )
        assert (
            unallocated[unallocated < 0].sum() > -5000
        ), f"Unallocated TVMP sum is {unallocated[unallocated < 0].sum()}, which is too high. Check the underlying data for issues."
        return pd.DataFrame(
            {
                "white": white.clip(lower=0) + t["vm_white"],
                "hispanic": t["hispanic"],
                "black": t["black"],
                "asian": t["asian"],
                "native": t["native"],
                "hawaiian_pi": t["hispanic"] * 0.0,
                "other / mixed": t["other / mixed"] + unallocated.clip(lower=0),
            }
        )
