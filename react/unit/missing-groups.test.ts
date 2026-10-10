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
    'area',
]

const massachusetts = california

/**
 * A Canadian province: the same statistics, from the Canadian census where it is a separate source,
 * and from the National Census where the two countries' statistics are merged.
 */
const alberta: StatPath[] = [
    'population_2021_canada', 'population_2011_canada', 'population_change_2011_canada',
    'gpw_population',
    'generation_silent', 'generation_boomer', 'generation_genx',
    'generation_millenial', 'generation_genz', 'generation_genalpha',
    'marriage_never_married_canada', 'marriage_married_not_divorced_canada', 'marriage_divorced_canada',
    'area',
]

const ontario = alberta

type EnabledKey = StatGroupKey | StatYearKey | StatSourceKey

const populationGroup: EnabledKey[] = ['show_stat_group_population']

const generationGroups: EnabledKey[] = [
    'show_stat_group_generation_silent', 'show_stat_group_generation_boomer', 'show_stat_group_generation_genx',
    'show_stat_group_generation_millenial', 'show_stat_group_generation_genz', 'show_stat_group_generation_genalpha',
]

const marriageGroups: EnabledKey[] = [
    'show_stat_group_marriage_never_married', 'show_stat_group_marriage_married_not_divorced', 'show_stat_group_marriage_divorced',
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
            'show_stat_source_Population_GHSL', 'show_stat_source_Population_Canadian Census',
        ]),
        ['Generation: **National Census** is disabled. Enable it to see these statistics.'],
    )
})

void test('regions missing a statistic for different sources name all of them', () => {
    assert.deepStrictEqual(
        warnings([california, alberta], [
            ...populationGroup, ...marriageGroups, 'show_stat_year_2020',
            'show_stat_source_Population_GHSL',
        ]),
        ['Relationships: **National Census** and **Canadian Census** are disabled. Enable them to see these statistics.'],
    )
})

void test('a comparison warns about the source one of its regions is missing', () => {
    // The Canadian census is enabled, so Alberta's marital status statistics are still in the table;
    // the warning is about the column California is no longer filling in.
    assert.deepStrictEqual(
        warnings([california, alberta], [
            ...populationGroup, ...marriageGroups, 'show_stat_year_2020',
            'show_stat_source_Population_GHSL', 'show_stat_source_Population_Canadian Census',
        ]),
        ['Relationships: **National Census** is disabled. Enable it to see these statistics.'],
    )
})

void test('every source disabled says so without singling one out', () => {
    assert.deepStrictEqual(
        warnings([california, ontario], [...populationGroup, 'show_stat_year_2020']),
        ['Population: **National Census**, **Canadian Census**, and **GHSL** are disabled. Enable one to see this statistic.'],
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
        warnings([california], [...populationGroup, 'show_stat_source_Population_Canadian Census']),
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
