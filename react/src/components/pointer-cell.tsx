import React, { ReactNode } from 'react'

import { Settings, useSetting } from '../page_template/settings'
import { isMobileLayout, useMobileLayout } from '../utils/responsive'

// Reactive and non-reactive versions of the same function
export function useSinglePointerCell(): boolean {
    const isMobile = useMobileLayout()
    const [simpleOrdinals] = useSetting('simple_ordinals')
    return isMobile && !simpleOrdinals
}

export function isSinglePointerCell(settings: Settings): boolean {
    return isMobileLayout() && !settings.get('simple_ordinals')
}

export function PointerArrow({ direction, disabled }: { direction: -1 | 1, disabled: boolean }): ReactNode {
    const spanStyle: React.CSSProperties = {
        transform: `scale(${direction * -1}, 1)`, // Because the right unicode arrow is weird
        display: 'inline-block',
        visibility: disabled ? 'hidden' : 'visible',
    }

    return (
        <span style={spanStyle}>
            {'◁\ufe0e'}
        </span>
    )
}
