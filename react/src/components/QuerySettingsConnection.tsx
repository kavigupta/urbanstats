import React, { ReactNode, useCallback, useContext, useEffect, useMemo } from 'react'

import extra_stats from '../data/extra_stats'
import stat_path_list from '../data/statistic_path_list'
import { NavigationContext } from '../navigation/navigator'
import { Settings, SettingsDictionary, source_enabled_key, statPathsWithExtra } from '../page_template/settings'
import { useVector, VectorSettingKey, VectorSettingsDictionary } from '../page_template/settings-vector'
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
export function QuerySettingsConnection({ vectorSettings, stagedSettingsKeys, applySettingsKeys }: { vectorSettings: VectorSettingsDictionary | undefined, stagedSettingsKeys: readonly VectorSettingKey[], applySettingsKeys: (visibleStatPaths: StatPath[]) => readonly VectorSettingKey[] }): null {
    const settings = useContext(Settings.Context)
    const availableStatPaths = useStatPathsAll()

    // Query Params -> Settings
    useEffect(() => {
        if (vectorSettings === undefined) {
            return
        }
        if (stagedSettingsKeys.some(key => JSON.stringify(vectorSettings[key]) !== JSON.stringify(settings.get(key)))) {
            settings.enterStagedMode(Object.fromEntries(stagedSettingsKeys.map(key => [key, vectorSettings[key]])) as unknown as Partial<SettingsDictionary>)
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
            settings.setSetting(applySettingsKey, vectorSettings[applySettingsKey], localStorage.getItem('settings') !== null)
        }
    }, [settings, vectorSettings, stagedSettingsKeys, applySettingsKeys, availableStatPaths])

    // Settings -> Query Params
    const settingsVector = useVector()

    const navContext = useContext(NavigationContext)!

    // Ordering is important here, as some settings are not applied in the previous effect (discarded 'applySettingsKeys`)
    // So our link should reflect (the non-application of) these discarded settings
    useEffect(() => {
        navContext.setSettingsVector(settingsVector)

        // If we're in staged mode, our monitored settings are the same as persisted, exit staged mode
        if (settings.getStagedKeys() !== undefined && stagedSettingsKeys.every((key) => {
            const info = settings.getSettingInfo(key)
            return JSON.stringify(info.persistedValue) === JSON.stringify(info.stagedValue)
        })) {
            settings.exitStagedMode('discard')
        }
    }, [settingsVector, stagedSettingsKeys, settings, navContext])

    return null
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- No non-histogram extras yet
export const statPathsWithHistogram = extra_stats.filter(([,{ type }]) => type === 'histogram').map(([index]) => stat_path_list[index])

export function ArticleComparisonQuerySettingsConnection({ pageKind, vectorSettings }: { pageKind: 'article' | 'comparison', vectorSettings: VectorSettingsDictionary | undefined }): ReactNode {
    const availableYears = useAvailableYears()
    const availableGroups = useAvailableGroups()
    const dataSourceCheckboxes = useDataSourceCheckboxes()

    const stagedSettingsKeys = useMemo(() => [
        'use_imperial',
        'show_historical_cds',
        'simple_ordinals',
        ...availableYears.map(year => `show_stat_year_${year}` as const),
        ...availableGroups.map(group => `show_stat_group_${group.id}` as const),
        ...dataSourceCheckboxes
            .flatMap(({ category, checkboxSpecs }) =>
                checkboxSpecs.flatMap(({ name, forcedOn }) => forcedOn
                    ? []
                    : [source_enabled_key({ category, name })]),
            ),
        'temperature_unit',
    ] as const, [availableYears, availableGroups, dataSourceCheckboxes])

    const settings = useContext(Settings.Context)

    const applySettingsKeys = useCallback((visibleStatPaths: StatPath[]): typeof result => {
        const singlePointerCell = isSinglePointerCell(settings)
        const result = [
            ...statPathsWithExtra.filter(path => visibleStatPaths.includes(path)).map(path => `expanded__${path}` as const),
            ...(statPathsWithHistogram.some(path => visibleStatPaths.includes(path)) ? ['histogram_relative', 'histogram_type'] as const : []),
            ...(pageKind === 'article' && singlePointerCell ? ['mobile_article_pointers'] as const : []),
        ] as const
        return result
    }, [pageKind, settings])

    /* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-redundant-type-constituents -- Type Checking Section */
    let included: typeof stagedSettingsKeys[number] | ReturnType<typeof applySettingsKeys>[number]
    let notIncluded: never

    const failsIfMissing: (typeof included | typeof notIncluded)[] = [] as VectorSettingKey[]
    const failsIfOverlap: never[] = [] as (typeof included & typeof notIncluded)[]
    /* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/no-redundant-type-constituents */

    return <QuerySettingsConnection vectorSettings={vectorSettings} stagedSettingsKeys={stagedSettingsKeys} applySettingsKeys={applySettingsKeys} />
}
