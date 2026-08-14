import React, { CSSProperties, ReactNode } from 'react'

import { HueColors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { formatToSignificantFigures, separateNumber } from '../utils/text'
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

/**
 * How a percentage that belongs to a party is written: in the party's color, and, for a margin
 * between two of them, as the size of the lead labelled with whoever holds it.
 */
interface PartyEmphasis {
    hue: Hue | { positive: Hue, negative: Hue }
    /** Written as a lead, e.g., D+12.3 against R+8.10, rather than as a signed number */
    labels?: { positive: string, negative: string }
    /** Non-negative values are written with a leading plus sign */
    explicitSign?: boolean
}

// a lead is given more digits the closer it is
function leadPlaces(magnitude: number): number {
    if (magnitude > 10) return 1
    if (magnitude > 1) return 2
    if (magnitude > 0.1) return 3
    return 4
}

function PartyPercentage({ value, emphasis }: { value: number, emphasis: PartyEmphasis }): ReactNode {
    const colors = useColors()
    // check if value is NaN
    if (value !== value) {
        return <span>N/A</span>
    }
    const side = value > 0 ? 'positive' : 'negative'
    const spanStyle: CSSProperties = {
        color: colors.hueColors[typeof emphasis.hue === 'string' ? emphasis.hue : emphasis.hue[side]],
        // So that on 4 digits, we overflow left
        display: 'flex',
        justifyContent: 'flex-end',
    }
    /*
     * The label, the sign and the number are separate children rather than one string, because
     * the browser shapes each run of text on its own and a lead is rendered a pixel differently
     * when they are joined.
     */
    if (emphasis.labels !== undefined) {
        const magnitude = Math.abs(value) * 100
        return (
            <span style={spanStyle}>
                {emphasis.labels[side]}
                +
                {magnitude.toFixed(leadPlaces(magnitude))}
            </span>
        )
    }
    if (emphasis.explicitSign === true) {
        return (
            <span style={spanStyle}>
                {value >= 0 ? '+' : ''}
                {(value * 100).toFixed(2)}
            </span>
        )
    }
    return <span style={spanStyle}>{(value * 100).toFixed(2)}</span>
}

function partyDisplay(emphasis: PartyEmphasis): UnitDisplay {
    return {
        renderValue: (value: number) => ({
            value: <PartyPercentage value={value} emphasis={emphasis} />,
            unit: <span>%</span>,
        }),
        renderInequality: emphasis.labels === undefined ? renderInequality : renderMarginInequality,
    }
}

/* eslint-disable no-restricted-syntax -- these name the theme's hues, they are not css colors */
export function getUnitDisplay(unitType: UnitType): UnitDisplay {
    switch (unitType) {
        case 'percentage':
            return {
                renderValue: (value: number) => {
                    return {
                        value: <span>{(value * 100).toFixed(2)}</span>,
                        unit: <span>%</span>,
                    }
                },
                renderInequality,
            }
        case 'percentageChange':
            return {
                renderValue: (value: number) => {
                    const displayValue = (value * 100).toFixed(2)
                    const sign = value >= 0 ? '+' : ''
                    return {
                        value: (
                            <span>
                                {sign}
                                {displayValue}
                            </span>
                        ),
                        unit: <span>%</span>,
                    }
                },
                renderInequality,
            }
        case 'fatalities':
            return {
                renderValue: (value: number) => {
                    return {
                        value: <span>{separateNumber(value.toFixed(0))}</span>,
                        unit: <span>&nbsp;</span>,
                    }
                },
                renderInequality,
            }
        case 'fatalitiesPerCapita':
            return {
                renderValue: (value: number) => {
                    return {
                        value: <span>{(100_000 * value).toFixed(2)}</span>,
                        unit: <span>/100k</span>,
                    }
                },
                renderInequality,
            }
        case 'density':
            return {
                renderValue: (value: number, useImperial?: boolean) => {
                    let unitName = 'km'
                    let adjustedValue = value
                    if (useImperial) {
                        unitName = 'mi'
                        adjustedValue *= 1.60934 * 1.60934
                    }
                    let places = 2
                    if (adjustedValue > 10) {
                        places = 0
                    }
                    else if (adjustedValue > 1) {
                        places = 1
                    }
                    return {
                        value: <span>{separateNumber(adjustedValue.toFixed(places))}</span>,
                        unit: (
                            <span>
                                /&nbsp;
                                {unitName}
                                <sup>2</sup>
                            </span>
                        ),
                    }
                },
                renderInequality,
            }
        case 'population':
            return {
                renderValue: (value: number) => {
                    /*
                     * Boundaries are at 999.5 * scale rather than 1000 * scale so that a value that
                     * rounds up to 4 significant digits (e.g. 999999 → 1000k) is promoted to the next
                     * tier instead. This keeps (value / divisor).toPrecision(3) below 1000, which
                     * avoids toPrecision returning scientific notation (e.g. "1.00e+3").
                     */
                    if (value >= 999.5e6) {
                        return {
                            value: <span>{(value / 1e9).toPrecision(3)}</span>,
                            unit: <span>B</span>,
                        }
                    }
                    if (value >= 999.5e3) {
                        return {
                            value: <span>{(value / 1e6).toPrecision(3)}</span>,
                            unit: <span>m</span>,
                        }
                    }
                    else if (value > 1e4) {
                        return {
                            value: <span>{(value / 1e3).toPrecision(3)}</span>,
                            unit: <span>k</span>,
                        }
                    }
                    else {
                        return {
                            value: <span>{separateNumber(value.toFixed(0))}</span>,
                            unit: <span>&nbsp;</span>,
                        }
                    }
                },
                renderInequality,
            }
        case 'area':
            return {
                renderValue: (value: number, useImperial?: boolean) => {
                    let adjustedValue = value
                    let unit: React.ReactElement
                    if (useImperial) {
                        adjustedValue /= 1.60934 * 1.60934
                        if (adjustedValue < 1) {
                            unit = <span>acres</span>
                            adjustedValue *= 640
                        }
                        else {
                            unit = (
                                <span>
                                    mi
                                    <sup>2</sup>
                                </span>
                            )
                        }
                    }
                    else {
                        if (adjustedValue < 0.01) {
                            adjustedValue *= 1000 * 1000
                            unit = (
                                <span>
                                    m
                                    <sup>2</sup>
                                </span>
                            )
                        }
                        else {
                            unit = (
                                <span>
                                    km
                                    <sup>2</sup>
                                </span>
                            )
                        }
                    }
                    let places = 3
                    if (adjustedValue > 100) {
                        places = 0
                    }
                    else if (adjustedValue > 10) {
                        places = 1
                    }
                    else if (adjustedValue > 1) {
                        places = 2
                    }
                    let rendered = adjustedValue.toFixed(places)
                    if (places === 0) {
                        rendered = separateNumber(rendered)
                    }
                    return {
                        value: <span>{rendered}</span>,
                        unit,
                    }
                },
                renderInequality,
            }
        case 'distanceInKm':
            return {
                renderValue: (value: number, useImperial?: boolean) => {
                    let unit = <span>km</span>
                    let adjustedValue = value
                    if (useImperial) {
                        unit = <span>mi</span>
                        adjustedValue /= 1.60934
                    }
                    return {
                        value: <span>{adjustedValue.toFixed(2)}</span>,
                        unit,
                    }
                },
                renderInequality,
            }
        case 'distanceInM':
            return {
                renderValue: (value: number, useImperial?: boolean) => {
                    let unitName = 'm'
                    let adjustedValue = value
                    if (useImperial) {
                        unitName = 'ft'
                        adjustedValue *= 3.28084
                    }
                    return {
                        value: <span>{separateNumber(adjustedValue.toFixed(0))}</span>,
                        unit: <span>{unitName}</span>,
                    }
                },
                renderInequality,
            }
        case 'democraticMargin':
            return partyDisplay({ labels: { positive: 'D', negative: 'R' }, hue: { positive: 'blue', negative: 'red' } })
        case 'partyPctBlue':
            return partyDisplay({ hue: 'blue' })
        case 'partyPctRed':
            return partyDisplay({ hue: 'red' })
        case 'partyPctOrange':
            return partyDisplay({ hue: 'orange' })
        case 'partyPctTeal':
            return partyDisplay({ hue: 'cyan' })
        case 'partyPctGreen':
            return partyDisplay({ hue: 'green' })
        case 'partyPctPurple':
            return partyDisplay({ hue: 'purple' })
        case 'partyChangeBlue':
            return partyDisplay({ hue: 'blue', explicitSign: true })
        case 'partyChangeRed':
            return partyDisplay({ hue: 'red', explicitSign: true })
        case 'partyChangeOrange':
            return partyDisplay({ hue: 'orange', explicitSign: true })
        case 'partyChangeTeal':
            return partyDisplay({ hue: 'cyan', explicitSign: true })
        case 'partyChangeGreen':
            return partyDisplay({ hue: 'green', explicitSign: true })
        case 'partyChangePurple':
            return partyDisplay({ hue: 'purple', explicitSign: true })
        case 'leftMargin':
            // the left is drawn in red, as it is outside the US
            return partyDisplay({ labels: { positive: 'L', negative: 'R' }, hue: { positive: 'red', negative: 'blue' } })
        /* eslint-enable no-restricted-syntax */
        case 'temperature':
            return {
                renderValue: (value: number, useImperial?: boolean, temperatureUnit?: string) => {
                    const { value: adjustedValue, unit } = convertTemperature(value, temperatureUnit ?? 'fahrenheit')
                    return {
                        value: <span>{adjustedValue.toFixed(1)}</span>,
                        unit: <span>{unit}</span>,
                    }
                },
                renderInequality,
            }
        case 'time':
            return {
                renderValue: (value: number) => {
                    const hours = Math.floor(value)
                    const minutes = Math.floor((value - hours) * 60)
                    return {
                        value: (
                            <span>
                                {hours}
                                :
                                {minutes.toString().padStart(2, '0')}
                            </span>
                        ),
                        unit: <span>&nbsp;</span>,
                    }
                },
                renderInequality,
            }
        case 'distancePerYear':
            return {
                renderValue: (value: number, useImperial?: boolean) => {
                    const { value: adjustedValue, unit } = convertPrecipitation(value, useImperial ?? false)
                    return {
                        value: <span>{adjustedValue.toFixed(1)}</span>,
                        unit: (
                            <span>
                                {unit}
                                /yr
                            </span>
                        ),
                    }
                },
                renderInequality,
            }
        case 'contaminantLevel':
            return {
                renderValue: (value: number) => {
                    return {
                        value: <span>{value.toFixed(2)}</span>,
                        unit: (
                            <span>
                                &mu;g/m
                                <sup>3</sup>
                            </span>
                        ),
                    }
                },
                renderInequality,
            }
        case 'number':
            return {
                renderValue: (value: number) => {
                    return {
                        value: <span>{formatToSignificantFigures(value, 3)}</span>,
                        unit: <span>&nbsp;</span>,
                    }
                },
                renderInequality,
            }
        case 'usd':
            return {
                renderValue: (value: number) => {
                    /*
                     * Boundaries are at 999.5 * scale rather than 1000 * scale so that a value that
                     * rounds up to 4 significant digits (e.g. 999999 → 1000k) is promoted to the next
                     * tier instead. This keeps (value / divisor).toPrecision(3) below 1000, which
                     * avoids toPrecision returning scientific notation (e.g. "1.00e+3").
                     */
                    if (value >= 999.5e6) {
                        return {
                            value: (
                                <span>
                                    $
                                    {(value / 1e9).toPrecision(3)}
                                </span>
                            ),
                            unit: <span>B</span>,
                        }
                    }
                    if (value >= 999.5e3) {
                        return {
                            value: (
                                <span>
                                    $
                                    {(value / 1e6).toPrecision(3)}
                                </span>
                            ),
                            unit: <span>m</span>,
                        }
                    }
                    else if (value > 1e3) {
                        return {
                            value: (
                                <span>
                                    $
                                    {(value / 1e3).toPrecision(3)}
                                </span>
                            ),
                            unit: <span>k</span>,
                        }
                    }
                    else {
                        return {
                            value: (
                                <span>
                                    $
                                    {separateNumber(value.toFixed(0))}
                                </span>
                            ),
                            unit: <span>&nbsp;</span>,
                        }
                    }
                },
                renderInequality,
            }
        case 'minutes':
            return {
                renderValue: (value: number) => {
                    const hours = Math.floor(value / 60)
                    const minutes = Math.floor(value % 60)

                    if (hours > 0) {
                        return {
                            value: (
                                <span>
                                    {hours}
                                    :
                                    {minutes.toString().padStart(2, '0')}
                                </span>
                            ),
                            unit: <span>&nbsp;</span>,
                        }
                    }
                    else {
                        return {
                            value: <span>{minutes}</span>,
                            unit: <span>&nbsp;</span>,
                        }
                    }
                },
                renderInequality,
            }
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
