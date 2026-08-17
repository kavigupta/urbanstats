import React, { CSSProperties, ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { HumanReadableElement, reifyReact } from '../utils/human-readable-name'
import { Hue, missingValue, StoredUnit, writeQuantity } from '../utils/quantity'
import { abbreviate, formatToSignificantFigures, roundToDigits, separateNumber } from '../utils/text'
import { convertPrecipitation, storedUnits, UnitType } from '../utils/unit'

export interface UnitDisplay {
    renderValue: (value: number, useImperial?: boolean, temperatureUnit?: string) => {
        value: ReactNode
        unit: ReactNode
    }
}

/**
 * Whether a comparison against a quantity of this unit reads as its opposite, which it does below
 * zero for a lead, since a lead is written as a size rather than as a signed number.
 */
function flipsInequality(unitType: UnitType, value: number): boolean {
    return (unitType === 'democraticMargin' || unitType === 'leftMargin') && value <= 0
}

export function renderInequality(value: number, unitType: UnitType, inequality: 'leq' | 'geq'): string {
    const reads = flipsInequality(unitType, value) ? (inequality === 'leq' ? 'geq' : 'leq') : inequality
    return reads === 'leq' ? '\u2264' /* ≤ */ : '\u2265' /* ≥ */
}

const kmPerMile = 1.60934
const squareKmPerSquareMile = kmPerMile * kmPerMile
const acresPerSquareMile = 640
const feetPerMeter = 3.28084
const squareMetersPerSquareKm = 1000 * 1000
const perHundredThousand = 100_000

interface ReaderSettings {
    useImperial: boolean
    temperatureUnit: string
}

interface Written {
    number: string
    unit: HumanReadableElement[]
}

const unitlessDisplay: HumanReadableElement[] = []

function atom(value: string): HumanReadableElement[] {
    return [{ type: 'atom', value }]
}

function raised(name: string, power: string): HumanReadableElement[] {
    return [{ type: 'atom', value: name }, { type: 'superscript', value: atom(power) }]
}

function unitColumn(name: HumanReadableElement[]): ReactNode {
    return <span>{name.length === 0 ? <>&nbsp;</> : reifyReact(name)}</span>
}

function display(write: (value: number, settings: ReaderSettings) => Written): UnitDisplay {
    return {
        renderValue: (value: number, useImperial?: boolean, temperatureUnit?: string) => {
            if (!isFinite(value)) {
                return { value: <span>{missingValue}</span>, unit: unitColumn(unitlessDisplay) }
            }
            const { number, unit } = write(value, { useImperial: useImperial ?? false, temperatureUnit: temperatureUnit ?? 'fahrenheit' })
            return { value: <span>{number}</span>, unit: unitColumn(unit) }
        },
    }
}

/** A solidus with a numerator in front of it is set tight; one without gets a space. */
function per(name: string): string {
    return `/\u00a0${name}`
}

/** Durations read as hours and minutes, or as minutes alone where there are no hours. */
function hoursAndMinutes(hours: number): Written {
    const totalMinutes = Math.round(Math.abs(hours) * 60)
    const sign = hours < 0 && totalMinutes > 0 ? '-' : ''
    const wholeHours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (wholeHours === 0) {
        return { number: `${sign}${minutes}`, unit: atom('min') }
    }
    return { number: `${sign}${wholeHours}:${minutes.toString().padStart(2, '0')}`, unit: atom('h') }
}

/** A quantity written in a party's color, set flush right so that a fourth digit overflows left. */
function InParty({ value, hue }: { value: string, hue: Hue }): ReactNode {
    const colors = useColors()
    const spanStyle: CSSProperties = { color: colors.hueColors[hue], display: 'flex', justifyContent: 'flex-end' }
    return <span style={spanStyle}>{value}</span>
}

function quantity(stored: StoredUnit): UnitDisplay {
    return {
        renderValue: (value: number, useImperial?: boolean, temperatureUnit?: string) => {
            const { renderedValue, unitName, hue } = writeQuantity(value, stored, { useImperial, temperatureUnit })
            return {
                value: hue === undefined ? <span>{renderedValue}</span> : <InParty value={renderedValue} hue={hue} />,
                unit: unitColumn(unitName),
            }
        },
    }
}

export function getUnitDisplay(unitType: UnitType): UnitDisplay {
    switch (unitType) {
        case 'percentage':
        case 'percentageChange':
        case 'democraticMargin':
        case 'leftMargin':
        case 'partyPctBlue':
        case 'partyPctRed':
        case 'partyPctOrange':
        case 'partyPctTeal':
        case 'partyPctGreen':
        case 'partyPctPurple':
        case 'partyChangeBlue':
        case 'partyChangeRed':
        case 'partyChangeOrange':
        case 'partyChangeTeal':
        case 'partyChangeGreen':
        case 'partyChangePurple':
        case 'temperature':
            return quantity(storedUnits[unitType])
        case 'fatalities':
            return display(value => ({ number: separateNumber(value.toFixed(0)), unit: unitlessDisplay }))
        case 'fatalitiesPerCapita':
            return display(value => ({
                number: separateNumber((perHundredThousand * value).toFixed(2)),
                unit: atom(per('100k')),
            }))
        case 'density':
            return display((value, { useImperial }) => ({
                number: roundToDigits(useImperial ? value * squareKmPerSquareMile : value, { significantDigits: 2 }),
                unit: raised(per(useImperial ? 'mi' : 'km'), '2'),
            }))
        case 'population':
            return display((value) => {
                const { number, suffix } = abbreviate(value)
                return { number, unit: suffix === '' ? unitlessDisplay : atom(suffix) }
            })
        case 'usd':
            return display((value) => {
                const { number, suffix } = abbreviate(value)
                return { number: `$${number}`, unit: suffix === '' ? unitlessDisplay : atom(suffix) }
            })
        case 'area':
            return display((value, { useImperial }) => {
                if (useImperial) {
                    const squareMiles = value / squareKmPerSquareMile
                    if (Math.abs(squareMiles) < 1) {
                        return { number: roundToDigits(squareMiles * acresPerSquareMile, { significantDigits: 3 }), unit: atom('acres') }
                    }
                    return { number: roundToDigits(squareMiles, { significantDigits: 3 }), unit: raised('mi', '2') }
                }
                if (Math.abs(value) < 0.01) {
                    return { number: roundToDigits(value * squareMetersPerSquareKm, { significantDigits: 3 }), unit: raised('m', '2') }
                }
                return { number: roundToDigits(value, { significantDigits: 3 }), unit: raised('km', '2') }
            })
        case 'distanceInKm':
            return display((value, { useImperial }) => ({
                number: separateNumber((useImperial ? value / kmPerMile : value).toFixed(2)),
                unit: atom(useImperial ? 'mi' : 'km'),
            }))
        case 'distanceInM':
            return display((value, { useImperial }) => ({
                number: separateNumber((useImperial ? value * feetPerMeter : value).toFixed(0)),
                unit: atom(useImperial ? 'ft' : 'm'),
            }))
        case 'time':
            return display(value => hoursAndMinutes(value))
        case 'minutes':
            return display(value => hoursAndMinutes(value / 60))
        case 'distancePerYear':
            return display((value, { useImperial }) => {
                const converted = convertPrecipitation(value, useImperial)
                return {
                    number: separateNumber(converted.value.toFixed(1)),
                    unit: atom(`${converted.unit}/yr`),
                }
            })
        case 'contaminantLevel':
            return display(value => ({
                number: separateNumber(value.toFixed(2)),
                unit: raised('μg/m', '3'),
            }))
        case 'number':
            return display(value => ({ number: separateNumber(formatToSignificantFigures(value, 3)), unit: unitlessDisplay }))
    }
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
