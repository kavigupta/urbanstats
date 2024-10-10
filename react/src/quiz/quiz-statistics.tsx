import React, { ReactNode } from 'react'

import { useColors } from '../page_template/settings'

import { QuizDescriptor } from './quiz'
import { History, parse_time_identifier } from './statistics'

interface QuizStatisticsProps {
    quiz: QuizDescriptor
    whole_history: History
}

export function QuizStatistics(props: QuizStatisticsProps): ReactNode {
    const colors = useColors()
    const history = (i: number): History[string] | undefined => {
        switch (props.quiz.kind) {
            case 'juxtastat':
                return props.whole_history[i]
            case 'retrostat':
                return props.whole_history[`W${i}`]
        }
    }

    const today = parse_time_identifier(props.quiz.kind, props.quiz.name.toString())
    const historical_correct = new Array(today + 1).fill(-1)
    const frequencies = new Array<number>(6).fill(0)
    const played_games = []
    for (let i = 0; i <= today; i++) {
        const hist_i = history(i)
        if (hist_i === undefined) {
            continue
        }
        else {
            const amount = hist_i.correct_pattern.reduce((partialSum, a) => partialSum + (a ? 1 : 0), 0)
            historical_correct[i] = amount
            frequencies[amount] += 1
            played_games.push(amount)
        }
    }
    const max_streaks = new Array<number>(historical_correct.length).fill(0)
    for (let val = 0; val < max_streaks.length; val++) {
        if (historical_correct[val] >= 3) {
            max_streaks[val] = (val > 0 ? max_streaks[val - 1] : 0) + 1
        }
    }
    const max_streak = Math.max(...max_streaks)
    const current_streak = max_streaks[today]
    const total_freq = frequencies.reduce((partialSum, a) => partialSum + a, 0)
    const statistics = [
        {
            name: 'Played',
            value: played_games.length.toString(),
        },
        {
            name: 'Mean score',
            value: (
                played_games.reduce((partialSum, a) => partialSum + a, 0)
                / played_games.length
            ).toFixed(2),
        },
        {
            name: 'Win Rate (3+)',
            value: `${(
                played_games.filter(x => x >= 3).length
                / played_games.length * 100
            ).toFixed(0)}%`,
        },
        {
            name: 'Current Streak (3+)',
            value: current_streak.toString(),
        },
        {
            name: 'Max Streak (3+)',
            value: max_streak.toString(),
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
                            <td className="quiz_bar_td serif">
                                {i}
                                /5
                            </td>
                            <td className="quiz_bar_td serif">
                                <span className="quiz_bar" style={{ width: `${amt / total_freq * 20}em`, backgroundColor: colors.hueColors.blue }}>
                                </span>
                                {amt > 0
                                    ? (
                                            <span className="quiz_stat">
                                                {amt}
                                                {' '}
                                                (
                                                {(amt / total_freq * 100).toFixed(1)}
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
export function AudienceStatistics({ total, per_question }: { total: number, per_question: number[] }): ReactNode {
    // two flexboxes of the scores for each
    return (
        <div id="quiz-audience-statistics">
            <div className="serif quiz_summary">Question Difficulty</div>
            <DisplayedStats statistics={per_question.map((x, i) => {
                return {
                    name: `Q${i + 1} Correct`,
                    value: `${(x / total * 100).toFixed(0)}%`,
                    addtl_class: `${x / total > 0.5 ? 'text_quiz_correct' : 'text_quiz_incorrect'} quiz-audience-statistics-displayed`,
                }
            },
            )}
            />
        </div>
    )
}
export function DisplayedStats({ statistics }: { statistics: { value: string, name: string, addtl_class?: string }[] }): ReactNode {
    return (
        <div
            className="serif"
            style={{
                textAlign: 'center', width: '100%', margin: 'auto', fontSize: '1.5em',
                display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            }}
        >
            {statistics.map((stat, i) => <DisplayedStat key={i} number={stat.value} name={stat.name} addtl_class={stat.addtl_class} />,
            )}
        </div>
    )
}
export function DisplayedStat({ number, name, addtl_class }: { number: string, name: string, addtl_class?: string }): ReactNode {
    // large font for numbers, small for names. Center-aligned using flexbox
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.3em' }}>
            <div className={`serif ${addtl_class ?? ''}`} style={{ fontSize: '1.5em' }}>{number}</div>
            <div className="serif" style={{ fontSize: '0.5em' }}>{name}</div>
        </div>
    )
}
