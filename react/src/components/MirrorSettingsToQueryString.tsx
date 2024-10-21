import { useEffect } from 'react'

import { SettingsDictionary, useSettings } from '../page_template/settings'

export function MirrorSettingsToQueryString({ settingsKeys }: { settingsKeys: (keyof SettingsDictionary)[] }): null {
    const settingsValues = useSettings(settingsKeys)

    useEffect(() => {
        const url = new URL(window.location.toString())
        for (const [key, value] of Object.entries(settingsValues)) {
            url.searchParams.set(key, (value ?? false).toString())
        }
        if (url.searchParams.toString().toString() !== window.location.search) {
            history.replaceState(null, '', url)
        }
    }, [settingsValues])
    return null
}
