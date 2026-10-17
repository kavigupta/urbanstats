import React, { ReactNode } from 'react'

import { desktopContentWidth, useFullWidth } from '../page_template/utils'
import { useMobileLayout, useWindowWidth } from '../utils/responsive'

export function computeComparisonWidthColumns(numDataColumns: number, includeOrdinals: boolean): number {
    return (includeOrdinals ? 1.5 : 1) * numDataColumns + 1
}

export function computeMaxColumns(mobileLayout: boolean): number {
    return mobileLayout ? 3 : 6
}

export function MaybeScroll({ children, widthColumns }: { children: React.ReactNode, widthColumns: number }): ReactNode {
    const mobileLayout = useMobileLayout()
    const fullWidth = useFullWidth()
    const windowWidth = useWindowWidth()
    // The column limits are tuned for the sidebar layout.
    const scale = fullWidth && !mobileLayout ? desktopContentWidth(windowWidth, true) / desktopContentWidth(windowWidth, false) : 1
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
