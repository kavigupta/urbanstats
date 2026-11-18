import { createContext, useContext } from 'react'

import { Navigator } from '../navigation/Navigator'
import { PageData, PageDescriptor } from '../navigation/PageDescriptor'

export const fullWidthContext = createContext(false)

export const desktopLayout = {
    maxWidthEm: 80,
    sidebarPercent: 20,
    sidebarContentPaddingEm: 2,
    fullWidthPaddingEm: 1,
}

/** In px, so content can size itself for either layout. */
export function desktopContentWidth(windowWidth: number, fullWidth: boolean): number {
    const em = parseFloat(getComputedStyle(document.documentElement).fontSize)
    return fullWidth
        ? windowWidth - 2 * desktopLayout.fullWidthPaddingEm * em
        : (1 - desktopLayout.sidebarPercent / 100) * Math.min(desktopLayout.maxWidthEm * em, windowWidth) - desktopLayout.sidebarContentPaddingEm * em
}

export function useFullWidth(): boolean {
    return useContext(fullWidthContext)
}

function headerLogoKey(page: PageData | PageDescriptor): 'bannerURL' | 'mapperBannerURL' {
    switch (page.kind) {
        case 'initialLoad':
            return headerLogoKey(page.descriptor)
        case 'mapper':
            return 'mapperBannerURL'
        default:
            return 'bannerURL'
    }
}

export function useHeaderLogoKey(): 'bannerURL' | 'mapperBannerURL' {
    const navigator = useContext(Navigator.Context)
    return headerLogoKey(navigator.usePageState().current.data)
}
