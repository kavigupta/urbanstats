import React, { ReactNode } from 'react'

import { formatToSignificantFigures, separateNumber } from '../utils/text'
import { UnitType } from '../utils/unit'

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
                    if (value > 1e9) {
                        return {
                            value: <span>{(value / 1e9).toPrecision(3)}</span>,
                            unit: <span>B</span>,
                        }
                    }
                    if (value > 1e6) {
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
            return {
                renderValue: (value: number) => {
                    return {
                        value: <ElectionResult value={value} />,
                        unit: <span>%</span>,
                    }
                },
                renderInequality: renderMarginInequality,
            }
        case 'partyPctBlue':
        case 'partyPctRed':
        case 'partyPctOrange':
        case 'partyPctTeal':
        case 'partyPctGreen':
        case 'partyPctPurple': {
            const capturedUnitType = unitType
            return {
                renderValue: (value: number) => {
                    return {
                        value: <GenericPartyPercentage value={value} unitType={capturedUnitType} />,
                        unit: <span>%</span>,
                    }
                },
                renderInequality,
            }
        }
        case 'partyChangeBlue':
        case 'partyChangeRed':
        case 'partyChangeOrange':
        case 'partyChangeTeal':
        case 'partyChangeGreen':
        case 'partyChangePurple': {
            const capturedUnitType = unitType
            return {
                renderValue: (value: number) => {
                    return {
                        value: <GenericPartyChange value={value} unitType={capturedUnitType} />,
                        unit: <span>%</span>,
                    }
                },
                renderInequality,
            }
        }
        case 'leftMargin':
            return {
                renderValue: (value: number) => {
                    return {
                        value: <LeftMargin value={value} />,
                        unit: <span>%</span>,
                    }
                },
                renderInequality: renderMarginInequality,
            }
        case 'temperature':
            return {
                renderValue: (value: number, useImperial?: boolean, temperatureUnit?: string) => {
                    let unit = <span>&deg;F</span>
                    let adjustedValue = value
                    if (temperatureUnit === 'celsius') {
                        unit = <span>&deg;C</span>
                        adjustedValue = (value - 32) * (5 / 9)
                    }
                    return {
                        value: <span>{adjustedValue.toFixed(1)}</span>,
                        unit,
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
                    let adjustedValue = value * 100
                    let unit = 'cm'
                    if (useImperial) {
                        unit = 'in'
                        adjustedValue /= 2.54
                    }
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
                    if (value > 1e9) {
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
                    if (value > 1e6) {
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
