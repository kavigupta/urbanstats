import React, { ReactNode, useContext } from 'react'

import '../common.css'
import './quiz.css'
import type_ordering_idx from '../data/type_ordering_idx'
import universes_ordered from '../data/universes_ordered'
import { Navigator } from '../navigation/Navigator'
import { allGroups, Statistic } from '../page_template/statistic-tree'
import { PageTemplate } from '../page_template/template'
import { useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'

import { CountsByUT } from './countsByArticleType'
import { forType } from './load-article'
import { GenericSearchBox } from './search-generic'

const populationStatcols: Statistic[] = allGroups.find(g => g.id === 'population')!.contents.find(g => g.year === 2020)!.stats[0].bySource

export function SYAUPanel(props: { typ?: string, universe?: string, counts: CountsByUT }): ReactNode {
    const headerClass = useHeaderTextClass()
    const subHeaderClass = useSubHeaderTextClass()
    return (
        <PageTemplate>
            <div className={headerClass}>So you&apos;re an urbanist...</div>
            <div className={subHeaderClass}>
                Name every
                <SelectType typ={props.typ} universe={props.universe} counts={props.counts} />
                {' '}
                in
                <SelectUniverse typ={props.typ} universe={props.universe} counts={props.counts} />
            </div>
            <div>
                HI!
            </div>
        </PageTemplate>
    )
}

function populationColumn(counts: CountsByUT, typ: string, universe: string): Statistic | undefined {
    return populationStatcols.find(stat => forType(counts, universe, stat.statcol, typ) > 0)
}

function SelectType(props: { typ?: string, universe?: string, counts: CountsByUT }): ReactNode {
    const types = Object.keys(type_ordering_idx).filter(
        type => props.universe === undefined || populationColumn(props.counts, type, props.universe) !== undefined,
    )
    const navContext = useContext(Navigator.Context)
    return (
        <EditableSelector
            items={types}
            selected={props.typ}
            onSelect={
                type => navContext.link({
                    kind: 'syau',
                    typ: type,
                    universe: props.universe,
                }, { scroll: { kind: 'none' } })
            }
            placeholder="Select a region type"
        />
    )
}

function SelectUniverse(props: { typ?: string, universe?: string, counts: CountsByUT }): ReactNode {
    const navContext = useContext(Navigator.Context)
    const universes = universes_ordered.filter(
        universe => props.typ === undefined || populationColumn(props.counts, props.typ, universe) !== undefined,
    )
    return (
        <EditableSelector
            items={universes}
            selected={props.universe}
            onSelect={
                universe => navContext.link({
                    kind: 'syau',
                    typ: props.typ,
                    universe,
                }, { scroll: { kind: 'none' } })
            }
            placeholder="Select a universe"
        />
    )
}

function EditableSelector(props: {
    items: string[]
    selected: string | undefined
    onSelect: (item: string) => ReturnType<Navigator['link']>
    placeholder: string
}): ReactNode {
    let selected = props.selected
    if (selected !== undefined && !props.items.includes(selected)) {
        selected = undefined
    }
    const subHeaderClass = useSubHeaderTextClass()
    return (
        <GenericSearchBox
            matches={props.items}
            doSearch={(sq: string) => Promise.resolve(props.items.filter(type => type.toLowerCase().includes(sq.toLowerCase())))}
            link={props.onSelect}
            autoFocus={true}
            placeholder={selected ?? props.placeholder}
            style={`${subHeaderClass} syau-searchbox`}
            renderMatch={(currentMatch, onMouseOver, onClick, style, dataTestId) => (
                <div
                    key={currentMatch()}
                    style={style}
                    onClick={onClick}
                    onMouseOver={onMouseOver}
                    data-test-id={dataTestId}
                >
                    {currentMatch()}
                </div>
            )}
        />
    )
}
