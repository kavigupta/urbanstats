import React, { ReactNode, useContext } from 'react'

import '../common.css'

import { CountsByUT } from '../components/countsByArticleType'
import { GenericSearchBox } from '../components/search-generic'
import type_ordering_idx from '../data/type_ordering_idx'
import universes_ordered from '../data/universes_ordered'
import { Navigator } from '../navigation/Navigator'
import { PageTemplate } from '../page_template/template'
import { StoredProperty } from '../quiz/quiz'
import { useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'

import { populationColumn, SYAUData } from './load'

type Universe = string
type Type = string

type SYAUHistoryKey = `${Type}-${Universe}`

interface SYAUHistoryForGame {
    guessed: string[]
}

type SYAUHistory = Record<SYAUHistoryKey, SYAUHistoryForGame>

export function SYAUPanel(props: { typ?: string, universe?: string, counts: CountsByUT, syauData?: SYAUData }): ReactNode {
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
            {props.syauData === undefined ? undefined : <SYAUGame typ={props.typ!} universe={props.universe!} syauData={props.syauData} />}
        </PageTemplate>
    )
}

export class SYAULocalStorage {
    private constructor() {
        // Private constructor
    }

    static shared = new SYAULocalStorage()

    readonly history = new StoredProperty<SYAUHistory>(
        'syau_history',
        storedValue => JSON.parse(storedValue ?? '{}') as SYAUHistory,
        value => JSON.stringify(value),
    )

    useHistory(typ: Type, universe: Universe): [SYAUHistoryForGame, (newHistory: SYAUHistoryForGame) => void] {
        const key = `${typ}-${universe}` satisfies SYAUHistoryKey
        const history = this.history.use()
        const current: SYAUHistoryForGame = history[key] ?? { guessed: [] }
        return [current, (newHistory) => {
            this.history.value = { ...history, [key]: newHistory }
        }]
    }
}

function isApproxMatch(longname: string, query: string): boolean {
    longname = longname.toLowerCase()
    query = query.toLowerCase()
    // split longname by comma and take the first part
    longname = longname.split(',')[0]
    // remove portions in parentheses and brackets
    longname = longname.replace(/\(.*\)/g, '')
    longname = longname.replace(/\[.*\]/g, '')
    // split longname by -
    const longnameParts = longname.split('-').map(s => s.trim())
    // check if query is equal to any part of the longname
    return longnameParts.includes(query)
}

export function SYAUGame(props: { typ: string, universe: string, syauData: SYAUData }): ReactNode {
    const [history, setHistory] = SYAULocalStorage.shared.useHistory(props.typ, props.universe)
    const totalPopulation = props.syauData.populations.reduce((a, b) => a + b, 0)
    const totalPopulationGuessed = history.guessed.map(name => props.syauData.populations[props.syauData.longnameToIndex[name]]).reduce((a, b) => a + b, 0)

    function attemptGuess(query: string): boolean {
        const approxMatches = props.syauData.longnames.filter(longname => isApproxMatch(longname, query)).filter(name => !history.guessed.includes(name))
        if (approxMatches.length === 0) {
            return false
        }
        setHistory({ guessed: [...history.guessed, ...approxMatches] })
        return true
    }

    // text field for guessing, followed by a description of the % of regions guessed and what % of the population that represents
    return (
        <div style={{ margin: 'auto', width: '50%' }}>
            <div>
                <input
                    type="text"
                    placeholder="Type a region name"
                    onChange={(e) => {
                        if (attemptGuess(e.target.value)) {
                            e.target.value = ''
                        }
                    }}
                />
                <button
                    onClick={() => {
                        // check if they are sure
                        if (window.confirm('Are you sure you want to reset your progress?')) {
                            setHistory({ guessed: [] })
                        }
                    }}
                >
                    Reset
                </button>
            </div>
            <div>
                <div>
                    {history.guessed.length}
                    {' '}
                    /
                    {props.syauData.longnames.length}
                    {' '}
                    regions guessed
                </div>
                <div>
                    {Math.round(100 * totalPopulationGuessed / totalPopulation)}
                    % of the population guessed
                </div>
            </div>
        </div>
    )
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
