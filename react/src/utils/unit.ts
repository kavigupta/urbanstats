export type UnitType = 'percentage' | 'percentageChange' | 'fatalities' | 'fatalitiesPerCapita' | 'density' | 'population'
    | 'area' | 'distanceInKm' | 'distanceInM' | 'democraticMargin' | 'temperature' | 'time' | 'distancePerYear'
    | 'contaminantLevel' | 'number' | 'usd' | 'minutes'
    | 'partyPctBlue' | 'partyPctRed' | 'partyPctOrange' | 'partyPctTeal' | 'partyPctGreen' | 'partyPctPurple'
    | 'partyChangeBlue' | 'partyChangeRed' | 'partyChangeOrange' | 'partyChangeTeal' | 'partyChangeGreen' | 'partyChangePurple'
    | 'leftMargin'

// Validated list of all unit types - this ensures we have every value from UnitType
export const allUnitTypes = [
    'percentage',
    'percentageChange',
    'fatalities',
    'fatalitiesPerCapita',
    'density',
    'population',
    'area',
    'distanceInKm',
    'distanceInM',
    'democraticMargin',
    'temperature',
    'time',
    'distancePerYear',
    'contaminantLevel',
    'number',
    'usd',
    'minutes',
    'partyPctBlue',
    'partyPctRed',
    'partyPctOrange',
    'partyPctTeal',
    'partyPctGreen',
    'partyPctPurple',
    'partyChangeBlue',
    'partyChangeRed',
    'partyChangeOrange',
    'partyChangeTeal',
    'partyChangeGreen',
    'partyChangePurple',
    'leftMargin',
] as const

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- just to check that all unit types are covered
function checkAllIncluded(unitType: UnitType): (typeof allUnitTypes)[number] {
    return unitType
}

export function getUnitName(unitType: UnitType): string {
    switch (unitType) {
        case 'percentage':
            return 'Percentage'
        case 'percentageChange':
            return 'Percentage Change'
        case 'fatalities':
            return 'Fatalities'
        case 'fatalitiesPerCapita':
            return 'Fatalities Per Capita'
        case 'density':
            return 'Density'
        case 'population':
            return 'Population'
        case 'area':
            return 'Area'
        case 'distanceInKm':
            return 'Distance [km]'
        case 'distanceInM':
            return 'Distance [m]'
        case 'democraticMargin':
            return 'Democratic Margin'
        case 'temperature':
            return 'Temperature'
        case 'time':
            return 'Time'
        case 'distancePerYear':
            return 'Distance Per Year'
        case 'contaminantLevel':
            return 'Contaminant Level'
        case 'number':
            return 'Number'
        case 'usd':
            return 'USD'
        case 'minutes':
            return 'Minutes'
        case 'partyPctBlue':
            return 'Party Percentage (Blue)'
        case 'partyPctRed':
            return 'Party Percentage (Red)'
        case 'partyPctOrange':
            return 'Party Percentage (Orange)'
        case 'partyPctTeal':
            return 'Party Percentage (Teal)'
        case 'partyPctGreen':
            return 'Party Percentage (Green)'
        case 'partyPctPurple':
            return 'Party Percentage (Purple)'
        case 'partyChangeBlue':
            return 'Party Change (Blue)'
        case 'partyChangeRed':
            return 'Party Change (Red)'
        case 'partyChangeOrange':
            return 'Party Change (Orange)'
        case 'partyChangeTeal':
            return 'Party Change (Teal)'
        case 'partyChangeGreen':
            return 'Party Change (Green)'
        case 'partyChangePurple':
            return 'Party Change (Purple)'
        case 'leftMargin':
            return 'Left Margin'
    }
}
