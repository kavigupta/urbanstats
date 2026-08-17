import React, { CSSProperties, ReactNode } from 'react'

import { HueColors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { abbreviate, formatToSignificantFigures, roundToDigits, separateNumber } from '../utils/text'
import { convertPrecipitation, convertTemperature, UnitType } from '../utils/unit'

type Hue = keyof HueColors

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

const missing = 'N/A'

const kmPerMile = 1.60934
const squareKmPerSquareMile = kmPerMile * kmPerMile
const acresPerSquareMile = 640
const feetPerMeter = 3.28084
const squareMetersPerSquareKm = 1000 * 1000
const perHundredThousand = 100_000
const asPercent = 100

interface ReaderSettings {
    useImperial: boolean
    temperatureUnit: string
}

interface Written {
    number: string
    unit: ReactNode
}

const blank = <span>&nbsp;</span>
const percentSign = <span>%</span>

function display(write: (value: number, settings: ReaderSettings) => Written): UnitDisplay {
    return {
        renderValue: (value: number, useImperial?: boolean, temperatureUnit?: string) => {
            if (!isFinite(value)) {
                return { value: <span>{missing}</span>, unit: blank }
            }
            const { number, unit } = write(value, { useImperial: useImperial ?? false, temperatureUnit: temperatureUnit ?? 'fahrenheit' })
            return { value: <span>{number}</span>, unit }
        },
    }
}

function squared(name: string): ReactNode {
    return (
        <span>
            {name}
            <sup>2</sup>
        </span>
    )
}

/** A solidus with a numerator in front of it is set tight; one without gets a space. */
function per(name: string): string {
    return `/\u00a0${name}`
}

function perSquared(name: string): ReactNode {
    return (
        <span>
            {per(name)}
            <sup>2</sup>
        </span>
    )
}

/** Durations read as hours and minutes, or as minutes alone where there are no hours. */
function hoursAndMinutes(hours: number): Written {
    const totalMinutes = Math.round(Math.abs(hours) * 60)
    const sign = hours < 0 && totalMinutes > 0 ? '-' : ''
    const wholeHours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (wholeHours === 0) {
        return { number: `${sign}${minutes}`, unit: <span>min</span> }
    }
    return { number: `${sign}${wholeHours}:${minutes.toString().padStart(2, '0')}`, unit: <span>h</span> }
}

function percentage(value: number): string {
    return separateNumber((value * asPercent).toFixed(2))
}

type PartyNumberStyling = (
    { kind: 'lead', labels: { positive: string, negative: string }, hues: { positive: Hue, negative: Hue } }
    | { kind: 'share', hue: Hue }
    | { kind: 'change', hue: Hue }
)

function PartyPercentage({ value, emphasis }: { value: number, emphasis: PartyNumberStyling }): ReactNode {
    const colors = useColors()
    const side = value > 0 ? 'positive' : 'negative'
    const spanStyle: CSSProperties = {
        color: colors.hueColors[emphasis.kind === 'lead' ? emphasis.hues[side] : emphasis.hue],
        // So that on 4 digits, we overflow left
        display: 'flex',
        justifyContent: 'flex-end',
    }
    switch (emphasis.kind) {
        case 'lead':
            // a lead is given more digits the closer it is
            const magnitude = Math.abs(value) * asPercent
            return (
                <span style={spanStyle}>
                    {`${emphasis.labels[side]}+${roundToDigits(magnitude, { significantDigits: 3, minDecimals: 1, maxDecimals: 4 })}`}
                </span>
            )
        case 'change':
            return <span style={spanStyle}>{`${value >= 0 ? '+' : ''}${percentage(value)}`}</span>
        case 'share':
            return <span style={spanStyle}>{percentage(value)}</span>
    }
}

function partyDisplay(emphasis: PartyNumberStyling): UnitDisplay {
    return {
        renderValue: (value: number) => !isFinite(value)
            ? { value: <span>{missing}</span>, unit: blank }
            : {
                    value: <PartyPercentage value={value} emphasis={emphasis} />,
                    unit: percentSign,
                },
    }
}

/* eslint-disable no-restricted-syntax -- these name the theme's hues, they are not css colors */
export function getUnitDisplay(unitType: UnitType): UnitDisplay {
    switch (unitType) {
        case 'percentage':
            return display(value => ({ number: percentage(value), unit: percentSign }))
        case 'percentageChange':
            return display(value => ({ number: `${value >= 0 ? '+' : ''}${percentage(value)}`, unit: percentSign }))
        case 'democraticMargin':
            return partyDisplay({ kind: 'lead', labels: { positive: 'D', negative: 'R' }, hues: { positive: 'blue', negative: 'red' } })
        case 'leftMargin':
            // in Canada, left is red
            return partyDisplay({ kind: 'lead', labels: { positive: 'L', negative: 'R' }, hues: { positive: 'red', negative: 'blue' } })
        case 'partyPctBlue':
            return partyDisplay({ kind: 'share', hue: 'blue' })
        case 'partyPctRed':
            return partyDisplay({ kind: 'share', hue: 'red' })
        case 'partyPctOrange':
            return partyDisplay({ kind: 'share', hue: 'orange' })
        case 'partyPctTeal':
            return partyDisplay({ kind: 'share', hue: 'cyan' })
        case 'partyPctGreen':
            return partyDisplay({ kind: 'share', hue: 'green' })
        case 'partyPctPurple':
            return partyDisplay({ kind: 'share', hue: 'purple' })
        case 'partyChangeBlue':
            return partyDisplay({ kind: 'change', hue: 'blue' })
        case 'partyChangeRed':
            return partyDisplay({ kind: 'change', hue: 'red' })
        case 'partyChangeOrange':
            return partyDisplay({ kind: 'change', hue: 'orange' })
        case 'partyChangeTeal':
            return partyDisplay({ kind: 'change', hue: 'cyan' })
        case 'partyChangeGreen':
            return partyDisplay({ kind: 'change', hue: 'green' })
        case 'partyChangePurple':
            return partyDisplay({ kind: 'change', hue: 'purple' })
        case 'fatalities':
            return display(value => ({ number: separateNumber(value.toFixed(0)), unit: blank }))
        case 'fatalitiesPerCapita':
            return display(value => ({
                number: separateNumber((perHundredThousand * value).toFixed(2)),
                unit: <span>{per('100k')}</span>,
            }))
        case 'density':
            return display((value, { useImperial }) => ({
                number: roundToDigits(useImperial ? value * squareKmPerSquareMile : value, { significantDigits: 2 }),
                unit: perSquared(useImperial ? 'mi' : 'km'),
            }))
        case 'population':
            return display((value) => {
                const { number, suffix } = abbreviate(value)
                return { number, unit: suffix === '' ? blank : <span>{suffix}</span> }
            })
        case 'usd':
            return display((value) => {
                const { number, suffix } = abbreviate(value)
                return { number: `$${number}`, unit: suffix === '' ? blank : <span>{suffix}</span> }
            })
        case 'area':
            return display((value, { useImperial }) => {
                if (useImperial) {
                    const squareMiles = value / squareKmPerSquareMile
                    if (Math.abs(squareMiles) < 1) {
                        return { number: roundToDigits(squareMiles * acresPerSquareMile, { significantDigits: 3 }), unit: <span>acres</span> }
                    }
                    return { number: roundToDigits(squareMiles, { significantDigits: 3 }), unit: squared('mi') }
                }
                if (Math.abs(value) < 0.01) {
                    return { number: roundToDigits(value * squareMetersPerSquareKm, { significantDigits: 3 }), unit: squared('m') }
                }
                return { number: roundToDigits(value, { significantDigits: 3 }), unit: squared('km') }
            })
        case 'distanceInKm':
            return display((value, { useImperial }) => ({
                number: separateNumber((useImperial ? value / kmPerMile : value).toFixed(2)),
                unit: <span>{useImperial ? 'mi' : 'km'}</span>,
            }))
        case 'distanceInM':
            return display((value, { useImperial }) => ({
                number: separateNumber((useImperial ? value * feetPerMeter : value).toFixed(0)),
                unit: <span>{useImperial ? 'ft' : 'm'}</span>,
            }))
        case 'temperature':
            return display((value, { temperatureUnit }) => {
                const converted = convertTemperature(value, temperatureUnit)
                return { number: separateNumber(converted.value.toFixed(1)), unit: <span>{converted.unit}</span> }
            })
        case 'time':
            return display(value => hoursAndMinutes(value))
        case 'minutes':
            return display(value => hoursAndMinutes(value / 60))
        case 'distancePerYear':
            return display((value, { useImperial }) => {
                const converted = convertPrecipitation(value, useImperial)
                return {
                    number: separateNumber(converted.value.toFixed(1)),
                    unit: <span>{`${converted.unit}/yr`}</span>,
                }
            })
        case 'contaminantLevel':
            return display(value => ({
                number: separateNumber(value.toFixed(2)),
                unit: (
                    <span>
                        &mu;g/m
                        <sup>3</sup>
                    </span>
                ),
            }))
        case 'number':
            return display(value => ({ number: separateNumber(formatToSignificantFigures(value, 3)), unit: blank }))
    }
}
/* eslint-enable no-restricted-syntax */

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
