import { useSyncExternalStore } from 'react'

import { useColors } from '../page_template/colors'

export function isMobileLayout(): boolean {
    return window.innerWidth <= 1100
}

export function useMobileLayout(): boolean {
    return useSyncExternalStore((listener) => {
        const myListener = (): void => {
            if (window.innerWidth !== 1) {
                // When taking screenshots, testcafe sets the inner width to 1, so we want to throw away those updates
                listener()
            }
        }
        window.addEventListener('resize', myListener)
        return () => { window.removeEventListener('resize', myListener) }
    }, isMobileLayout)
}

export function useHeaderTextClass(): string {
    return `centered_text ${useMobileLayout() ? 'headertext_mobile' : 'headertext'}`
}

export function useSubHeaderTextClass(): string {
    return `centered_text ${useMobileLayout() ? 'subheadertext_mobile' : 'subheadertext'}`
}

export function useComparisonHeadStyle(
    align: React.CSSProperties['textAlign'] = 'center',
): React.CSSProperties {
    const colors = useColors()
    // bold
    return {
        fontSize: useMobileLayout() ? '15px' : '20px',
        fontWeight: 500,
        margin: '0',
        padding: '0',
        textAlign: align,
        verticalAlign: 'bottom',
        color: colors.textMain,
    }
}
