import React, { CSSProperties, ReactNode } from 'react'

import { HueColors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { abbreviate, decimalPlaces, formatToSignificantFigures, roundToDigits, separateNumber } from '../utils/text'
import { convertPrecipitation, convertTemperature, UnitType } from '../utils/unit'

type Hue = keyof HueColors

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

/** What a quantity reads as: the number, and the name of the unit it is in. */
interface Written {
    number: string
    unit: ReactNode
}

function display(write: (value: number, settings: ReaderSettings) => Written, inequality = renderInequality): UnitDisplay {
    return {
        renderValue: (value: number, useImperial?: boolean, temperatureUnit?: string) => {
            const { number, unit } = write(value, { useImperial: useImperial ?? false, temperatureUnit: temperatureUnit ?? 'fahrenheit' })
            return { value: <span>{number}</span>, unit }
        },
        renderInequality: inequality,
    }
}

const blank = <span>&nbsp;</span>
const percentSign = <span>%</span>

function squared(name: string): ReactNode {
    return (
        <span>
            {name}
            <sup>2</sup>
        </span>
    )
}

function perSquared(name: string): ReactNode {
    return (
        <span>
            {`/\u00a0${name}`}
            <sup>2</sup>
        </span>
    )
}

function hoursAndMinutes(hours: number, minutes: number): string {
    return `${hours}:${minutes.toString().padStart(2, '0')}`
}

function percentage(value: number): string {
    return (value * asPercent).toFixed(2)
}

type PartyNumberStyling = (
    { kind: 'lead', labels: { positive: string, negative: string }, hues: { positive: Hue, negative: Hue } }
    | { kind: 'share', hue: Hue }
    | { kind: 'change', hue: Hue }
)

function PartyPercentage({ value, emphasis }: { value: number, emphasis: PartyNumberStyling }): ReactNode {
    const colors = useColors()
    if (value !== value) { // nan check
        return <span>N/A</span>
    }
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
                    {`${emphasis.labels[side]}+${magnitude.toFixed(decimalPlaces(magnitude, { significantDigits: 3, minDecimals: 1, maxDecimals: 4 }))}`}
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
        renderValue: (value: number) => ({
            value: <PartyPercentage value={value} emphasis={emphasis} />,
            unit: percentSign,
        }),
        renderInequality: emphasis.kind === 'lead' ? renderMarginInequality : renderInequality,
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
                number: (perHundredThousand * value).toFixed(2),
                unit: <span>/100k</span>,
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
                // money has always been counted in thousands sooner than people are
                const { number, suffix } = abbreviate(value, 1e3)
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
                number: (useImperial ? value / kmPerMile : value).toFixed(2),
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
                return { number: converted.value.toFixed(1), unit: <span>{converted.unit}</span> }
            })
        case 'time':
            return display(value => ({ number: hoursAndMinutes(Math.floor(value), Math.floor((value - Math.floor(value)) * 60)), unit: blank }))
        case 'minutes':
            return display((value) => {
                const hours = Math.floor(value / 60)
                const minutes = Math.floor(value % 60)
                return { number: hours > 0 ? hoursAndMinutes(hours, minutes) : `${minutes}`, unit: blank }
            })
        case 'distancePerYear':
            return display((value, { useImperial }) => {
                const converted = convertPrecipitation(value, useImperial)
                return {
                    number: converted.value.toFixed(1),
                    unit: <span>{`${converted.unit}/yr`}</span>,
                }
            })
        case 'contaminantLevel':
            return display(value => ({
                number: value.toFixed(2),
                unit: (
                    <span>
                        &mu;g/m
                        <sup>3</sup>
                    </span>
                ),
            }))
        case 'number':
            return display(value => ({ number: formatToSignificantFigures(value, 3), unit: blank }))
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
