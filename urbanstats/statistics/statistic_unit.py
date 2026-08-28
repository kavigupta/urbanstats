"""
The units statistics are measured in. Every name here is a UnitType in
react/src/utils/unit.ts, which decides how a number in that unit is written.
"""

UNIT_TYPES = frozenset(
    {
        "percentage",
        "percentageChange",
        "fatalities",
        "fatalitiesPerCapita",
        "density",
        "population",
        "area",
        "distanceInKm",
        "distanceInM",
        "democraticMargin",
        "temperature",
        "time",
        "distancePerYear",
        "contaminantLevel",
        "number",
        "usd",
        "minutes",
        "partyPctBlue",
        "partyPctRed",
        "partyPctOrange",
        "partyPctTeal",
        "partyPctGreen",
        "partyPctPurple",
        "partyChangeBlue",
        "partyChangeRed",
        "partyChangeOrange",
        "partyChangeTeal",
        "partyChangeGreen",
        "partyChangePurple",
        "leftMargin",
    }
)
