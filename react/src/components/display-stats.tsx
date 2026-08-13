import React, { CSSProperties, ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { classifyStatistic, Unit, unitTypeToUnit } from '../utils/unit'

import { getQuantityDisplay } from './unit-display'

export function Statistic(props: { style?: React.CSSProperties, statname: string, value: number, isUnit: boolean, unit?: Unit }): ReactNode {
    const [useImperial] = useSetting('use_imperial')
    const [temperatureUnit] = useSetting('temperature_unit')

    const unitDisplay = getQuantityDisplay(props.unit ?? unitTypeToUnit(classifyStatistic(props.statname)))
    const { value, unit } = unitDisplay.renderValue(props.value, useImperial, temperatureUnit)

    return (
        <span style={props.style}>
            {props.isUnit ? unit : value}
        </span>
    )
}

export function ElectionResult(props: { value: number }): ReactNode {
    const colors = useColors()
    // check if value is NaN
    if (props.value !== props.value) {
        return <span>N/A</span>
    }
    const value = Math.abs(props.value) * 100
    const places = value > 10 ? 1 : value > 1 ? 2 : value > 0.1 ? 3 : 4
    const text = value.toFixed(places)
    const party = props.value > 0 ? 'D' : 'R'
    const partyColor = props.value > 0 ? colors.hueColors.blue : colors.hueColors.red
    const spanStyle: CSSProperties = {
        color: partyColor,
        // So that on 4 digits, we overflow left
        display: 'flex',
        justifyContent: 'flex-end',
    }
    return (
        <span style={spanStyle}>
            {party}
            +
            {text}
        </span>
    )
}

export function GenericPartyPercentage(props: { value: number, unitType: string }): ReactNode {
    const colors = useColors()
    // check if value is NaN
    if (props.value !== props.value) {
        return <span>N/A</span>
    }
    const colorMap: Record<string, string> = {
        partyPctRed: colors.hueColors.red, // Liberals are red
        partyPctBlue: colors.hueColors.blue, // Conservatives are blue
        partyPctOrange: colors.hueColors.orange,
        partyPctTeal: colors.hueColors.cyan,
        partyPctGreen: colors.hueColors.green,
        partyPctPurple: colors.hueColors.purple,
    }
    const displayValue = (props.value * 100).toFixed(2)
    const spanStyle: CSSProperties = {
        color: colorMap[props.unitType],
        display: 'flex',
        justifyContent: 'flex-end',
    }
    return <span style={spanStyle}>{displayValue}</span>
}

export function GenericPartyChange(props: { value: number, unitType: string }): ReactNode {
    const colors = useColors()
    // check if value is NaN
    if (props.value !== props.value) {
        return <span>N/A</span>
    }
    const colorMap: Record<string, string> = {
        partyChangeRed: colors.hueColors.red, // Liberals are red
        partyChangeBlue: colors.hueColors.blue, // Conservatives are blue
        partyChangeOrange: colors.hueColors.orange,
        partyChangeTeal: colors.hueColors.cyan,
        partyChangeGreen: colors.hueColors.green,
        partyChangePurple: colors.hueColors.purple,
    }
    const displayValue = (props.value * 100).toFixed(2)
    const sign = props.value >= 0 ? '+' : ''
    const spanStyle: CSSProperties = {
        color: colorMap[props.unitType],
        display: 'flex',
        justifyContent: 'flex-end',
    }
    return (
        <span style={spanStyle}>
            {sign}
            {displayValue}
        </span>
    )
}

export function LeftMargin(props: { value: number }): ReactNode {
    const colors = useColors()
    // check if value is NaN
    if (props.value !== props.value) {
        return <span>N/A</span>
    }
    const absValue = Math.abs(props.value) * 100
    const places = absValue > 10 ? 1 : absValue > 1 ? 2 : absValue > 0.1 ? 3 : 4
    const text = absValue.toFixed(places)
    const party = props.value > 0 ? 'L' : 'R'
    const partyColor = props.value > 0 ? colors.hueColors.red : colors.hueColors.blue
    const spanStyle: CSSProperties = {
        color: partyColor,
        display: 'flex',
        justifyContent: 'flex-end',
    }
    return (
        <span style={spanStyle}>
            {party}
            +
            {text}
        </span>
    )
}

// The ordinal suffix ("st"/"nd"/"rd"/"th") for a percentile number.
export function percentileSuffix(percentile: number): string {
    if (percentile % 10 === 1 && percentile % 100 !== 11) {
        return 'st'
    }
    if (percentile % 10 === 2 && percentile % 100 !== 12) {
        return 'nd'
    }
    if (percentile % 10 === 3 && percentile % 100 !== 13) {
        return 'rd'
    }
    return 'th'
}

export function percentileText(percentile: number, simpleOrdinals: boolean): string {
    if (simpleOrdinals) {
        return `${percentile.toString()}%`
    }
    // something like Xth percentile
    return `${percentile}${percentileSuffix(percentile)} percentile`
}
