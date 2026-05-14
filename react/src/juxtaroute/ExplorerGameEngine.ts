import { ArticleStatisticRow } from '../components/load-article'
import { StatPath } from '../page_template/statistic-tree'

export type Direction = 'higher' | 'lower'

export interface Card {
    statPath: StatPath
    direction: Direction
    label: string
}

export const GAME_STATS: Record<string, string> = {
    'population': 'Population',
    'gpw_pw_density_1': 'Population Density',
    'median_household_income': 'Median Household Income',
    'white': 'White %',
    'hispanic': 'Hispanic %',
    'black': 'Black %',
    'asian': 'Asian %',
    '2020 Presidential Election-margin': '2020 Election Margin (D-R)',
    'education_ugrad': 'Bachelors Degree %',
}

export function getRandomStat(): { statPath: StatPath, label: string } {
    const keys = Object.keys(GAME_STATS)
    const key = keys[Math.floor(Math.random() * keys.length)]
    return { statPath: key as StatPath, label: GAME_STATS[key] }
}

export function createCard(): Card {
    const { statPath, label } = getRandomStat()
    const direction: Direction = Math.random() < 0.5 ? 'higher' : 'lower'
    return { statPath, direction, label }
}

export function validateMove(
    currentStats: ArticleStatisticRow[],
    nextStats: ArticleStatisticRow[],
    cards: Card[],
): boolean {
    for (const card of cards) {
        const currentVal = currentStats.find(s => s.statpath === card.statPath)?.statval
        const nextVal = nextStats.find(s => s.statpath === card.statPath)?.statval

        if (currentVal === undefined || nextVal === undefined || Number.isNaN(currentVal) || Number.isNaN(nextVal)) {
            // If stat is missing, we consider it a failure or ignore it?
            // For now, let's say it fails to be safe.
            return false
        }

        if (card.direction === 'higher') {
            if (!(nextVal > currentVal)) return false
        }
        else {
            if (!(nextVal < currentVal)) return false
        }
    }
    return true
}

export function getInitialHand(size: number): Card[] {
    const hand: Card[] = []
    for (let i = 0; i < size; i++) {
        hand.push(createCard())
    }
    return hand
}
