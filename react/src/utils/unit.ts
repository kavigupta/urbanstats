import { BaseUnit, StoredUnit } from './quantity'

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

function dimensionfull(scales: Partial<Record<BaseUnit, number>>, toBaseUnits = 1): StoredUnit {
    const entries = Object.entries(scales) as [BaseUnit, number][]
    return {
        unit: { kind: 'dimensionfull', scales: entries.map(([baseUnit, power]) => ({ baseUnit, power })) },
        toBaseUnits,
    }
}

/* eslint-disable no-restricted-syntax -- these name the theme's hues, they are not css colors */
export const storedUnits = {
    percentage: { unit: { kind: 'raw-percentage' }, toBaseUnits: 1 },
    percentageChange: { unit: { kind: 'delta-percentage' }, toBaseUnits: 1 },
    democraticMargin: { unit: { kind: 'lead-percentage', partySystem: 'democratic' }, toBaseUnits: 1 },
    leftMargin: { unit: { kind: 'lead-percentage', partySystem: 'left' }, toBaseUnits: 1 },
    partyPctBlue: { unit: { kind: 'raw-percentage', partyColor: 'blue' }, toBaseUnits: 1 },
    partyPctRed: { unit: { kind: 'raw-percentage', partyColor: 'red' }, toBaseUnits: 1 },
    partyPctOrange: { unit: { kind: 'raw-percentage', partyColor: 'orange' }, toBaseUnits: 1 },
    partyPctTeal: { unit: { kind: 'raw-percentage', partyColor: 'cyan' }, toBaseUnits: 1 },
    partyPctGreen: { unit: { kind: 'raw-percentage', partyColor: 'green' }, toBaseUnits: 1 },
    partyPctPurple: { unit: { kind: 'raw-percentage', partyColor: 'purple' }, toBaseUnits: 1 },
    partyChangeBlue: { unit: { kind: 'delta-percentage', partyColor: 'blue' }, toBaseUnits: 1 },
    partyChangeRed: { unit: { kind: 'delta-percentage', partyColor: 'red' }, toBaseUnits: 1 },
    partyChangeOrange: { unit: { kind: 'delta-percentage', partyColor: 'orange' }, toBaseUnits: 1 },
    partyChangeTeal: { unit: { kind: 'delta-percentage', partyColor: 'cyan' }, toBaseUnits: 1 },
    partyChangeGreen: { unit: { kind: 'delta-percentage', partyColor: 'green' }, toBaseUnits: 1 },
    partyChangePurple: { unit: { kind: 'delta-percentage', partyColor: 'purple' }, toBaseUnits: 1 },
    temperature: { unit: { kind: 'temperature-F' }, toBaseUnits: 1 },
    number: dimensionfull({}),
    population: dimensionfull({ person: 1 }),
    fatalities: dimensionfull({ fatality: 1 }),
    usd: dimensionfull({ usd: 1 }),
    distanceInM: dimensionfull({ m: 1 }),
    distanceInKm: dimensionfull({ m: 1 }, 1e3),
    area: dimensionfull({ m: 2 }, 1e6),
    fatalitiesPerCapita: dimensionfull({ fatality: 1, person: -1 }),
} satisfies Partial<Record<UnitType, StoredUnit>>
/* eslint-enable no-restricted-syntax */

function fahrenheitToCelsius(value: number): number {
    return (value - 32) * (5 / 9)
}

function metersToCentimetersOrInches(value: number, useImperial: boolean): number {
    const centimeters = value * 100
    return useImperial ? centimeters / 2.54 : centimeters
}

export function convertTemperature(value: number, temperatureUnit: string): { value: number, unit: string } {
    return temperatureUnit === 'celsius'
        ? { value: fahrenheitToCelsius(value), unit: '°C' }
        : { value, unit: '°F' }
}

export function convertPrecipitation(value: number, useImperial: boolean): { value: number, unit: string } {
    return {
        value: metersToCentimetersOrInches(value, useImperial),
        unit: useImperial ? 'in' : 'cm',
    }
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

export function classifyStatistic(statname: string): UnitType {
    if (/20\d{2}GE/.test(statname) || /20\d{2}-20\d{2} Swing/.test(statname)) {
        // Canadian election statistics
        const isSwing = statname.includes('Swing')
        if (statname.includes('Lib %')) {
            return isSwing ? 'partyChangeRed' : 'partyPctRed'
        }
        if (statname.includes('Con %')) {
            return isSwing ? 'partyChangeBlue' : 'partyPctBlue'
        }
        if (statname.includes('NDP %')) {
            return isSwing ? 'partyChangeOrange' : 'partyPctOrange'
        }
        if (statname.includes('BQ %')) {
            return isSwing ? 'partyChangeTeal' : 'partyPctTeal'
        }
        if (statname.includes('Grn %')) {
            return isSwing ? 'partyChangeGreen' : 'partyPctGreen'
        }
        if (statname.includes('PPC %')) {
            return isSwing ? 'partyChangePurple' : 'partyPctPurple'
        }
    }
    if (statname.includes('2-Coalition Margin')) {
        return 'leftMargin'
    }
    if (statname.includes('Change') && (statname.includes('Population') || statname.includes('Density'))) {
        return 'percentageChange'
    }
    if (statname.includes('%') || statname.includes('Change') || statname.includes('(Grade)')) {
        return 'percentage'
    }
    if (statname.includes('Total') && statname.includes('Fatalities')) {
        return 'fatalities'
    }
    if (statname.includes('Fatalities Per Capita')) {
        return 'fatalitiesPerCapita'
    }
    if (statname.includes('Density')) {
        return 'density'
    }
    if (statname.includes('Elevation')) {
        return 'distanceInM'
    }
    if (statname.startsWith('Population')) {
        return 'population'
    }
    if (statname === 'Area') {
        return 'area'
    }
    if (statname.includes('Mean distance')) {
        return 'distanceInKm'
    }
    if (statname.includes('Election') || statname.includes('Swing')) {
        return 'democraticMargin'
    }
    if (statname.includes('high temp') || statname.includes('low temp') || statname.includes('high heat index') || statname.includes('dewpt')) {
        return 'temperature'
    }
    if (statname === 'Mean sunny hours') {
        return 'time'
    }
    if (statname === 'Rainfall' || statname === 'Snowfall [rain-equivalent]') {
        return 'distancePerYear'
    }
    if (statname.includes('Pollution')) {
        return 'contaminantLevel'
    }
    if (statname.includes('(USD)')) {
        return 'usd'
    }
    if (statname.includes('(min)')) {
        return 'minutes'
    }
    return 'number'
}
