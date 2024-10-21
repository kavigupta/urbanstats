import { useContext, useEffect } from 'react'

import { Settings, SettingsDictionary, useSettings } from '../page_template/settings'

/**
 * - Query Params -> Settings
 *   Reads specified settings keys from the query params, filling in any blanks with current settings.
 *   If any read values are different, launches the settings into staged mode for those keys.
 *
 * - Settings -> Query Params
 *   Watches settings keys and reflects in query params. Must include all settings
 */

export function QuerySettingsConnection({ settingsKeys }: { settingsKeys: (keyof SettingsDictionary)[] }): null {
    const settingsValues = useSettings(settingsKeys)
    const settings = useContext(Settings.Context)

    // Query Params -> Settings
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search)
        const settingsFromQueryParams = Object.fromEntries(settingsKeys.map(key => [key, JSON.parse(queryParams.get(key) ?? 'null') ?? settings.get(key)])) as Partial<SettingsDictionary>
        if (settingsKeys.some(key => JSON.stringify(settingsFromQueryParams[key]) !== JSON.stringify(settings.get(key)))) {
            settings.enterStagedMode(settingsFromQueryParams)
        }
    }, [])

    // Settings -> Query Params
    useEffect(() => {
        const url = new URL(window.location.toString())
        for (const [key, value] of Object.entries(settingsValues)) {
            url.searchParams.set(key, JSON.stringify(value))
        }
        if (url.searchParams.toString().toString() !== window.location.search) {
            history.replaceState(null, '', url)
        }

        // If we're in staged mode, our monitored settings are the same as persisted, exit staged mode
        if (settings.getStagedKeys() !== undefined && settingsKeys.every((key) => {
            const info = settings.getSettingInfo(key)
            return JSON.stringify(info.persistedValue) === JSON.stringify(info.stagedValue)
        })) {
            settings.exitStagedMode('discard')
        }
    }, [settingsValues])

    return null
}
