import React, { ReactNode } from 'react'

import { separateNumber } from '../utils/text'

import { ElectionResult } from './table'

export interface UnitDisplay {
    renderValue: (value: number, useImperial?: boolean, temperatureUnit?: string) => {
        value: ReactNode
        unit: ReactNode
    }
}

export const unitDisplayMap: Record<string, UnitDisplay> = {
    percentage: {
        renderValue: (value: number) => {
            return {
                value: <span>{(value * 100).toFixed(2)}</span>,
                unit: <span>%</span>,
            }
        },
    },
    fatalities: {
        renderValue: (value: number) => {
            return {
                value: <span>{separateNumber(value.toFixed(0))}</span>,
                unit: <span>&nbsp;</span>,
            }
        },
    },
    fatalitiesPerCapita: {
        renderValue: (value: number) => {
            return {
                value: <span>{(100_000 * value).toFixed(2)}</span>,
                unit: <span>/100k</span>,
            }
        },
    },
    density: {
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
    },
    elevation: {
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
    },
    population: {
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
    },
    area: {
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
            return {
                value: <span>{separateNumber(adjustedValue.toFixed(places))}</span>,
                unit,
            }
        },
    },
    meanDistance: {
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
    },
    election: {
        renderValue: (value: number) => {
            return {
                value: <ElectionResult value={value} />,
                unit: <span>%</span>,
            }
        },
    },
    temperature: {
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
    },
    sunnyHours: {
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
    },
    rainfall: {
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
    },
    pollution: {
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
    },
    default: {
        renderValue: (value: number) => {
            return {
                value: <span>{value.toFixed(3)}</span>,
                unit: <span>&nbsp;</span>,
            }
        },
    },
}

export function classifyStatistic(statname: string): keyof typeof unitDisplayMap {
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
        return 'elevation'
    }
    if (statname.startsWith('Population')) {
        return 'population'
    }
    if (statname === 'Area') {
        return 'area'
    }
    if (statname.includes('Mean distance')) {
        return 'meanDistance'
    }
    if (statname.includes('Election') || statname.includes('Swing')) {
        return 'election'
    }
    if (statname.includes('high temp') || statname.includes('high heat index') || statname.includes('dewpt')) {
        return 'temperature'
    }
    if (statname === 'Mean sunny hours') {
        return 'sunnyHours'
    }
    if (statname === 'Rainfall' || statname === 'Snowfall [rain-equivalent]') {
        return 'rainfall'
    }
    if (statname.includes('Pollution')) {
        return 'pollution'
    }
    return 'default'
}
