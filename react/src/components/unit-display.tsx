import React, { CSSProperties, ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { useUnitSettings } from '../page_template/settings'
import { HumanReadableElement } from '../utils/human-readable-element'
import { reifyReact } from '../utils/human-readable-name'
import { Hue, UnitSettings, StoredUnit, Unit, UnitPlacement, writeQuantity } from '../utils/quantity'
import { UnitType } from '../utils/unit'

/** A quantity as it is displayed: the number and its unit, which sit in separate columns. */
export interface DisplayedQuantity {
    value: ReactNode
    unit: ReactNode
}

/**
 * Whether a comparison against a quantity of this unit reads as its opposite, which it does below
 * zero for a lead, since a lead is written as a size rather than as a signed number.
 */
function flipsInequality(unit: Unit, value: number): boolean {
    return unit.decoration.kind === 'percent' && unit.decoration.party?.kind === 'lead' && value <= 0
}

export function renderInequality(value: number, stored: StoredUnit, inequality: 'leq' | 'geq'): string {
    const reads = flipsInequality(stored.unit, value) ? (inequality === 'leq' ? 'geq' : 'leq') : inequality
    return reads === 'leq' ? '\u2264' /* ≤ */ : '\u2265' /* ≥ */
}

function unitColumn(name: HumanReadableElement[], settings: UnitSettings): ReactNode {
    return <span>{name.length === 0 ? <>&nbsp;</> : reifyReact(name, settings)}</span>
}

/** A quantity written in a party's color, set flush right so that a fourth digit overflows left. */
function InParty({ value, hue }: { value: string, hue: Hue }): ReactNode {
    const colors = useColors()
    const spanStyle: CSSProperties = { color: colors.hueColors[hue], display: 'flex', justifyContent: 'flex-end' }
    return <span style={spanStyle}>{value}</span>
}

export function renderQuantity(value: number, stored: StoredUnit, settings: UnitSettings, placement: UnitPlacement): DisplayedQuantity {
    const { renderedValue, unitName, hue } = writeQuantity(value, stored, settings, placement)
    return {
        value: hue === undefined ? <span>{renderedValue}</span> : <InParty value={renderedValue} hue={hue} />,
        unit: unitColumn(unitName, settings),
    }
}

/**
 * A number and its unit as one run of text, for anywhere they are written together. Two runs are
 * rasterized apart, and where the line sits on a half pixel each rounds its own way, leaving the
 * unit a pixel off the number. The zero width space is where the line may still break.
 */
export function QuantityTogether({ value, stored }: { value: number, stored: StoredUnit }): ReactNode {
    const settings = useUnitSettings()
    const { renderedValue, unitName, hue } = writeQuantity(value, stored, settings, 'afterNumber')
    const colors = useColors()
    return (
        <span style={hue === undefined ? undefined : { color: colors.hueColors[hue] }}>
            {renderedValue}
            {unitName.length === 0 ? '' : '\u200b'}
            {reifyReact(unitName, settings)}
        </span>
    )
}

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
