import React, { ReactNode } from 'react'

import { useUnitSettings } from '../page_template/settings'
import { StoredUnit } from '../utils/quantity'

import { renderQuantity } from './unit-display'

export function Statistic(props: { style?: React.CSSProperties, value: number, isUnit: boolean, unit: StoredUnit, unitAlone?: boolean }): ReactNode {
    const { value, unit } = renderQuantity(props.value, props.unit, useUnitSettings(), props.unitAlone === true ? 'inColumn' : 'byItself')

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
