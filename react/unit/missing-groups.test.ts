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

// Importing the navigator builds the whole router. These tests only use the non-hook exports,
// which take the statistics and settings directly.
mock.module('../src/navigation/Navigator', { namedExports: { Navigator: {} } })

const { getAvailableGroups, getAvailableYears, groupYearKeys, missingGroups } = await import('../src/page_template/statistic-settings')

/**
 * The statistics an article page has, as the site would give them: every path the region has data
 * for, whatever the settings say about showing it.
 */
const california: StatPath[] = [
    'population', 'population_2010', 'population_change_2010', 'population_2000', 'population_change_2000',
    'gpw_population',
    'generation_silent', 'generation_boomer', 'generation_genx',
    'generation_millenial', 'generation_genz', 'generation_genalpha',
    'marriage_never_married', 'marriage_married_not_divorced', 'marriage_divorced',
    'household_size_pw',
    'area',
]

const massachusetts = california

/** A Canadian province: the same statistics, without 2000. */
const ontario: StatPath[] = [
    'population', 'population_2010', 'population_change_2010',
    'gpw_population',
    'generation_silent', 'generation_boomer', 'generation_genx',
    'generation_millenial', 'generation_genz', 'generation_genalpha',
    'marriage_never_married', 'marriage_married_not_divorced', 'marriage_divorced',
    'household_size_pw',
    'area',
]

type EnabledKey = StatGroupKey | StatYearKey | StatSourceKey

const populationGroup: EnabledKey[] = ['show_stat_group_population']

const generationGroups: EnabledKey[] = [
    'show_stat_group_generation_silent', 'show_stat_group_generation_boomer', 'show_stat_group_generation_genx',
    'show_stat_group_generation_millenial', 'show_stat_group_generation_genz', 'show_stat_group_generation_genalpha',
]

function settingsWith(enabled: EnabledKey[]): StatGroupSettings {
    const settings = Object.fromEntries(groupYearKeys().map(key => [key, false]))
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
        availableGroups: getAvailableGroups(contextStatPaths),
    }).map(({ groupOrCategory, reason }) => {
        const message = renderToStaticMarkup(createElement(Fragment, null, warningMessage(reason, groupOrCategory)))
        return `${groupOrCategory.name}: ${message.replaceAll(/<\/?b>/g, '**')}`
    })
}

void test('a statistic that only the disabled source has names that source', () => {
    // Issue #2165: the Population category has other sources, and they are enabled -- enabling them
    // is what makes the population statistic itself show up -- but they have no generation data.
    assert.deepStrictEqual(
        warnings([california], [
            ...populationGroup, ...generationGroups, 'show_stat_year_2020',
            'show_stat_source_Population_GHSL',
        ]),
        ['Generation: **National Census** is disabled. Enable it to see these statistics.'],
    )
})

/** PW density at 250m comes from the National Census only; at 64km, from GHSL too. */
const californiaDensities: StatPath[] = [...california, 'ad_0.25', 'ad_64', 'gpw_pw_density_64']

const densityGroups: EnabledKey[] = ['show_stat_group_ad_0.25', 'show_stat_group_ad_64']

void test('statistics missing for different sources each name their own', () => {
    assert.deepStrictEqual(
        warnings([californiaDensities], [...densityGroups, 'show_stat_year_2020']),
        [
            'PW Density (r=250m): **National Census** is disabled. Enable it to see this statistic.',
            'PW Density (r=64km): **National Census** and **GHSL** are disabled. Enable one to see this statistic.',
        ],
    )
})

void test('warns only about the statistics a disabled source takes away', () => {
    // GHSL is enabled, so the 64km density is still in the table.
    assert.deepStrictEqual(
        warnings([californiaDensities], [
            ...densityGroups, 'show_stat_year_2020', 'show_stat_source_Population_GHSL',
        ]),
        ['PW Density (r=250m): **National Census** is disabled. Enable it to see this statistic.'],
    )
})

/** PW density at 250m comes from the National Census only; at 64km, from GHSL too. */
const californiaDensities: StatPath[] = [...california, 'ad_0.25', 'ad_64', 'gpw_pw_density_64']

const densityGroups: EnabledKey[] = ['show_stat_group_ad_0.25', 'show_stat_group_ad_64']

void test('warnings come in statistic tree order, whatever their reasons', () => {
    // Issue #2599: the 64km warning has the same reason as the population one, and used to come
    // right after it.
    assert.deepStrictEqual(
        warnings([californiaDensities], [...populationGroup, ...densityGroups, 'show_stat_year_2020']),
        [
            'Population: **National Census** and **GHSL** are disabled. Enable one to see this statistic.',
            'PW Density (r=250m): **National Census** is disabled. Enable it to see this statistic.',
            'PW Density (r=64km): **National Census** and **GHSL** are disabled. Enable one to see this statistic.',
        ],
    )
})

void test('every source disabled says so without singling one out', () => {
    assert.deepStrictEqual(
        warnings([california, ontario], [...populationGroup, 'show_stat_year_2020']),
        ['Population: **National Census** and **GHSL** are disabled. Enable one to see this statistic.'],
    )
})

void test('regions each missing a different source name all of them', () => {
    // Made up: each region has its population from one source only. The statistics from the other
    // source keep it from being the region's only Population source, which would force it on.
    const censusPopulation: StatPath[] = ['population', 'gpw_pw_density_64', 'area']
    const ghslPopulation: StatPath[] = ['gpw_population', 'generation_genz', 'area']
    assert.deepStrictEqual(
        warnings([censusPopulation, ghslPopulation], [...populationGroup, 'show_stat_year_2020']),
        ['Population: **National Census** and **GHSL** are disabled. Enable them to see this statistic.'],
    )
})

void test('a year the enabled source lacks is about the year, not the source', () => {
    // GHSL is enabled and simply has no data for 2010, so selecting 2020 is what brings it back.
    assert.deepStrictEqual(
        warnings([massachusetts, california], [
            ...populationGroup, 'show_stat_year_2010', 'show_stat_source_Population_GHSL',
        ]),
        ['Population: Select **2020** to see this statistic.'],
    )
})

void test('no year selected and no source enabled asks for both', () => {
    // Issue #2164: neither half of this on its own would bring the statistic back, so naming only
    // one of them (or, as before, warning about nothing at all) leaves the page unexplained.
    assert.deepStrictEqual(
        warnings([california], populationGroup),
        ['Population: Select **2020**, **2010**, or **2000** and enable **National Census** or **GHSL** to see this statistic.'],
    )
})

void test('a whole subcategory in an incomplete category consolidates into the subcategory', () => {
    // The segregation groups are available but unselected, so the Race category can't stand in;
    // its pie chart of races can.
    // eslint-disable-next-line no-restricted-syntax -- these are stat paths, not css colors
    const race: StatPath[] = ['white', 'black', 'homogeneity_250_2020']
    assert.deepStrictEqual(
        warnings([race], ['show_stat_group_white', 'show_stat_group_black']),
        ['Racial Composition: Select **2020** to see these statistics.'],
    )
})
