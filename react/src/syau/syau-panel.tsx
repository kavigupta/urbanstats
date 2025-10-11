import React, { ReactNode, useContext } from 'react'

import '../common.css'

import { buttonStyle, GenericShareButton } from '../components/GenericShareButton'
import { CountsByUT } from '../components/countsByArticleType'
import { CheckboxSetting } from '../components/sidebar'
import { Navigator } from '../navigation/Navigator'
import { useColors, useJuxtastatColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { PageTemplate } from '../page_template/template'
import { Universe } from '../universe'
import { useHeaderTextClass, useMobileLayout, useSubHeaderTextClass } from '../utils/responsive'
import { pluralize } from '../utils/text'

import { SelectType, SelectUniverse } from './EditableSelector'
import { SYAULocalStorage } from './SYAULocalStorage'
import { confirmMatch, SYAUData } from './load'
import { SYAUMap } from './syau-map'

export type Type = string

export type SYAUHistoryKey = `${Type}-${Universe}`

export interface SYAUHistoryForGame {
    guessed: string[]
}

export type SYAUHistory = Record<SYAUHistoryKey, SYAUHistoryForGame>

export function SYAUPanel(props: { typ?: string, universe?: Universe, counts: CountsByUT, syauData?: SYAUData }): ReactNode {
    const headerClass = useHeaderTextClass()
    const subHeaderClass = useSubHeaderTextClass()
    return (
        <PageTemplate>
            <div className={headerClass}>So you&apos;re an urbanist?</div>
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

function GuessInputField(props: { guessCallback: (query: string) => boolean }): ReactNode {
    const [syauRequireEnter] = useSetting('syauRequireEnter')
    return (
        <input
            type="text"
            id="syau-input"
            placeholder="Type a region name"
            style={{ width: '86%' }}
            onChange={(e) => {
                if (syauRequireEnter) {
                    return
                }
                if (props.guessCallback(e.target.value)) {
                    e.target.value = ''
                }
            }}
            onKeyDown={(e) => {
                if (syauRequireEnter && e.key === 'Enter') {
                    props.guessCallback(e.currentTarget.value)
                    e.currentTarget.value = ''
                }
            }}
        />
    )
}

export function SYAUGame(props: { typ: string, universe: Universe, syauData: SYAUData }): ReactNode {
    const colors = useColors()
    const jColors = useJuxtastatColors()
    const [history, setHistory] = SYAULocalStorage.shared.useHistory(props.typ, props.universe)
    const totalPopulation = props.syauData.populations.reduce((a, b) => a + b, 0)
    const totalPopulationGuessed = history.guessed.map(name => props.syauData.populations[props.syauData.longnameToIndex[name]]).reduce((a, b) => a + b, 0)
    const [alreadyGuessed, setAlreadyGuessed] = React.useState(false)

    const shareRef = React.createRef<HTMLButtonElement>()

    const pluralType = pluralize(props.typ)

    function attemptGuess(query: string): boolean {
        const approxMatches = props.syauData.longnames.filter((_, idx) => confirmMatch(props.syauData.matchChunks[idx], query))
        const unguessedApproxMatches = approxMatches.filter(name => !history.guessed.includes(name))
        setAlreadyGuessed(approxMatches.length !== 0 && unguessedApproxMatches.length === 0)
        if (unguessedApproxMatches.length === 0) {
            return false
        }
        setHistory({ guessed: [...history.guessed, ...unguessedApproxMatches] })
        return true
    }

    const isGuessed = props.syauData.longnames.map(name => history.guessed.includes(name))
    const indicatorColor = alreadyGuessed ? jColors.correct : colors.background

    return (
        <div>
            <div style={{ margin: 'auto', width: '50%' }}>
                <div style={{ display: 'flex', justifyContent: 'center', margin: 'auto' }}>
                    <div style={{ width: '7%', height: '1.5em' }} />
                    <GuessInputField guessCallback={attemptGuess} />
                    <div style={{ width: '2%', height: '1.5em' }} />
                    <div style={{ width: '5%', height: '1.5em', backgroundColor: indicatorColor }} />
                </div>
                <div style={{ marginBlockEnd: '1em' }} />
                <div style={{ textAlign: 'center' }} id="test-syau-status">
                    <b>
                        {history.guessed.length}
                        /
                        {props.syauData.longnames.length}
                    </b>
                    {' '}
                    {pluralType}
                    {' '}
                    named, which is
                    {' '}
                    <b>
                        {renderPct(totalPopulationGuessed / totalPopulation)}
                    </b>
                    {' '}
                    of the total population.
                </div>
                <div style={{ marginBlockEnd: '1em' }} />
            </div>
            <SYAUMap
                // basemap={{ type: 'osm', noLabels: true }}
                longnames={props.syauData.longnames}
                population={props.syauData.populations}
                populationOrdinals={props.syauData.populationOrdinals}
                centroids={props.syauData.centroids}
                isGuessed={isGuessed}
                guessedColor={jColors.correct}
                notGuessedColor={jColors.incorrect}
                voroniHighlightColor={colors.hueColors.blue}
            />
            <div style={{ marginBlockEnd: '1em' }} />
            <div style={{ display: 'flex', justifyContent: 'center', margin: 'auto' }}>
                <div style={{ display: 'inline-block' }}>
                    <GenericShareButton
                        buttonRef={shareRef}
                        produceSummary={
                            () => {
                                const frac = totalPopulationGuessed / totalPopulation
                                const numGreen = Math.floor(10 * frac)
                                const numRed = 10 - numGreen
                                const emoji = jColors.correctEmoji.repeat(numGreen) + jColors.incorrectEmoji.repeat(numRed)
                                const lines = [
                                    `I named ${history.guessed.length}/${props.syauData.longnames.length} ${pluralType} in ${props.universe}`,
                                    `(${renderPct(frac)} of the population)`,
                                    '',
                                    emoji,
                                    '',
                                ]
                                // eslint-disable-next-line no-restricted-syntax -- Sharing
                                const hash = window.location.hash
                                const url = `https://soyoureanurbanist.org${hash === '' ? '' : `/${hash}`}`
                                return Promise.resolve([lines.join('\n'), url])
                            }
                        }
                    />
                </div>
                <div style={{ display: 'inline-block', marginInlineStart: '1em' }} />
                <div style={{ display: 'inline-block' }}>
                    <button
                        style={buttonStyle(colors.hueColors.red, colors.buttonTextWhite)}
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
            </div>
            <div style={{ marginBlockEnd: '1em' }} />
            <div style={{ display: 'flex', justifyContent: 'center', margin: 'auto' }}>
                <CheckboxSetting
                    name="Require pressing enter to formalize a guess"
                    settingKey="syauRequireEnter"
                    testId="syauRequireEnter"
                />
            </div>
            <div style={{ marginBlockEnd: '1em' }} />
            <SYAUTable
                longnames={props.syauData.longnames}
                populationOrdinals={props.syauData.populationOrdinals}
                isGuessed={isGuessed}
            />
        </div>
    )
}

function renderPct(frac: number): string {
    const pct = 100 * frac
    if (pct === 100) {
        return '100%'
    }
    if (pct > 99.9) {
        return `${pct.toFixed(3)}%`
    }
    if (pct > 99) {
        return `${pct.toFixed(2)}%`
    }
    if (pct > 90) {
        return `${pct.toFixed(1)}%`
    }
    return `${pct.toFixed(0)}%`
}

function SYAUTable(props: { longnames: string[], populationOrdinals: number[], isGuessed: boolean[] }): ReactNode {
    const colors = useColors()
    const jColors = useJuxtastatColors()
    const isMobile = useMobileLayout()
    const navContext = useContext(Navigator.Context)

    const columns = isMobile ? 3 : 5
    // const rows = Math.ceil(props.longnames.length / columns)

    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '1em' }}>
            {props.longnames.map((name, idx) => {
                const ordinal = props.populationOrdinals[idx]
                const guessed = props.isGuessed[idx]
                const color = guessed ? colors.buttonTextWhite : colors.textMain

                const linkProps = guessed
                    ? navContext.link({
                        kind: 'article',
                        longname: name,
                    }, { scroll: { kind: 'position', top: 0 } })
                    : {}

                return (
                    <a
                        key={name}
                        className={guessed ? 'testing-syau-named' : 'testing-syau-not-named'}
                        style={{
                            backgroundColor: guessed ? jColors.correct : colors.background,
                            padding: '1em',
                            borderRadius: '5px',
                            boxShadow: guessed ? `0 0 10px ${jColors.correct}` : `0 0 10px ${colors.background}`,
                            borderColor: colors.textMain,
                            borderWidth: '0.2em',
                            borderStyle: 'solid',
                            color,
                            textDecoration: 'none',
                        }}
                        {
                            ...linkProps
                        }
                    >
                        <div style={{ color, fontWeight: 600 }}>
                            {ordinal}
                            .
                            {' '}
                            {guessed ? name.split(',')[0] : ''}
                        </div>
                    </a>
                )
            },
            )}
        </div>
    )
}
