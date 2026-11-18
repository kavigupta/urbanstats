import { ClientFunction, Selector } from 'testcafe'

import { runQuery } from './quiz_test_template'
import { clickButton, quizFixture } from './quiz_test_utils'
import { screencap, target } from './test_utils'

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
        const retrostatCells = await t.eval(() => Array.from(document.querySelectorAll('a[data-archive-quiz^="W"]'), cell => cell.getAttribute('data-archive-quiz'))) as string[]
        await t.expect(new Set(retrostatCells).size).eql(retrostatCells.length)
        await t.click(Selector('a').withAttribute('data-archive-quiz', keys[1]))
        await clickButton(t, 'a')
        await t.expect(Selector('#quiz-timer').exists).notOk()
        await t.expect(await runQuery(t, `SELECT user, ${column} FROM ${table} WHERE archive = 1`)).eql(archiveRow)

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
