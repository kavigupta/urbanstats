import React, { ReactNode, useMemo } from 'react'

import { useSetting } from '../page_template/settings'
import { ReaderSettings, StoredUnit } from '../utils/quantity'

import { renderQuantity } from './unit-display'

/** What the reader reads in, which a caption's numbers are written in as much as a table's are. */
export function useReaderSettings(): ReaderSettings {
    const [useImperial] = useSetting('use_imperial')
    const [temperatureUnit] = useSetting('temperature_unit')
    // memoized, so that a caller that puts it in a dependency array does not rebuild every render
    return useMemo(() => ({ useImperial, temperatureUnit }), [useImperial, temperatureUnit])
}

export function Statistic(props: { style?: React.CSSProperties, value: number, isUnit: boolean, unit: StoredUnit, unitAlone?: boolean }): ReactNode {
    const [useImperial] = useSetting('use_imperial')
    const [temperatureUnit] = useSetting('temperature_unit')

    const { value, unit } = renderQuantity(props.value, props.unit, { useImperial, temperatureUnit }, { alone: props.unitAlone })

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
