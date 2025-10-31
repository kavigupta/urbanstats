import { useContext } from 'react'

import { Navigator } from '../navigation/Navigator'
import { PageData, PageDescriptor } from '../navigation/PageDescriptor'

function hideSidebarDesktop(page: PageData | PageDescriptor): boolean {
    switch (page.kind) {
        case 'initialLoad':
            return hideSidebarDesktop(page.descriptor)
        case 'mapper':
            return true
        default:
            return false
    }
}

export function useHideSidebarDesktop(): boolean {
    const navigator = useContext(Navigator.Context)
    return hideSidebarDesktop(navigator.usePageState().current.data)
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
