import React, { ReactNode } from 'react'

import { formatToSignificantFigures, separateNumber } from '../utils/text'
import { UnitType } from '../utils/unit'

import { ElectionResult, GenericPartyChange, GenericPartyPercentage, LeftMargin } from './display-stats'

export interface UnitDisplay {
    renderValue: (value: number, useImperial?: boolean, temperatureUnit?: string) => {
        value: ReactNode
        unit: ReactNode
    }
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
            }
        case 'fatalities':
            return {
                renderValue: (value: number) => {
                    return {
                        value: <span>{separateNumber(value.toFixed(0))}</span>,
                        unit: <span>&nbsp;</span>,
                    }
                },
            }
        case 'fatalitiesPerCapita':
            return {
                renderValue: (value: number) => {
                    return {
                        value: <span>{(100_000 * value).toFixed(2)}</span>,
                        unit: <span>/100k</span>,
                    }
                },
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
            }
        case 'democraticMargin':
            return {
                renderValue: (value: number) => {
                    return {
                        value: <ElectionResult value={value} />,
                        unit: <span>%</span>,
                    }
                },
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
            }
        case 'number':
            return {
                renderValue: (value: number) => {
                    return {
                        value: <span>{formatToSignificantFigures(value, 3)}</span>,
                        unit: <span>&nbsp;</span>,
                    }
                },
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
            }
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
