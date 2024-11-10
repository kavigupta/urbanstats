import React, { ReactNode, useContext, useEffect } from 'react'

import { Settings, SettingsDictionary, statPathsWithExtra } from '../page_template/settings'
import { fromVector, useVector, VectorSettingKey } from '../page_template/settings-vector'
import { useAvailableGroups, useAvailableYears, useStatPaths } from '../page_template/statistic-settings'

/**
 * - Query Params -> Settings
 *   Reads specified settings keys from the query params, filling in any blanks with current settings.
 *   If any read values are different, launches the settings into staged mode for those keys.
 *
 * - Settings -> Query Params
 *   Watches settings keys and reflects in query params. Must include all settings
 *
 * For `stagedSettingsKeys`, changes will launch the interface into staging mode.
 * For `applySettingsKeys`, these setting values will be automatically applied without entering staging mode.
 */
export function QuerySettingsConnection({ stagedSettingsKeys, applySettingsKeys }: { stagedSettingsKeys: VectorSettingKey[], applySettingsKeys: VectorSettingKey[] }): null {
    const settings = useContext(Settings.Context)

    // Query Params -> Settings
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search)
        const settingsVector = queryParams.get('s')
        if (settingsVector === null) {
            return
        }
        const settingsFromQueryParams = fromVector(settingsVector, settings)
        if (stagedSettingsKeys.some(key => JSON.stringify(settingsFromQueryParams[key]) !== JSON.stringify(settings.get(key)))) {
            settings.enterStagedMode(Object.fromEntries(stagedSettingsKeys.map(key => [key, settingsFromQueryParams[key]])) as unknown as Partial<SettingsDictionary>)
        }
        for (const applySettingsKey of applySettingsKeys) {
            settings.setSetting(applySettingsKey, settingsFromQueryParams[applySettingsKey])
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
        if (settings.getStagedKeys() !== undefined && stagedSettingsKeys.every((key) => {
            const info = settings.getSettingInfo(key)
            return JSON.stringify(info.persistedValue) === JSON.stringify(info.stagedValue)
        })) {
            settings.exitStagedMode('discard')
        }
    }, [settingsVector, stagedSettingsKeys, settings])

    return null
}

export function ArticleComparisonQuerySettingsConnection(): ReactNode {
    const availableStatPaths = useStatPaths()
    const availableStatPathsWithExtra = statPathsWithExtra.filter(path => availableStatPaths.includes(path))

    const stagedSettingsKeys: VectorSettingKey[] = [
        'use_imperial',
        'show_historical_cds',
        'simple_ordinals',
        ...useAvailableYears().map(year => `show_stat_year_${year}` as const),
        ...useAvailableGroups().map(group => `show_stat_group_${group.id}` as const),
    ]

    const applySettingsKeys: VectorSettingKey[] = [
        ...availableStatPathsWithExtra.map(path => `expanded__${path}` as const),
    ]

    return <QuerySettingsConnection stagedSettingsKeys={stagedSettingsKeys} applySettingsKeys={applySettingsKeys} />
}
