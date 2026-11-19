import Color from 'color'
import React, { ReactNode, useContext, useEffect, useRef } from 'react'

import { Navigator } from '../navigation/Navigator'
import { PageDescriptor } from '../navigation/PageDescriptor'
import { useColors, useJuxtastatColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import '../common.css'
import '../components/quiz.css'
import { useHeaderTextClass } from '../utils/responsive'

import { dayStart, getDailyOffsetNumber, getRetrostatOffsetNumber, retrostatWeekAskingDay } from './dates'
import { getCorrectPattern, QuizModel } from './quiz'

const quizLength = 5
const calendarCellHeight = '2.2em'
const wideCellHeight = '1.8em'
const weekRangeFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
const fullDateFormat = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

export function ArchivePanel({ highlight }: { highlight: string | undefined }): ReactNode {
    const history = QuizModel.shared.history.use()
    const colors = useColors()
    const headerClass = useHeaderTextClass()

    const today = getDailyOffsetNumber()
    const currentWeek = getRetrostatOffsetNumber()
    // Opened without a quiz to return to, show today's
    const highlightKey = highlight ?? today.toString()

    // Sunday-first rows of day numbers, by month
    const months = new Map<string, (number | undefined)[][]>()
    for (let day = 0; day <= today; day++) {
        const date = dayStart(day)
        const label = monthFormat.format(date)
        const rows = months.get(label) ?? []
        months.set(label, rows)
        const firstWeekday = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
        const rowIndex = Math.floor((firstWeekday + date.getDate() - 1) / 7)
        rows[rowIndex] ??= new Array<number | undefined>(7).fill(undefined)
        rows[rowIndex][date.getDay()] = day
    }

    const isUnplayed = (key: string | number): boolean => getCorrectPattern(history, key).length < quizLength
    const unplayed = Array.from({ length: today + 1 }, (_, day) => day).filter(isUnplayed).length
        + Array.from({ length: currentWeek + 1 }, (_, week) => `W${week}`).filter(isUnplayed).length

    return (
        <PageTemplate>
            <div className={headerClass}>Archive</div>
            <div className="centered_text serif">
                {unplayed}
                {' '}
                quizzes left to play. Past quizzes don&apos;t count towards your streak.
            </div>
            <div className="gap_small" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5em', justifyContent: 'center' }}>
                {Array.from(months, ([month, rows]) => (
                    <div key={month} className="serif" style={{ width: 'min(100%, 22em)' }}>
                        <div className="quiz_summary" role="heading" aria-level={2}>{month}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4em', textAlign: 'center', color: colors.textMain }}>
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((name, index) => <div key={index} aria-hidden={true}>{name}</div>)}
                            {rows.flatMap((row, rowIndex) => {
                                // Going by the Saturday shows straddling weeks once
                                const saturday = row[6]
                                const week = saturday === undefined ? -1 : retrostatWeekAskingDay(saturday)
                                return [
                                    ...row.map((day, weekday) => day === undefined
                                        ? <div key={`${rowIndex}-${weekday}`} />
                                        : (
                                                <ArchiveCell
                                                    key={day}
                                                    historyKey={day}
                                                    pattern={getCorrectPattern(history, day)}
                                                    label={dayStart(day).getDate().toString()}
                                                    name={fullDateFormat.format(dayStart(day))}
                                                    wide={false}
                                                    highlighted={highlightKey === day.toString()}
                                                    descriptor={{ kind: 'quiz', mode: undefined, date: day === today ? undefined : day }}
                                                />
                                            )),
                                    ...(saturday !== undefined && week >= 0 && week <= currentWeek
                                        ? [(
                                                <ArchiveCell
                                                    key={`W${week}`}
                                                    historyKey={`W${week}`}
                                                    pattern={getCorrectPattern(history, `W${week}`)}
                                                    label={`Retrostat ${weekRangeFormat.formatRange(dayStart(saturday - 6), dayStart(saturday))}`}
                                                    name={`Retrostat ${fullDateFormat.formatRange(dayStart(saturday - 6), dayStart(saturday))}`}
                                                    wide={true}
                                                    highlighted={highlightKey === `W${week}`}
                                                    descriptor={{ kind: 'quiz', mode: 'retro', date: week === currentWeek ? undefined : week }}
                                                />
                                            )]
                                        : []),
                                ]
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </PageTemplate>
    )
}

function ArchiveCell({ historyKey, pattern, label, name, wide, highlighted, descriptor }: { historyKey: string | number, pattern: boolean[], label: string, name: string, wide: boolean, highlighted: boolean, descriptor: PageDescriptor }): ReactNode {
    const colors = useColors()
    const juxtaColors = useJuxtastatColors()
    const navContext = useContext(Navigator.Context)
    const ref = useRef<HTMLAnchorElement>(null)

    useEffect(() => {
        if (highlighted) {
            const scroll = (): void => { ref.current?.scrollIntoView({ block: 'center', behavior: 'instant' }) }
            scroll()
            ref.current?.focus({ preventScroll: true })
            // Loading fonts reflows the months above
            void document.fonts.ready.then(scroll)
        }
    }, [highlighted])

    const score = pattern.filter(correct => correct).length
    const done = pattern.length >= quizLength
    const backgroundColor = pattern.length === 0 ? colors.hueColors.blue : !done ? colors.hueColors.yellow : score >= 3 ? juxtaColors.correct : juxtaColors.incorrect
    // White matches the site's other buttons, so only switch where it's hard to read. Blue is ~4:1
    // eslint-disable-next-line no-restricted-syntax -- No theme color is black in both themes
    const textColor = Color(backgroundColor).contrast(Color(colors.buttonTextWhite)) >= 4 ? colors.buttonTextWhite : '#000000'
    const status = pattern.length === 0 ? 'not played' : !done ? `${pattern.length} of ${quizLength} answered` : `scored ${score} of ${quizLength}`
    return (
        <a
            ref={ref}
            data-archive-quiz={historyKey}
            aria-label={`${name}, ${status}`}
            aria-current={highlighted ? 'true' : undefined}
            title={done ? `${score}/${quizLength}` : undefined}
            style={{
                gridColumn: wide ? '1 / -1' : undefined,
                height: wide ? wideCellHeight : calendarCellHeight,
                lineHeight: wide ? wideCellHeight : calendarCellHeight,
                fontSize: wide ? '0.8em' : undefined,
                marginBottom: wide ? '0.4em' : undefined,
                borderRadius: '0.6em',
                outline: highlighted ? `0.3em solid ${colors.textMain}` : undefined,
                outlineOffset: '-0.3em',
                textDecoration: 'none',
                color: textColor,
                backgroundColor,
            }}
            {...navContext.link(descriptor, { scroll: { kind: 'position', top: 0 } })}
        >
            {label}
        </a>
    )
}
