import pandas as pd
import us

from urbanstats.geometry.historical_counties.historical_county_file import (
    counties_at_date,
)
from urbanstats.geometry.historical_counties.suo_data_source import SUODataSource


def load_toncmg_raw_2024():
    frame = pd.read_csv(
        "election-data/tonmcg/2024_US_County_Level_Presidential_Results.csv",
        dtype={"county_fips": str},
    )
    frame = frame[
        ["county_name", "county_fips", "votes_dem", "votes_gop", "total_votes"]
    ].rename(
        columns={
            "county_name": "name",
            "county_fips": "fips",
            "votes_dem": "dem",
            "votes_gop": "gop",
            "total_votes": "total",
        }
    )
    return frame


def load_toncmg_raw_2008_2012(year):
    frame = pd.read_csv(
        "election-data/tonmcg/US_County_Level_Presidential_Results_08-16.csv",
        dtype={"fips_code": str},
    )
    dem = f"dem_{year}"
    gop = f"gop_{year}"
    total = f"total_{year}"
    frame = frame[["county", "fips_code", dem, gop, total]].rename(
        columns={
            "county": "name",
            "fips_code": "fips",
            dem: "dem",
            gop: "gop",
            total: "total",
        }
    )
    return frame


def load_toncmg_raw_for_year(year):
    if year == 2024:
        return load_toncmg_raw_2024()
    if year in (2008, 2012):
        return load_toncmg_raw_2008_2012(year)
    raise ValueError(f"No data for {year}")


def load_tonmcg_election(year):
    frame = load_toncmg_raw_for_year(year)

    special_cases = []

    alaska_total = frame[frame.fips.str.startswith("02")][["dem", "gop", "total"]]
    if alaska_total.shape[0]:
        assert alaska_total.shape[0] == 40, alaska_total.shape[
            0
        ]  # 40 state legislative districts
        alaska_total = alaska_total.sum()
        special_cases.append(
            {
                "name": "Alaska",
                "fips": "02",
                "dem": alaska_total.dem,
                "gop": alaska_total.gop,
                "total": alaska_total.total,
            }
        )
    dc_total = frame[frame.fips.str.startswith("11")][["dem", "gop", "total"]]
    if dc_total.shape[0]:
        assert dc_total.shape[0] in {1, 8}, dc_total.shape[0]  # 8 wards or 1 county
        dc_total = dc_total.sum()
        special_cases.append(
            {
                "name": "District of Columbia",
                "fips": "11001",
                "dem": dc_total.dem,
                "gop": dc_total.gop,
                "total": dc_total.total,
            }
        )
    # Exclude Alaska and DC, these are using districts and wards
    frame = frame[
        frame.fips.apply(lambda x: x[:2] not in (us.states.AK.fips, us.states.DC.fips))
    ]
    special_cases = pd.DataFrame(special_cases)
    return pd.concat([frame, special_cases], ignore_index=True)


def merge_alaska(counties):
    non_alaska = counties[counties.FIPS.apply(lambda x: not x.startswith("02"))].copy()
    alaska = counties[counties.FIPS.apply(lambda x: x.startswith("02"))].copy()
    row = {
        "FIPS": "02",
        "FULL_NAME": "Alaska",
        "suos": sorted({x for y in alaska.suos for x in y}),
    }
    alaska = pd.DataFrame([row])
    return pd.concat([non_alaska, alaska], ignore_index=True)


def load_with_suos(year, date, *special_cases):
    election_data = load_tonmcg_election(year)
    special_cases = pd.DataFrame(list(special_cases))
    election_data = pd.concat([election_data, special_cases], ignore_index=True)
    counties = counties_at_date(date)[["FIPS", "FULL_NAME", "suos"]]
    counties = merge_alaska(counties)
    extra_counties_in_election_data = set(election_data.fips) - set(counties.FIPS)
    assert not extra_counties_in_election_data, extra_counties_in_election_data
    missing = counties[~counties.FIPS.isin(election_data.fips)]
    assert not missing.shape[0], missing.sort_values("FIPS")
    return counties.merge(election_data, left_on="FIPS", right_on="fips", how="left")


def load_2008_suo():
    return load_with_suos(
        2008,
        "2008-11-04",
        {"name": "Kalawao", "fips": "15005", "dem": 24, "gop": 6, "total": 31},
        {
            "name": "Bedford Ind. City",
            "fips": "51515",
            "dem": 1208,
            "gop": 1497,
            "total": 1208 + 1497 + 29,
        },
        {
            "name": "Alaska",
            "fips": "02",
            "dem": 123_594,
            "gop": 193_841,
            "total": 327_341,
        },
    )


def load_2012_suo():
    return load_with_suos(
        2012,
        "2013-07-01",  # later date to capture the dissolution of Bedford Ind. City
        {"name": "Kalawao", "fips": "15005", "dem": 25, "gop": 2, "total": 27},
        {
            "name": "Alaska",
            "fips": "02",
            "dem": 122_640,
            "gop": 164_676,
            "total": 300_495,
        },
    )


def load_2024_suo():
    return load_with_suos(
        2024,
        "2024-11-05",
        {"name": "Kalawao", "fips": "15005", "dem": 15, "gop": 3, "total": 18},
    )


tonmcg_elections = {
    "2008 Presidential Election": SUODataSource(
        "tonmcg-2008_2", load_2008_suo, ["dem", "gop", "total"]
    ),
    "2012 Presidential Election": SUODataSource(
        "tonmcg-2012_2", load_2012_suo, ["dem", "gop", "total"]
    ),
    "2024 Presidential Election": SUODataSource(
        "tonmcg-2024_2", load_2024_suo, ["dem", "gop", "total"]
    ),
}
