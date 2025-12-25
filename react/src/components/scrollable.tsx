import React, { ReactNode } from 'react'

import { useMobileLayout } from '../utils/responsive'

export function computeComparisonWidthColumns(numDataColumns: number, includeOrdinals: boolean): number {
    return (includeOrdinals ? 1.5 : 1) * numDataColumns + 1
}

export function computeMaxColumns(mobileLayout: boolean): number {
    return mobileLayout ? 3 : 6
}

export function MaybeScroll({ children, widthColumns }: { children: React.ReactNode, widthColumns: number }): ReactNode {
    const mobileLayout = useMobileLayout()
    const maxColumns = computeMaxColumns(mobileLayout)
    const scrollColumnsDivisor = mobileLayout ? 3.5 : 5.3
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
