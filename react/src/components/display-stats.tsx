import React, { ReactNode } from 'react'

import { useSetting } from '../page_template/settings'
import { classifyStatistic, UnitType } from '../utils/unit'

import { getUnitDisplay } from './unit-display'

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
