import React, { ReactNode } from 'react'

import { useMobileLayout } from '../utils/responsive'

export function computeComparisonWidthColumns(numDataColumns: number, includeOrdinals: boolean): number {
    return (includeOrdinals ? 1.5 : 1) * numDataColumns + 1
}

export function computeMaxColumns(mobileLayout: boolean): number {
    return mobileLayout ? 3 : 6
}

export function MaybeScroll({ children, widthColumns, scale = 1 }: {
    children: React.ReactNode
    widthColumns: number
    /** How many times wider the container is than the layout the column limits are tuned for. */
    scale?: number
}): ReactNode {
    const mobileLayout = useMobileLayout()
    const maxColumns = computeMaxColumns(mobileLayout) * scale
    const scrollColumnsDivisor = (mobileLayout ? 3.5 : 5.3) * scale
    if (widthColumns <= maxColumns) {
        return children
    }
    return (
        <div style={{ overflowX: 'scroll' }}>
            <div style={{ width: `${100 * widthColumns / scrollColumnsDivisor}%` }}>
                {children}
            </div>
        </div>
    )
}
