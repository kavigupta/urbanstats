import { useContext, useEffect } from 'react'

import extra_stats from '../data/extra_stats'
import stat_path_list from '../data/statistic_path_list'
import { Navigator } from '../navigation/Navigator'
import { Settings, SettingsDictionary, sourceEnabledKey, statPathsWithExtra } from '../page_template/settings'
import { useVector, VectorSettingKey, VectorSettingsDictionary } from '../page_template/settings-vector'
import { getAvailableGroups, getAvailableYears, getDataSourceCheckboxes, groupYearKeys, statIsEnabled, useStatPathsAll } from '../page_template/statistic-settings'
import { findAmbiguousSourcesAll, StatPath } from '../page_template/statistic-tree'
import { assert } from '../utils/defensive'

import { isSinglePointerCell } from './pointer-cell'

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
export function QuerySettingsConnection(): null {
    const settings = useContext(Settings.Context)
    const statPaths = useStatPathsAll()
    const navContext = useContext(Navigator.Context)

    // Settings -> Query Params
    const settingsVector = useVector()

    useEffect(() => {
        const kind = navContext.currentDescriptor.kind
        assert(kind === 'article' || kind === 'comparison', 'query settings connection may not be used on this page type')
        navContext.unsafeUpdateCurrentDescriptor({ s: settingsVector, kind })
    }, [settingsVector, navContext])

    useEffect(() => {
        const stagedSettingsKeys = getStagedSettingsKeys(statPaths)
        // If we're in staged mode, our monitored settings are the same as persisted, exit staged mode
        if (settings.getStagedKeys() !== undefined && stagedSettingsKeys.every((key) => {
            const info = settings.getSettingInfo(key)
            return JSON.stringify(info.persistedValue) === JSON.stringify(info.stagedValue)
        })) {
            settings.exitStagedMode('discard')
        }
    }, [statPaths, settings, settingsVector])

    return null
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- No non-histogram extras yet
export const statPathsWithHistogram = extra_stats.filter(([,{ type }]) => type === 'histogram').map(([index]) => stat_path_list[index])

interface SettingsConnectionConfig { stagedSettingsKeys: readonly VectorSettingKey[], applySettingsKeys: (visibleStatPaths: StatPath[]) => readonly VectorSettingKey[] }

export function getStagedSettingsKeys(statPaths: StatPath[][]): readonly VectorSettingKey[] {
    const flatStatPaths = statPaths.flat()
    return [
        'use_imperial',
        'show_historical_cds',
        'simple_ordinals',
        ...getAvailableYears(flatStatPaths).map(year => `show_stat_year_${year}` as const),
        ...getAvailableGroups(flatStatPaths).map(group => `show_stat_group_${group.id}` as const),
        ...getDataSourceCheckboxes(statPaths)
            .flatMap(({ category, checkboxSpecs }) =>
                checkboxSpecs.flatMap(({ name, forcedOn }) => forcedOn
                    ? []
                    : [sourceEnabledKey({ category, name })]),
            ),
        'temperature_unit',
    ] as const
}

export function settingsConnectionConfig({ pageKind, statPaths, settings }: { pageKind: 'article' | 'comparison', statPaths: StatPath[][], settings: Settings }): SettingsConnectionConfig {
    const stagedSettingsKeys = getStagedSettingsKeys(statPaths)

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

    return { stagedSettingsKeys, applySettingsKeys }
}

export function applySettingsParamSettings(settingsFromQueryParams: VectorSettingsDictionary, settings: Settings, availableStatPaths: StatPath[][], { stagedSettingsKeys, applySettingsKeys }: SettingsConnectionConfig): void {
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
}
