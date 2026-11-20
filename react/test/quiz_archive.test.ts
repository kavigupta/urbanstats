import { ClientFunction, Selector } from 'testcafe'

import { colorThemes } from '../src/page_template/color-themes'

import { runQuery } from './quiz_test_template'
import { clickButton, quizFixture } from './quiz_test_utils'
import { safeReload, screencap, target } from './test_utils'

const win = { choices: ['A', 'A', 'A', 'A', 'A'], correct_pattern: [true, true, true, true, true] }
const fourWins = { choices: ['A', 'A', 'A', 'A'], correct_pattern: [true, true, true, true] }

function archiveTest(name: string, keys: [string, string, string], liveUrl: string, table: string, column: string, archiveRow: string): void {
    quizFixture(`${name} archive`, `${target}/quiz.html#mode=archive`, {
        persistent_id: '000000000000007',
        secure_id: '00000003',
        testQuizArchive: 'true',
        quiz_history: JSON.stringify({ [keys[0]]: win, [keys[1]]: fourWins, [keys[2]]: win }),
    }, '', 'desktop')

    test(`${name}-archive-play-is-reported-and-breaks-streak`, async (t) => {
        const todayCellIsVisible = ClientFunction(() => {
            const rect = Array.from(document.querySelectorAll('a[data-archive-quiz]:not([data-archive-quiz^="W"])')).at(-1)?.getBoundingClientRect()
            return rect !== undefined && rect.top >= 0 && rect.bottom <= window.innerHeight
        })
        await t.expect(todayCellIsVisible()).ok()
        const retrostatCells = await t.eval(() => Array.from(document.querySelectorAll('a[data-archive-quiz^="W"]'), cell => cell.getAttribute('data-archive-quiz'))) as string[]
        await t.expect(new Set(retrostatCells).size).eql(retrostatCells.length)
        const yellow = colorThemes['Light Mode'].hueColors.yellow
        await t.expect(Selector('a').withAttribute('data-archive-quiz', keys[1]).getStyleProperty('background-color'))
            .eql(`rgb(${[1, 3, 5].map(index => parseInt(yellow.slice(index, index + 2), 16)).join(', ')})`)
        await t.expect(Selector('a').withAttribute('data-archive-quiz', keys[1]).getAttribute('aria-label')).match(/, 4 of 5 answered$/)
        await t.click(Selector('a').withAttribute('data-archive-quiz', keys[1]))
        await clickButton(t, 'a')
        await t.expect(Selector('#quiz-timer').exists).notOk()
        await t.expect(await runQuery(t, `SELECT user, ${column} FROM ${table} WHERE archive = 1`)).eql(archiveRow)
        await t.expect(Selector('a').withExactText(`Play Current ${name === 'juxtastat' ? 'Juxtastat' : 'Retrostat'}`).exists).ok()

        const hashFor = (key: string): string => `#${key.startsWith('W') ? 'mode=retro&' : ''}date=${key.replaceAll('W', '')}`
        await t.click(Selector('a').withExactText('Next Quiz'))
        await t.expect(ClientFunction(() => location.hash)()).eql(hashFor(keys[2]))
        await t.click(Selector('a').withExactText('Previous Quiz'))
        await t.expect(ClientFunction(() => location.hash)()).eql(hashFor(keys[1]))

        await t.click(Selector('a').withExactText('Archive'))
        await t.expect(ClientFunction(() => location.hash)()).eql(`#mode=archive&date=${keys[1]}`)
        const playedCellIsVisible = ClientFunction((key: string) => {
            const rect = document.querySelector(`a[data-archive-quiz="${key}"]`)?.getBoundingClientRect()
            return rect !== undefined && rect.top >= 0 && rect.bottom <= window.innerHeight
        })
        await t.expect(playedCellIsVisible(keys[1])).ok()
        await t.expect(ClientFunction(() => document.activeElement?.getAttribute('data-archive-quiz'))()).eql(keys[1])
        // Just the played quiz's month, since the whole archive grows every day
        await screencap(t, { selector: Selector('a').withAttribute('data-archive-quiz', keys[1]).parent().parent() })

        await t.eval(() => { localStorage.removeItem('testQuizArchive') })
        await t.navigateTo(`${target}/${liveUrl}`)
        await t.expect(Selector('div').withExactText('Played').prevSibling().innerText).eql('3')
        await t.expect(Selector('div').withExactText('Current Streak (3+)').prevSibling().innerText).eql('1')
    })
}

archiveTest('juxtastat', ['98', '99', '100'], 'quiz.html#date=100', 'JuxtaStatIndividualStats', 'day', '7|99\n')
archiveTest('retrostat', ['W37', 'W38', 'W39'], 'quiz.html#mode=retro&date=39', 'JuxtaStatIndividualStatsRetrostat', 'week', '7|38\n')

// getDailyOffsetNumber and getRetrostatOffsetNumber, which can't be imported here since their module touches window.
// Computed just before navigating so a test running across midnight can't disagree with the page about which day is live
const today = (): number => Math.round((new Date().setHours(0, 0, 0, 0) - new Date(2023, 8, 2).valueOf()) / (24 * 60 * 60 * 1000))
const thisWeek = (): number => Math.floor((today() - 1) / 7) - 11

function nextToLiveTest(name: string, live: () => number, historyKey: (offset: number) => string, modeParam: string): void {
    quizFixture(`${name} next to live`, `${target}/quiz.html#mode=archive`, { testQuizArchive: 'true' }, '', 'desktop')

    test(`${name}-next-from-latest-past-quiz-opens-the-live-one`, async (t) => {
        const current = live()
        const history = JSON.stringify({ [historyKey(current - 1)]: win, [historyKey(current)]: win })
        await t.eval(() => { localStorage.setItem('quiz_history', history) }, { dependencies: { history } })
        await t.navigateTo(`${target}/quiz.html#${modeParam === '' ? '' : `${modeParam}&`}date=${current - 1}`)
        // Load the history set above, since the page holds it in memory
        await safeReload(t)

        await t.click(Selector('a').withExactText('Next Quiz'))
        await t.expect(ClientFunction(() => location.hash)()).eql(`#${modeParam === '' ? '' : `${modeParam}&`}date=${current}`)
        await t.expect(Selector('#quiz-timer').exists).ok()
        await t.expect(Selector('a').withExactText('Next Quiz').exists).notOk()
        await t.expect(Selector('a').withExactText('Previous Quiz').exists).ok()
    })
}

nextToLiveTest('juxtastat', today, offset => offset.toString(), '')
nextToLiveTest('retrostat', thisWeek, offset => `W${offset}`, 'mode=retro')
