import React, { ReactNode, useContext } from 'react'

import { Navigator } from '../navigation/Navigator'
import { useColors, useJuxtastatColors } from '../page_template/colors'

import { QuizDescriptor, QuizDescriptorWithTime, QuizHistory } from './quiz'
import { getInfiniteQuizzes, parseTimeIdentifier } from './statistics'

export function QuizStatistics(
    props: {
        quiz: QuizDescriptor
        wholeHistory: QuizHistory
    },
): ReactNode | undefined {
    switch (props.quiz.kind) {
        case 'juxtastat':
        case 'retrostat':
            return <QuizStatisticsForTimedStatistics quiz={props.quiz} wholeHistory={props.wholeHistory} />
        case 'infinite':
            return <QuizStatisticsForInfinite quiz={props.quiz} wholeHistory={props.wholeHistory} />
        case 'custom':
            return undefined
    }
}

export function QuizStatisticsForTimedStatistics(
    props: {
        quiz: QuizDescriptorWithTime
        wholeHistory: QuizHistory
    },
): ReactNode {
    const colors = useColors()
    const history = (i: number): QuizHistory[string] | undefined => {
        switch (props.quiz.kind) {
            case 'juxtastat':
                return props.wholeHistory[i]
            case 'retrostat':
                return props.wholeHistory[`W${i}`]
        }
    }

    const today = parseTimeIdentifier(props.quiz.kind, props.quiz.name.toString())
    const historicalCorrect = new Array(today + 1).fill(-1)
    const frequencies = new Array<number>(6).fill(0)
    const playedGames = []
    for (let i = 0; i <= today; i++) {
        const histI = history(i)
        if (histI === undefined) {
            continue
        }
        else {
            const amount = histI.correct_pattern.reduce((partialSum: number, a) => partialSum + (a ? 1 : 0), 0)
            historicalCorrect[i] = amount
            frequencies[amount] += 1
            playedGames.push(amount)
        }
    }
    const maxStreaks = new Array<number>(historicalCorrect.length).fill(0)
    for (let val = 0; val < maxStreaks.length; val++) {
        if (historicalCorrect[val] >= 3) {
            maxStreaks[val] = (val > 0 ? maxStreaks[val - 1] : 0) + 1
        }
    }
    const maxStreak = Math.max(...maxStreaks)
    const currentStreak = maxStreaks[today]
    const totalFreq = frequencies.reduce((partialSum, a) => partialSum + a, 0)
    const statistics = [
        {
            name: 'Played',
            value: playedGames.length.toString(),
        },
        {
            name: 'Mean score',
            value: (
                playedGames.reduce((partialSum, a) => partialSum + a, 0)
                / playedGames.length
            ).toFixed(2),
        },
        {
            name: 'Win Rate (3+)',
            value: `${(
                playedGames.filter(x => x >= 3).length
                / playedGames.length * 100
            ).toFixed(0)}%`,
        },
        {
            name: 'Current Streak (3+)',
            value: currentStreak.toString(),
        },
        {
            name: 'Max Streak (3+)',
            value: maxStreak.toString(),
        },
    ]
    return (
        <div>
            <div className="serif quiz_summary">Your Statistics</div>
            <DisplayedStats statistics={statistics} />
            <div className="gap_small" />
            <table className="quiz_barchart">
                <tbody>
                    {frequencies.map((amt, i) => (
                        <tr key={i}>
                            <td className="quiz_bar_td serif" style={{ color: colors.textMain }}>
                                {i}
                                /5
                            </td>
                            <td className="quiz_bar_td serif">
                                <span className="quiz_bar" style={{ width: `${amt / totalFreq * 20}em`, backgroundColor: colors.hueColors.blue }}>
                                </span>
                                {amt > 0
                                    ? (
                                            <span className="quiz_stat" style={{ color: colors.textMain }}>
                                                {amt}
                                                {' '}
                                                (
                                                {(amt / totalFreq * 100).toFixed(1)}
                                                %)
                                            </span>
                                        )
                                    : undefined}
                            </td>
                        </tr>
                    ),
                    )}
                </tbody>
            </table>
        </div>
    )
}
export function AudienceStatistics({ total, perQuestion }: { total: number, perQuestion: number[] }): ReactNode {
    const juxtaColors = useJuxtastatColors()
    // two flexboxes of the scores for each
    return (
        <div id="quiz-audience-statistics">
            <div className="serif quiz_summary">Question Difficulty</div>
            <DisplayedStats statistics={perQuestion.map((x, i) => {
                return {
                    name: `Q${i + 1} Correct`,
                    value: `${(x / total * 100).toFixed(0)}%`,
                    addtl_class: 'quiz-audience-statistics-displayed',
                    color: x / total > 0.5 ? juxtaColors.correct : juxtaColors.incorrect,
                }
            },
            )}
            />
        </div>
    )
}
export function DisplayedStats({ statistics }: {
    statistics: {
        value: string
        name: string
        additionalClass?: string
        color?: string
        onClick?: () => void
    }[]
}): ReactNode {
    return (
        <div
            className="serif"
            style={{
                textAlign: 'center', width: '100%', margin: 'auto', fontSize: '1.5em',
                display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            }}
        >
            {statistics.map((stat, i) => (
                <DisplayedStat
                    key={i}
                    number={stat.value}
                    name={stat.name}
                    additionalClass={stat.additionalClass}
                    color={stat.color}
                    onClick={stat.onClick}
                />
            ),
            )}
        </div>
    )
}
export function DisplayedStat({ number, name, additionalClass, color, onClick }: {
    number: string
    name: string
    additionalClass?: string
    color?: string
    onClick?: () => void
}): ReactNode {
    // large font for numbers, small for names. Center-aligned using flexbox
    return (
        <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.3em' }}
            onClick={onClick}
        >
            <div className={`serif ${additionalClass ?? ''}`} style={{ fontSize: '1.5em', color }}>{number}</div>
            <div className="serif" style={{ fontSize: '0.5em' }}>{name}</div>
        </div>
    )
}

function computeOrdinalsAndIndices(numCorrects: number[], keepNumber: number, saveIndex: number): [number[], number[]] {
    /**
     * Given an array of numbers, returns two arrays:
     * 1. An array of ordinals, where the ith element is the rank of the ith element in the input array
     *      Note that for duplicates, the ordinal is duplicated, and that the ordinals are 1-indexed
     * 2. An array of indices, where the ith element is the index of the ith element in the input array
     */
    const sortedIndicesAll = Array.from(Array(numCorrects.length).keys())
    sortedIndicesAll.sort((a, b) => numCorrects[b] - numCorrects[a])
    let currentOrdinal = 1
    let currentVal = numCorrects[sortedIndicesAll[0]]
    const ordinals = sortedIndicesAll.map((index) => {
        if (numCorrects[index] !== currentVal) {
            currentVal = numCorrects[index]
            currentOrdinal += 1
        }
        return currentOrdinal
    })
    const mask = ordinals.map((x, i) => x <= keepNumber || sortedIndicesAll[i] === saveIndex)

    const sortedIndicesFilt = sortedIndicesAll.filter((_, i) => mask[i])
    const ordinalsFilt = ordinals.filter((_, i) => mask[i])

    return [ordinalsFilt, sortedIndicesFilt]
}

interface InfiniteDisplay {
    ordinals: number[]
    sortedIndices: number[]
    seedVersions: [string, number][]
    numCorrects: number[]
}

function juxtastatInfiniteDisplay(quiz: QuizDescriptor & { kind: 'infinite' }, wholeHistory: QuizHistory): InfiniteDisplay {
    const [seedVersions, keys] = getInfiniteQuizzes(wholeHistory, true)
    const numCorrects = keys.map(
        key => wholeHistory[key].correct_pattern.reduce((partialSum: number, a) => partialSum + (a ? 1 : 0), 0),
    )
    const thisIndex = seedVersions.findIndex(([seed, version]) => seed === quiz.seed && version === quiz.version)

    const [ordinals, sortedIndices] = computeOrdinalsAndIndices(numCorrects, 3, thisIndex)

    return { ordinals, sortedIndices, seedVersions, numCorrects }
}

export type Medal = 1 | 2 | 3

export function ordinalThis(quiz: QuizDescriptor & { kind: 'infinite' }, wholeHistory: QuizHistory): Medal | undefined {
    const { ordinals, sortedIndices, seedVersions } = juxtastatInfiniteDisplay(quiz, wholeHistory)
    const thisIndex = seedVersions.findIndex(([seed, version]) => seed === quiz.seed && version === quiz.version)
    const thisOrdinal = ordinals[sortedIndices.indexOf(thisIndex)]
    switch (thisOrdinal) {
        case 1:
        case 2:
        case 3:
            return thisOrdinal
        default:
            return undefined
    }
}

export function QuizStatisticsForInfinite(
    props: {
        quiz: QuizDescriptor & { kind: 'infinite' }
        wholeHistory: QuizHistory
    },
): ReactNode | undefined {
    const colors = useColors()
    const navContext = useContext(Navigator.Context)

    const { ordinals, sortedIndices, seedVersions, numCorrects } = juxtastatInfiniteDisplay(props.quiz, props.wholeHistory)

    return (
        <div>
            <div className="serif quiz_summary">Your Best Scores</div>
            {/* <table className="quiz_barchart">
                <tbody>
                    {
                        sortedSeedVersions.map(([seed, version], i) => (
                            <tr key={i}>
                                <td className="quiz_bar_td serif" style={{ color: colors.textMain }}>
                                    {sortedNumCorrects[i]}
                                </td>
                                <td className="quiz_bar_td serif">
                                    <span
                                        className="quiz_bar"
                                        style={{
                                            width: `${sortedNumCorrects[i] / sortedNumCorrects[0] * 20}em`,
                                            backgroundColor: seed === props.quiz.seed ? colors.hueColors.green : colors.hueColors.blue,
                                        }}
                                        onClick={() => {
                                            void navContext.navigate({
                                                kind: 'quiz',
                                                mode: 'infinite',
                                                seed,
                                                v: version,
                                            },
                                            { history: 'push', scroll: { kind: 'none' } })
                                        }}
                                    />
                                </td>
                            </tr>
                        ))
                    }
                </tbody>
            </table> */}
            <DisplayedStats statistics={sortedIndices.map((idx, i) => {
                return {
                    name: `#${ordinals[i]}`,
                    value: numCorrects[idx].toString(),
                    additionalClass: 'quiz-audience-statistics-displayed',
                    color: seedVersions[idx][0] === props.quiz.seed ? colors.hueColors.green : colors.hueColors.blue,
                    onClick: () => {
                        void navContext.navigate({
                            kind: 'quiz',
                            mode: 'infinite',
                            seed: seedVersions[idx][0],
                            v: seedVersions[idx][1],
                        },
                        { history: 'push', scroll: { kind: 'none' } })
                    },
                }
            },
            )}
            />
        </div>

    )
}
