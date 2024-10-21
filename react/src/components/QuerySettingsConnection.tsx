import { useContext, useEffect } from 'react'

import { Settings, SettingsDictionary, useSettings } from '../page_template/settings'

/**
 * - Query Params -> Settings
 *   Reads specified settings keys from the query params, filling in any blanks with persisted settings values.
 *   If any read values are different, launches the settings into staged mode for those keys.
 *
 * - Settings -> Query Params
 *   Watches settings keys and reflects in query params
 */

export function QuerySettingsConnection({ settingsKeys }: { settingsKeys: (keyof SettingsDictionary)[] }): null {
    const settingsValues = useSettings(settingsKeys)
    const settings = useContext(Settings.Context)

    // Query Params -> Settings
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search)
        const settingsFromQueryParams = Object.fromEntries(settingsKeys.map(key => [key, decodeQueryParamValue(queryParams.get(key)) ?? settings.get(key)])) as Partial<SettingsDictionary>
        if (settingsKeys.some(key => settingsFromQueryParams[key] !== settings.get(key))) {
            settings.enterStagedMode(settingsFromQueryParams)
        }
    }, [])

    // Settings -> Query Params
    useEffect(() => {
        const url = new URL(window.location.toString())
        for (const [key, value] of Object.entries(settingsValues)) {
            if (value !== undefined) {
                url.searchParams.set(key, value.toString())
            }
        }
        if (url.searchParams.toString().toString() !== window.location.search) {
            history.replaceState(null, '', url)
        }

        // If we're in staged mode, our monitored settings are the same as persisted, exit staged mode
        if (settings.getStagedKeys() !== undefined && settingsKeys.every((key) => {
            const info = settings.getSettingInfo(key)
            return info.persistedValue === info.stagedValue
        })) {
            settings.exitStagedMode('discard')
        }
    }, [settingsValues])

    return null
}

function decodeQueryParamValue(value: string | null): unknown {
    switch (value) {
        case 'true':
            return true
        case 'false':
            return false
        default:
            return value
    }
}
