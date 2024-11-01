import { useContext, useEffect } from 'react'

import { Settings, SettingsDictionary } from '../page_template/settings'
import { BooleanSettingKey, fromVector, useVector } from '../page_template/settings-vector'

/**
 * - Query Params -> Settings
 *   Reads specified settings keys from the query params, filling in any blanks with current settings.
 *   If any read values are different, launches the settings into staged mode for those keys.
 *
 * - Settings -> Query Params
 *   Watches settings keys and reflects in query params. Must include all settings
 *
 * CHECK THAT SETTINGS KEYS ARE PRESENT IN `settings-vector.ts`
 * OTHERWISE SETTINGS SHARING WILL NOT WORK
 */
export function QuerySettingsConnection({ settingsKeys }: { settingsKeys: BooleanSettingKey[] }): null {
    const settings = useContext(Settings.Context)

    // Query Params -> Settings
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search)
        const settingsVector = queryParams.get('s')
        if (settingsVector === null) {
            return
        }
        const settingsFromQueryParams = fromVector(settingsVector, settings)
        if (settingsKeys.some(key => JSON.stringify(settingsFromQueryParams[key]) !== JSON.stringify(settings.get(key)))) {
            settings.enterStagedMode(Object.fromEntries(settingsKeys.map(key => [key, settingsFromQueryParams[key]])) as unknown as Partial<SettingsDictionary>)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- We should only load params on first load.
    }, [])

    // Settings -> Query Params
    const settingsVector = useVector()

    useEffect(() => {
        const url = new URL(window.location.toString())
        url.searchParams.set('s', settingsVector)
        if (url.searchParams.toString() !== window.location.search) {
            history.replaceState(null, '', url)
        }

        // If we're in staged mode, our monitored settings are the same as persisted, exit staged mode
        if (settings.getStagedKeys() !== undefined && settingsKeys.every((key) => {
            const info = settings.getSettingInfo(key)
            return JSON.stringify(info.persistedValue) === JSON.stringify(info.stagedValue)
        })) {
            settings.exitStagedMode('discard')
        }
    }, [settingsVector, settingsKeys, settings])

    return null
}
