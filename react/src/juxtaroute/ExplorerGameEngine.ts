import { ArticleStatisticRow } from '../components/load-article'
import quiz_infinite from '../data/quiz_infinite'
import { StatPath } from '../page_template/statistic-tree'

export type Direction = 'higher' | 'lower'

export interface Card {
    statPath: StatPath
    direction: Direction
    label: string
}

const latestQuiz = quiz_infinite[quiz_infinite.length - 1]

export function getRandomStat(): { statPath: StatPath, label: string } {
    const index = Math.floor(Math.random() * latestQuiz.statPaths.length)
    const statPath = latestQuiz.statPaths[index]
    const rawLabel = latestQuiz.statQuestionNames[index]

    // Clean up the label:
    // "!FULL Which voted more for Biden in the 2020 presidential election?" -> "Voted more for Biden in the 2020 presidential election"
    // "higher % of people who have a graduate degree" -> "% of people who have a graduate degree"
    let label = rawLabel
        .replace(/^!FULL Which /g, '')
        .replace(/\?$/g, '')
        .replace(/^higher /g, '')
        .replace(/^lower /g, '')

    label = label.charAt(0).toUpperCase() + label.slice(1)

    return { statPath: statPath as StatPath, label }
}

export function createCard(): Card {
    const { statPath, label } = getRandomStat()
    const direction: Direction = Math.random() < 0.5 ? 'higher' : 'lower'
    return { statPath, direction, label }
}

export interface ValidationResult {
    isValid: boolean
    reason?: string
}

export function validateMove(
    currentStats: ArticleStatisticRow[],
    nextStats: ArticleStatisticRow[],
    cards: Card[],
): ValidationResult {
    for (const card of cards) {
        const currentVal = currentStats.find(s => s.statpath === card.statPath)?.statval
        const nextVal = nextStats.find(s => s.statpath === card.statPath)?.statval

        if (currentVal === undefined || nextVal === undefined || Number.isNaN(currentVal) || Number.isNaN(nextVal)) {
            return {
                isValid: false,
                reason: `Missing data for "${card.label}".`,
            }
        }

        if (card.direction === 'higher') {
            if (!(nextVal > currentVal)) {
                return {
                    isValid: false,
                    reason: `"${card.label}" is not higher (${nextVal.toLocaleString()} vs ${currentVal.toLocaleString()}).`,
                }
            }
        }
        else {
            if (!(nextVal < currentVal)) {
                return {
                    isValid: false,
                    reason: `"${card.label}" is not lower (${nextVal.toLocaleString()} vs ${currentVal.toLocaleString()}).`,
                }
            }
        }
    }
    return { isValid: true }
}

export function getInitialHand(size: number): Card[] {
    const hand: Card[] = []
    for (let i = 0; i < size; i++) {
        hand.push(createCard())
    }
    return hand
}
