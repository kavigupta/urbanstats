from datetime import datetime, timedelta

import geopandas as gpd
import pandas as pd
import us
from permacache import permacache

end_of_time = "9999-12-31"


@permacache("urbanstats/geometry/historical_counties/all_counties/get_all_counties_2")
def get_all_counties():
    data = gpd.read_file(
        "named_region_shapefiles/historical-counties/US_AtlasHCB_Counties/US_HistCounties_Shapefile/US_HistCounties.shp"
    )
    data = data[
        [
            "STATE_TERR",
            "FIPS",
            "START_DATE",
            "END_DATE",
            "CNTY_TYPE",
            "FULL_NAME",
            "geometry",
        ]
    ]
    data.START_DATE = data.START_DATE.apply(lambda x: x.replace("/", "-"))
    data.END_DATE = data.END_DATE.apply(lambda x: x.replace("/", "-"))
    data.loc[data.END_DATE == "2000-12-31", "END_DATE"] = end_of_time
    county_2010 = gpd.read_file(
        "named_region_shapefiles/gz_2010_us_050_00_500k.zip"
    ).rename(columns={"STATE": "STATEFP", "COUNTY": "COUNTYFP"})
    # county_2015 = gpd.read_file("named_region_shapefiles/cb_2015_us_county_500k.zip")
    county_2022 = gpd.read_file("named_region_shapefiles/cb_2022_us_county_500k.zip")
    data = handle_recent_changes(data, county_2010=county_2010, county_2022=county_2022)
    use_latest_shapefile(data, county_2022)
    return data


def use_latest_shapefile(data, county_2022):
    recents = data[data.END_DATE == end_of_time]
    counties_shapefile = county_2022.copy()
    counties_shapefile["geoid"] = (
        counties_shapefile.STATEFP + counties_shapefile.COUNTYFP
    )
    extra_in_shapefile = {
        us.states.lookup(x[:2])
        for x in set(counties_shapefile.geoid) - set(recents.FIPS)
    }
    assert extra_in_shapefile.issubset(set(us.states.TERRITORIES)), extra_in_shapefile
    extra_in_recents = set(recents.FIPS) - set(counties_shapefile.geoid)
    assert not extra_in_recents, extra_in_recents
    counties_shapefile = counties_shapefile.set_index("geoid")
    geometries = list(counties_shapefile.loc[recents.FIPS].geometry)
    data.loc[recents.index, "geometry"] = geometries


def date_minus_one(date):
    dt = datetime.strptime(date, "%Y-%m-%d")
    dt = dt - timedelta(days=1)
    return dt.strftime("%Y-%m-%d")


def terminate(frame, date, fips):
    mask = (frame.FIPS == fips) & (frame.END_DATE == end_of_time)
    assert mask.sum() == 1, f"expected exactly one match for {fips}, got {mask.sum()}"
    frame.loc[mask, "END_DATE"] = date


def introduce(frame, date, fips, county_source, *, alter=False):
    if alter:
        # just terminate the old one
        terminate(frame, date_minus_one(date), fips)
    mask = county_source.STATEFP + county_source.COUNTYFP == fips
    assert mask.sum() == 1, f"expected exactly one match for {fips}, got {mask.sum()}"
    row = county_source.loc[mask].iloc[0]
    county_name = row.NAME
    # add as needed. should crash if something unexpected
    county_type = {
        "Muny": "Municipality",
        "CA": "Census Area",
        "Cty&Bor": "County and Borough",
        "Borough": "Borough",
        "County": "County",
        "city": "City",
        "PL": "Planning Region",
        "04": "Borough",
        "05": "Census Area",
        "06": "County",
    }[row.LSAD]

    row = pd.Series(
        {
            "FIPS": fips,
            "START_DATE": date,
            "END_DATE": end_of_time,
            "CNTY_TYPE": county_type,
            "FULL_NAME": county_name,
            "geometry": row.geometry,
            "STATE_TERR": us.states.lookup(row.STATEFP).name,
        }
    )
    frame = pd.concat([frame, pd.DataFrame([row])], ignore_index=True)
    return frame


def handle_recent_changes(frame, *, county_2010, county_2022):
    """
    handle recent changes as listed in https://www.census.gov/programs-surveys/geography/technical-documentation/county-changes.html
    """
    # these "pointless string statements" are documentation for each change
    # pylint: disable=pointless-string-statement
    frame = frame.copy()
    # AK
    """
    2007-06-20: split
        deleted Skagway-Hoonah-Angoon Census Area, Alaska (02-232)
        created Skagway Municipality (02-230)
        created Hoonah-Angoon Census Area (02-105)
    """

    terminate(frame, "2007-06-19", "02232")
    frame = introduce(frame, "2007-06-20", "02230", county_2010)
    frame = introduce(frame, "2007-06-20", "02105", county_2010)

    """
    2008-05-19/2008-06-01: something complicated
        deleted Prince of Wales-Outer Ketchikan Census Area, Alaska (02-201)
        deleted Wrangell-Petersburg Census Area, Alaska (02-280)
        created Petersburg Census Area, Alaska (02-195)
        created Prince of Wales-Hyder Census Area, Alaska (02-198)
        created Wrangell City and Borough, Alaska (02-275)
        altered Ketchikan Gateway Borough, Alaska (02-130)
    """
    terminate(frame, "2008-05-31", "02201")
    terminate(frame, "2008-05-31", "02280")
    frame = introduce(frame, "2008-06-01", "02195", county_2010)
    frame = introduce(frame, "2008-06-01", "02198", county_2010)
    frame = introduce(frame, "2008-06-01", "02275", county_2010)
    frame = introduce(frame, "2008-06-01", "02130", county_2010, alter=True)
    """
    2013-01-03: split
        altered Petersburg Census Area, Alaska and renamed it to Petersburg Borough, Alaska (02-195)
        altered Hoonah-Angoon Census Area, Alaska (02-105)
        altered Prince of Wales-Hyder Census Area, Alaska (02-198)
    """
    frame = introduce(frame, "2013-01-03", "02195", county_2022, alter=True)
    frame = introduce(frame, "2013-01-03", "02105", county_2022, alter=True)
    frame = introduce(frame, "2013-01-03", "02198", county_2022, alter=True)

    """
    2015-07-01: renamed
        renamed Wade Hampton Census Area, Alaska (02-270) to Kusilvak Census Area, Alaska (02-158). No boundary changes.
    """
    terminate(frame, "2015-06-30", "02270")
    frame = introduce(frame, "2015-07-01", "02158", county_2022)

    """
    2019-02-02: split
        deleted Valdez-Cordova Census Area, Alaska (02-261)
        created Chugach Census Area, Alaska (02-063)
        created Copper River Census Area, Alaska (02-066)
    """

    terminate(frame, "2019-02-01", "02261")
    frame = introduce(frame, "2019-02-02", "02063", county_2022)
    frame = introduce(frame, "2019-02-02", "02066", county_2022)

    # CO
    """
    2001-11-15: carved new city from parts of 4 counties
        altered Adams County, Colorado (08-001)
        altered Boulder County, Colorado (08-013)
        altered Jefferson County, Colorado (08-059)
        altered Weld County, Colorado (08-123)

        created Broomfield County, Colorado (08-014)
    """

    frame = introduce(frame, "2001-11-15", "08001", county_2010, alter=True)
    frame = introduce(frame, "2001-11-15", "08013", county_2010, alter=True)
    frame = introduce(frame, "2001-11-15", "08059", county_2010, alter=True)
    frame = introduce(frame, "2001-11-15", "08123", county_2010, alter=True)
    frame = introduce(frame, "2001-11-15", "08014", county_2010)

    # VA
    """
    2001-07-01: deleted independent city, added to county
        deleted Clifton Forge (independent) city, Virginia (51-560)
        altered Alleghany County, Virginia (51-005)
    """
    terminate(frame, "2001-06-30", "51560")
    frame = introduce(frame, "2001-07-01", "51005", county_2010, alter=True)

    """
    2003-07-01: exchange of territory
        altered York County, Virginia (51-199)
        altered Newport News (independent) city, Virginia (51-700)
    """
    frame = introduce(frame, "2003-07-01", "51199", county_2010, alter=True)
    frame = introduce(frame, "2003-07-01", "51700", county_2010, alter=True)

    """
    2013-07-01: deleted independent city, added to county
        deleted Bedford (independent) city, Virginia (51-515)
        altered Bedford County, Virginia (51-019)
    """
    terminate(frame, "2013-06-30", "51515")
    frame = introduce(frame, "2013-07-01", "51019", county_2022, alter=True)

    # ND
    """
    2015-05-01: renamed
        renamed Shannon County, South Dakota (46-113) to Oglala Lakota County, South Dakota (46-102). No boundary changes.
    """
    terminate(frame, "2015-04-30", "46113")
    frame = introduce(frame, "2015-05-01", "46102", county_2022)

    # CT
    """
    2022-06-02: completely new county system
    """

    frame.loc[
        (frame.STATE_TERR == "Connecticut") & (frame.END_DATE == end_of_time),
        "END_DATE",
    ] = "2022-06-01"

    ct22 = county_2022[county_2022.STATE_NAME == "Connecticut"]
    for _, row in ct22.iterrows():
        fips = row.STATEFP + row.COUNTYFP
        frame = introduce(frame, "2022-06-02", fips, county_2022)

    return frame
