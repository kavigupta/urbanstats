import assert from 'assert/strict'
import { mock, test } from 'node:test'

import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import './util/localStorage'
import './util/window'
import { warningMessage } from '../src/components/warning-message'
import type { StatGroupKey, StatSourceKey, StatYearKey } from '../src/page_template/settings'
import type { StatGroupSettings } from '../src/page_template/statistic-settings'
import type { StatPath } from '../src/page_template/statistic-tree'

// Only the hooks in statistic-settings go through the navigator, which builds the whole router as
// it loads. These tests hand the statistics and the settings over directly instead.
mock.module('../src/navigation/Navigator', { namedExports: { Navigator: {} } })

const { getAvailableGroups, getAvailableTree, getAvailableYears, groupYearKeys, missingGroups } = await import('../src/page_template/statistic-settings')

/**
 * The statistics an article page has, as the site would give them: every path the region has data
 * for, whatever the settings say about showing it.
 */
const california: StatPath[] = [
    'population', 'population_2010', 'population_change_2010', 'population_2000', 'population_change_2000',
    'gpw_population',
    'generation_silent', 'generation_boomer', 'generation_genx',
    'generation_millenial', 'generation_genz', 'generation_genalpha',
    'area',
]

const massachusetts = california

/** A Canadian province: the same statistics, but from the Canadian census instead of the US one. */
const ontario: StatPath[] = [
    'population_2021_canada', 'population_2011_canada', 'population_change_2011_canada',
    'gpw_population',
    'generation_silent_canada', 'generation_boomer_canada', 'generation_genx_canada',
    'generation_millenial_canada', 'generation_genz_canada', 'generation_genalpha_canada',
    'area',
]

type EnabledKey = StatGroupKey | StatYearKey | StatSourceKey

const populationGroup: EnabledKey[] = ['show_stat_group_population']

function settingsWith(enabled: EnabledKey[]): StatGroupSettings {
    const settings = Object.fromEntries(groupYearKeys().map(key => [key, false])) as StatGroupSettings
    for (const key of enabled) {
        settings[key] = true
    }
    return settings
}

/** The warnings the page would show, as `<statistic name>: <message>` with the bold parts marked. */
function warnings(statPathsAll: StatPath[][], enabled: EnabledKey[]): string[] {
    const settings = settingsWith(enabled)
    const contextStatPaths = statPathsAll.flat()
    return missingGroups({
        selectedGroups: getAvailableGroups(contextStatPaths).filter(group => settings[`show_stat_group_${group.id}`]),
        selectedYears: getAvailableYears(contextStatPaths).filter(year => settings[`show_stat_year_${year}`]),
        statPathsAll,
        settings,
        availableTree: getAvailableTree(statPathsAll),
    }).map(({ groupOrCategory, reason }) => {
        const message = renderToStaticMarkup(createElement(Fragment, null, warningMessage(reason, groupOrCategory)))
        return `${groupOrCategory.name}: ${message.replaceAll(/<\/?b>/g, '**')}`
    })
}

void test('a year no enabled source has is about the year', () => {
    assert.deepStrictEqual(
        warnings([massachusetts, california], [
            ...populationGroup, 'show_stat_year_2010', 'show_stat_source_Population_GHSL',
        ]),
        ['Population: Select **2020** to see this statistic.'],
    )
})

void test('every year the page has is named, not every year the tree has', () => {
    assert.deepStrictEqual(
        warnings([california], [...populationGroup, 'show_stat_source_Population_US Census']),
        ['Population: Select **2020**, **2010**, or **2000** to see this statistic.'],
    )
})

void test('no source enabled is about the sources', () => {
    assert.deepStrictEqual(
        warnings([california, ontario], [...populationGroup, 'show_stat_year_2020']),
        ['Population: All **Population Sources** are disabled. Enable one to see this statistic.'],
    )
})
