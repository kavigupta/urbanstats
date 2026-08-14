import React, { ReactNode } from 'react'

import { Colors } from '../page_template/color-themes'
import { reifyReact } from '../utils/human-readable-name'
import { flipsInequality, ReaderSettings, StoredUnit, UnitType, writeQuantity } from '../utils/unit'

/**
 * A quantity as it is displayed: the number and its unit, which are shown in separate columns of
 * a table and so are rendered separately.
 */
export interface DisplayedQuantity {
    value: ReactNode
    unit: ReactNode
}

export function renderQuantity(value: number, unit: StoredUnit, colors: Colors, settings: ReaderSettings = {}): DisplayedQuantity {
    const { number, name, hue } = writeQuantity(value, unit, settings)
    const parts = number.map((part, index) => <React.Fragment key={index}>{part}</React.Fragment>)
    return {
        value: hue === undefined
            ? <span>{parts}</span>
            : (
                    <span style={{ color: colors.hueColors[hue], display: 'flex', justifyContent: 'flex-end' }}>
                        {parts}
                    </span>
                ),
        // an empty unit still occupies its column
        unit: <span>{name === '' ? ' ' : reifyReact(name)}</span>,
    }
}

/**
 * How a comparison against a quantity of this unit reads, which is its opposite where the
 * quantity is written as a magnitude, as a margin is.
 */
export function renderInequality(value: number, unit: StoredUnit, inequality: 'leq' | 'geq'): string {
    const reads = flipsInequality(unit.unit, value) ? (inequality === 'leq' ? 'geq' : 'leq') : inequality
    return reads === 'leq' ? '≤' : '≥'
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
