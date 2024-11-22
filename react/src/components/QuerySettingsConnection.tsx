import React, { ReactNode, useContext, useEffect } from 'react'

import extra_stats from '../data/extra_stats'
import stat_path_list from '../data/statistic_path_list'
import { Settings, SettingsDictionary, source_enabled_key, statPathsWithExtra } from '../page_template/settings'
import { fromVector, useVector, VectorSettingKey } from '../page_template/settings-vector'
import { groupYearKeys, statIsEnabled, useAvailableGroups, useAvailableYears, useDataSourceCheckboxes, useStatPathsAll } from '../page_template/statistic-settings'
import { findAmbiguousSourcesAll, StatPath } from '../page_template/statistic-tree'

import { isSinglePointerCell } from './table'

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
 * For some of these keys, we don't necessarily want to set them unless it will have a visible impact on the UI.
 * Therefore, we generate which settings we would like to apply based on the currently visible `StatPaths`
 *
 * An alternate approach would have been to "omit" these inapplicable settings. But this would require another "settings mask" component in the link.
 */
export function QuerySettingsConnection({ stagedSettingsKeys, applySettingsKeys }: { stagedSettingsKeys: readonly VectorSettingKey[], applySettingsKeys: (visibleStatPaths: StatPath[]) => readonly VectorSettingKey[] }): null {
    const settings = useContext(Settings.Context)
    const availableStatPaths = useStatPathsAll()

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
            // If we haven't saved any previous settings, just save these staged settings
            // This ensures that the new user doesn't get non-default values for settings that aren't relevant to their linked page
            if (localStorage.getItem('settings') === null) {
                settings.exitStagedMode('applyWithoutSaving')
            }
        }
        // ^ It's important that we apply any other settings in the link before calculating the visible stat paths, as these settings could affect the visible stat paths

        // We only want to apply some settings immediately when the user can view certain stat paths
        // So, we need to figure out which stat paths are viewable
        const ambiguousSourcesAll = findAmbiguousSourcesAll(availableStatPaths)
        const groupYearSettings = settings.getMultiple(groupYearKeys())
        const visibleStatPaths = availableStatPaths.flatMap(statPaths => statPaths.filter(statPath => statIsEnabled(statPath, groupYearSettings, ambiguousSourcesAll)))

        const applyKeys = applySettingsKeys(visibleStatPaths)

        for (const applySettingsKey of applyKeys) {
            // If we haven't saved any settings, don't save them yet
            settings.setSetting(applySettingsKey, settingsFromQueryParams[applySettingsKey], localStorage.getItem('settings') !== null)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- We should only load params on first load.
    }, [])

    // Settings -> Query Params
    const settingsVector = useVector()

    // Ordering is important here, as some settings are not applied in the previous effect (discarded 'applySettingsKeys`)
    // So our link should reflect (the non-application of) these discarded settings
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

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- No non-histogram extras yet
export const statPathsWithHistogram = extra_stats.filter(([,{ type }]) => type === 'histogram').map(([index]) => stat_path_list[index])

export function ArticleComparisonQuerySettingsConnection({ pageKind }: { pageKind: 'article' | 'comparison' }): ReactNode {
    const stagedSettingsKeys = [
        'use_imperial',
        'show_historical_cds',
        'simple_ordinals',
        ...useAvailableYears().map(year => `show_stat_year_${year}` as const),
        ...useAvailableGroups().map(group => `show_stat_group_${group.id}` as const),
        ...useDataSourceCheckboxes()
            .flatMap(({ category, checkboxSpecs }) =>
                checkboxSpecs.flatMap(({ name, forcedOn }) => forcedOn
                    ? []
                    : [source_enabled_key({ category, name })]),
            ),
        'temperature_unit',
    ] as const

    const settings = useContext(Settings.Context)

    const applySettingsKeys = (visibleStatPaths: StatPath[]): typeof result => {
        const singlePointerCell = isSinglePointerCell(settings)
        const result = [
            ...statPathsWithExtra.filter(path => visibleStatPaths.includes(path)).map(path => `expanded__${path}` as const),
            ...(statPathsWithHistogram.some(path => visibleStatPaths.includes(path)) ? ['histogram_relative', 'histogram_type'] as const : []),
            ...(pageKind === 'article' && singlePointerCell ? ['mobile_article_pointers'] as const : []),
        ] as const
        return result
    }

    /* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-redundant-type-constituents -- Type Checking Section */
    let included: typeof stagedSettingsKeys[number] | ReturnType<typeof applySettingsKeys>[number]
    let notIncluded: never

    const failsIfMissing: (typeof included | typeof notIncluded)[] = [] as VectorSettingKey[]
    const failsIfOverlap: never[] = [] as (typeof included & typeof notIncluded)[]
    /* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/no-redundant-type-constituents */

    return <QuerySettingsConnection stagedSettingsKeys={stagedSettingsKeys} applySettingsKeys={applySettingsKeys} />
}
