import React, { ReactNode } from 'react'

import '../common.css'

import { CountsByUT } from '../components/countsByArticleType'
import { useColors, useJuxtastatColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import { useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'

import { SelectType, SelectUniverse } from './EditableSelector'
import { SYAULocalStorage } from './SYAULocalStorage'
import { confirmMatch, SYAUData } from './load'
import { SYAUMap } from './syau-map'

export type Universe = string
export type Type = string

export type SYAUHistoryKey = `${Type}-${Universe}`

export interface SYAUHistoryForGame {
    guessed: string[]
}

export type SYAUHistory = Record<SYAUHistoryKey, SYAUHistoryForGame>

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
            {
                props.syauData === undefined
                    ? undefined
                    : (
                            <div>
                                <div style={{ marginBlockEnd: '1em' }} />
                                <SYAUGame typ={props.typ!} universe={props.universe!} syauData={props.syauData} />
                            </div>
                        )
            }
        </PageTemplate>
    )
}

export function SYAUGame(props: { typ: string, universe: string, syauData: SYAUData }): ReactNode {
    const colors = useColors()
    const jColors = useJuxtastatColors()
    const [history, setHistory] = SYAULocalStorage.shared.useHistory(props.typ, props.universe)
    const totalPopulation = props.syauData.populations.reduce((a, b) => a + b, 0)
    const totalPopulationGuessed = history.guessed.map(name => props.syauData.populations[props.syauData.longnameToIndex[name]]).reduce((a, b) => a + b, 0)

    function attemptGuess(query: string): boolean {
        const approxMatches = props.syauData.longnames.filter((_, idx) => confirmMatch(props.syauData.matchChunks[idx], query)).filter(name => !history.guessed.includes(name))
        if (approxMatches.length === 0) {
            return false
        }
        setHistory({ guessed: [...history.guessed, ...approxMatches] })
        return true
    }

    return (
        <div>
            <div style={{ margin: 'auto', width: '50%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <input
                        type="text"
                        style={{ width: '80%' }}
                        placeholder="Type a region name"
                        onChange={(e) => {
                            if (attemptGuess(e.target.value)) {
                                e.target.value = ''
                            }
                        }}
                    />
                    <button
                        style={{ width: '20%' }}
                        onClick={() => {
                            // check if they are sure
                            if (window.confirm('Are you sure you want to reset your progress?')) {
                                setHistory({ guessed: [] })
                            }
                        }}
                    >
                        Reset progress
                    </button>
                </div>
                <div style={{ marginBlockEnd: '1em' }} />
                <div style={{ textAlign: 'center' }}>
                    <b>
                        {history.guessed.length}
                        /
                        {props.syauData.longnames.length}
                    </b>
                    {' '}
                    regions guessed, which is
                    {' '}
                    <b>
                        {Math.round(100 * totalPopulationGuessed / totalPopulation)}
                        %
                    </b>
                    {' '}
                    of the total population.
                </div>
                <div style={{ marginBlockEnd: '1em' }} />
            </div>
            <SYAUMap
                basemap={{ type: 'osm', disableBasemap: true }}
                longnames={props.syauData.longnames}
                population={props.syauData.populations}
                populationOrdinals={props.syauData.populationOrdinals}
                centroids={props.syauData.centroids}
                isGuessed={props.syauData.longnames.map(name => history.guessed.includes(name))}
                guessedColor={jColors.correct}
                notGuessedColor={jColors.incorrect}
                voroniHighlightColor={colors.hueColors.blue}
                height={600}
            />
        </div>
    )
}
