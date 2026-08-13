import React, { ReactNode } from 'react'

import { HumanReadableName, reifyReact } from '../utils/human-readable-name'
import { convertTemperature, displayQuantity, Unit, unitTypeToUnit, UnitType } from '../utils/unit'

import { ElectionResult, GenericPartyChange, GenericPartyPercentage, LeftMargin } from './display-stats'

type RenderInequality = (value: number, inequality: 'leq' | 'geq') => string

export interface UnitDisplay {
    renderValue: (value: number, useImperial?: boolean, temperatureUnit?: string) => {
        value: ReactNode
        unit: ReactNode
    }
    renderInequality: RenderInequality
}

// Default render inequality
const renderInequality: RenderInequality = (value, inequality) => {
    switch (inequality) {
        case 'leq':
            return '\u2264' /* ≤ */
        case 'geq':
            return '\u2265' /* ≥ */
    }
}

const renderMarginInequality: RenderInequality = (value, inequality) => {
    // Negative values actually display as positive for election results, and default to R for 0, which means that greater than 0 is less than R margin
    if (value <= 0) {
        switch (inequality) {
            case 'geq':
                return renderInequality(value, 'leq')
            case 'leq':
                return renderInequality(value, 'geq')
        }
    }
    return renderInequality(value, inequality)
}

function unitName(name: HumanReadableName): ReactNode {
    // an empty unit still occupies its column
    return <span>{name === '' ? '\u00a0' : reifyReact(name)}</span>
}

const percentageDisplay = (renderNumber: (value: number) => ReactNode, inequality = renderInequality): UnitDisplay => ({
    renderValue: (value: number) => ({ value: renderNumber(value), unit: <span>%</span> }),
    renderInequality: inequality,
})

/**
 * Renders a quantity in whichever of its unit's display units fits its magnitude, e.g., a value
 * of 600 minutes as 10 hours. Quantities displayed in party colors are rendered here rather than
 * as plain numbers, as is a temperature, which the reader can ask for in celsius.
 */
export function getQuantityDisplay(unit: Unit): UnitDisplay {
    switch (unit.presentation) {
        case 'democraticMargin':
            return percentageDisplay(value => <ElectionResult value={value} />, renderMarginInequality)
        case 'leftMargin':
            return percentageDisplay(value => <LeftMargin value={value} />, renderMarginInequality)
        case 'partyPctBlue':
        case 'partyPctRed':
        case 'partyPctOrange':
        case 'partyPctTeal':
        case 'partyPctGreen':
        case 'partyPctPurple': {
            const unitType = unit.presentation
            return percentageDisplay(value => <GenericPartyPercentage value={value} unitType={unitType} />)
        }
        case 'partyChangeBlue':
        case 'partyChangeRed':
        case 'partyChangeOrange':
        case 'partyChangeTeal':
        case 'partyChangeGreen':
        case 'partyChangePurple': {
            const unitType = unit.presentation
            return percentageDisplay(value => <GenericPartyChange value={value} unitType={unitType} />)
        }
        case 'temperature':
            return {
                renderValue: (value: number, useImperial?: boolean, temperatureUnit?: string) => {
                    const { value: converted, unit: temperatureName } = convertTemperature(value, temperatureUnit ?? 'fahrenheit')
                    return {
                        value: <span>{converted.toFixed(1)}</span>,
                        unit: <span>{temperatureName}</span>,
                    }
                },
                renderInequality,
            }
        case undefined:
        case 'percentage':
        case 'percentageChange':
            return {
                renderValue: (value: number, useImperial?: boolean) => {
                    const rendered = displayQuantity(value, unit, useImperial ?? false)
                    return {
                        value: <span>{rendered.value}</span>,
                        unit: unitName(rendered.unit),
                    }
                },
                renderInequality,
            }
    }
}

export function getUnitDisplay(unitType: UnitType): UnitDisplay {
    return getQuantityDisplay(unitTypeToUnit(unitType))
}

// Describes a unit type in prose, for the documentation of the unit constants
export function getUnit(unit: UnitType): ReactNode {
    switch (unit) {
        case 'percentage':
        case 'percentageChange':
            return <span>%</span>
        case 'fatalities':
            return <span>fatalities</span>
        case 'fatalitiesPerCapita':
            return <span>fatalities per capita</span>
        case 'density':
            return (
                <span>
                    people per&nbsp;km
                    <sup>2</sup>
                </span>
            )
        case 'population':
            return <span>people</span>
        case 'area':
            return (
                <span>
                    km
                    <sup>2</sup>
                </span>
            )
        case 'distanceInKm':
            return <span>km</span>
        case 'distanceInM':
            return <span>m</span>
        case 'democraticMargin':
            return <span>% margin</span>
        case 'temperature':
            return <span>&deg;F</span>
        case 'time':
            return <span>time</span>
        case 'distancePerYear':
            return (
                <span>
                    m/yr
                </span>
            )
        case 'contaminantLevel':
            return (
                <span>
                    &mu;g/m
                    <sup>3</sup>
                </span>
            )
        case 'number':
            return <span>&nbsp;</span>
        case 'usd':
            return <span>$</span>
        case 'minutes':
            return <span>minutes</span>
        case 'partyPctBlue':
        case 'partyPctRed':
        case 'partyPctOrange':
        case 'partyPctTeal':
        case 'partyPctGreen':
        case 'partyPctPurple':
            return <span>%</span>
        case 'partyChangeBlue':
        case 'partyChangeRed':
        case 'partyChangeOrange':
        case 'partyChangeTeal':
        case 'partyChangeGreen':
        case 'partyChangePurple':
            return <span>% change</span>
        case 'leftMargin':
            return <span>% left margin</span>
    }
}
