import {
    BaseUnit, centimeter, Decoration, fatalities, Hue, hundredThousandPeople, inch, kilometer, meter, microgram, mile,
    inEitherSystem, minute, Party, people, StoredUnit, Unit, WrittenIn, year,
} from './quantity'

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

function dimensionfull(scales: Partial<Record<BaseUnit, number>>, toBaseUnits = 1, writtenIn?: WrittenIn): StoredUnit {
    const entries = Object.entries(scales) as [BaseUnit, number][]
    const decoration: Decoration = writtenIn === undefined ? { kind: 'none' } : { kind: 'writtenIn', in: writtenIn }
    return {
        unit: {
            dimensions: entries.map(([baseUnit, power]) => ({ baseUnit, power })),
            decoration,
            times: 1,
            baseIsScalar: true,
        },
        toBaseUnits,
    }
}

function percentage(party: Party | undefined, difference = false): StoredUnit {
    const unit: Unit = { dimensions: [], decoration: { kind: 'percent', party }, times: difference ? 0 : 1, baseIsScalar: true }
    return { unit, toBaseUnits: 1 }
}

const inParty = (hue: Hue): Party => ({ kind: 'color', hue })

/* eslint-disable no-restricted-syntax -- these name the theme's hues, they are not css colors */
export const storedUnits = {
    percentage: percentage(undefined),
    percentageChange: percentage(undefined, true),
    democraticMargin: percentage({ kind: 'lead', system: 'democratic' }),
    leftMargin: percentage({ kind: 'lead', system: 'left' }),
    partyPctBlue: percentage(inParty('blue')),
    partyPctRed: percentage(inParty('red')),
    partyPctOrange: percentage(inParty('orange')),
    partyPctTeal: percentage(inParty('cyan')),
    partyPctGreen: percentage(inParty('green')),
    partyPctPurple: percentage(inParty('purple')),
    partyChangeBlue: percentage(inParty('blue'), true),
    partyChangeRed: percentage(inParty('red'), true),
    partyChangeOrange: percentage(inParty('orange'), true),
    partyChangeTeal: percentage(inParty('cyan'), true),
    partyChangeGreen: percentage(inParty('green'), true),
    partyChangePurple: percentage(inParty('purple'), true),
    // a temperature is measured from a zero that is not nothing, so it is not a scaling of anything
    temperature: {
        unit: { dimensions: [{ baseUnit: 'F', power: 1 }], decoration: { kind: 'none' }, times: 1, baseIsScalar: false },
        toBaseUnits: 1,
    },
    time: dimensionfull({ s: 1 }, 60 * 60, { units: inEitherSystem({ s: minute }), style: { kind: 'hoursMinutes' } }),
    minutes: dimensionfull({ s: 1 }, 60, { units: inEitherSystem({ s: minute }), style: { kind: 'hoursMinutes' } }),
    number: dimensionfull({}),
    population: dimensionfull({ person: 1 }),
    fatalities: dimensionfull({ fatality: 1 }),
    usd: dimensionfull({ usd: 1 }),
    distanceInM: dimensionfull({ m: 1 }),
    distanceInKm: dimensionfull({ m: 1 }, 1e3),
    area: dimensionfull({ m: 2 }, 1e6),
    fatalitiesPerCapita: dimensionfull({ fatality: 1, person: -1 }, 1, {
        units: inEitherSystem({ fatality: fatalities, person: hundredThousandPeople }),
        style: { kind: 'fixed', places: 2 },
    }),
    density: dimensionfull({ person: 1, m: -2 }, 1e-6, {
        units: { metric: { person: people, m: kilometer }, imperial: { person: people, m: mile } },
        style: { kind: 'rounded', significantDigits: 2 },
    }),
    contaminantLevel: dimensionfull({ g: 1, m: -3 }, 1e-6, {
        units: inEitherSystem({ g: microgram, m: meter }),
        style: { kind: 'fixed', places: 2 },
    }),
    distancePerYear: dimensionfull({ m: 1, s: -1 }, 1 / (365.25 * 24 * 60 * 60), {
        units: { metric: { m: centimeter, s: year }, imperial: { m: inch, s: year } },
        style: { kind: 'fixed', places: 1 },
    }),
} satisfies Record<UnitType, StoredUnit>

export function unitTypeToStoredUnit(unitType: UnitType): StoredUnit {
    return storedUnits[unitType]
}

export const plainNumber: StoredUnit = storedUnits.number
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
