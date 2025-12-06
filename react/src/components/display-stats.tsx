import React, { CSSProperties, ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { UnitType } from '../utils/unit'

import { classifyStatistic, getUnitDisplay } from './unit-display'

export function Statistic(props: { style?: React.CSSProperties, statname: string, value: number, isUnit: boolean, unit?: UnitType }): ReactNode {
    const [useImperial] = useSetting('use_imperial')
    const [temperatureUnit] = useSetting('temperature_unit')

    const statisticType = props.unit ?? classifyStatistic(props.statname)
    const unitDisplay = getUnitDisplay(statisticType)
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

export function percentileText(percentile: number, simpleOrdinals: boolean): string {
    // something like Xth percentile
    let text = `${percentile}th percentile`
    if (simpleOrdinals) {
        text = `${percentile.toString()}%`
    }
    else if (percentile % 10 === 1 && percentile % 100 !== 11) {
        text = `${percentile}st percentile`
    }
    else if (percentile % 10 === 2 && percentile % 100 !== 12) {
        text = `${percentile}nd percentile`
    }
    else if (percentile % 10 === 3 && percentile % 100 !== 13) {
        text = `${percentile}rd percentile`
    }
    return text
}

export function Percentile(props: {
    ordinal: number
    total: number
    percentileByPopulation: number
    simpleOrdinals: boolean
}): ReactNode {
    const ordinal = props.ordinal
    const total = props.total
    if (ordinal > total) {
        return <span></span>
    }
    // percentile as an integer
    // used to be keyed by a setting, but now we always use percentile_by_population
    const percentile = props.percentileByPopulation
    const text = percentileText(percentile, props.simpleOrdinals)

    return <div className="serif" style={{ textAlign: 'right', marginRight: props.simpleOrdinals ? '5px' : undefined }}>{text}</div>
}
