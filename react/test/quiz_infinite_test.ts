import { Selector } from 'testcafe'

import { runQuery } from './quiz_test_template'
import { clickButton, quizFixture, withMockedClipboard } from './quiz_test_utils'
import {
    target,
    safeReload,
    waitForQuizLoading,
} from './test_utils'

async function correctIncorrect(t: TestController): Promise<boolean[]> {
    await waitForQuizLoading(t)
    const text = await Selector('#quiz-result-summary-emoji').innerText
    const result: boolean[] = []
    for (const c of text) {
        if (c === '🟩') {
            result.push(true)
        }
        else if (c === '🟥') {
            result.push(false)
        }
        else {
            throw new Error(`unexpected character ${c} in ${text}`)
        }
    }
    return result
}

const localStorageDefault = { persistent_id: '000000000000007', secure_id: '00000003' }

const correctAnswerSequences = new Map<string, string[]>()

quizFixture(
    'collect correct answers',
    `${target}/quiz.html`,
    localStorageDefault,
    ``,
    'desktop',
)

test('collect correct answers', async (t) => {
    for (const seed of ['deadbeef00', 'deadbeef01', 'deadbeef02', 'deadbeef03', 'deadbeef04']) {
        // set localStorage such that I_{seedStr}_{version} has had 30 questions answered
        await t.eval(() => {
            localStorage.quiz_history = JSON.stringify({
                [`I_${seed}_${version}`]: {
                    // false so the quiz ends
                    correct_pattern: Array(30).fill(false),
                    choices: Array(30).fill('a'),
                },
            })
        }, { dependencies: { seed, version } })
        await t.navigateTo(`${target}/quiz.html#mode=infinite&seed=${seed}&v=${version}`)
        await safeReload(t)
        await waitForQuizLoading(t)
        // Get all quiz_result_symbol elements and the text therein
        const symbols = Selector('.quiz_result_comparison_symbol')
        const symbolsCount = await symbols.count
        const correctAnswers: string[] = []
        for (let i = 0; i < symbolsCount; i++) {
            const symbol = symbols.nth(i)
            const text = await symbol.innerText
            if (text === '>') {
                correctAnswers.push('a')
            }
            else if (text === '<') {
                correctAnswers.push('b')
            }
            else {
                throw new Error(`unexpected text ${text} in ${await symbol.textContent}`)
            }
        }
        correctAnswerSequences.set(seed, correctAnswers)
    }
})

const seedStr = 'deadbeef00'

const version = 1

const seedNumeric = 0xdeadbeef00
const param = `#mode=infinite&seed=${seedStr}&v=${version}`
quizFixture(
    'generate link',
    `${target}/quiz.html${param}`,
    localStorageDefault,
    ``,
    'desktop',
)

async function provideAnswers(t: TestController, start: number, isCorrect: boolean[], seed: string): Promise<void> {
    const correctAnswerSequence = correctAnswerSequences.get(seed)!
    for (let i = start; i < start + isCorrect.length; i++) {
        await clickButton(t, isCorrect[i - start] === (correctAnswerSequence[i] === 'a') ? 'a' : 'b')
        await t.wait(500)
    }
}

type Emoji = 'Y' | 'N'

async function getLives(): Promise<Emoji[]> {
    const images = Selector('.testing-life-display').child()
    const result: Emoji[] = []
    for (let i = 0; i < await images.count; i++) {
        const classNames = (await images.nth(i).getAttribute('class'))!.split(' ')
        const classNamesSpecific: Emoji[] = []
        for (const className of classNames) {
            if (className === 'testing-life-emoji') {
                classNamesSpecific.push('Y')
            }
            else if (className === 'testing-life-emoji-lost') {
                classNamesSpecific.push('N')
            }
        }
        if (classNamesSpecific.length !== 1) {
            throw new Error(`unexpected class names ${classNamesSpecific} in ${classNames}`)
        }
        result.push(classNamesSpecific[0])
    }
    return result
}

function juxtastatInfiniteTable(): Promise<string> {
    return runQuery('SELECT user, seed, hex(corrects), score, num_answers from JuxtaStatInfiniteStats ORDER BY seed')
}

test('display-life-lost', async (t) => {
    await t.expect(await getLives()).eql(['Y', 'Y', 'Y'])
    await provideAnswers(t, 0, [false], seedStr)
    await t.expect(await getLives()).eql(['Y', 'Y', 'N'])
    await provideAnswers(t, 1, [false], seedStr)
    await t.expect(await getLives()).eql(['Y', 'N', 'N'])
    await provideAnswers(t, 2, [false], seedStr)
    await t.expect(await correctIncorrect(t)).eql([false, false, false])
    await t.expect(await juxtastatInfiniteTable()).eql(`7|${seedNumeric}|00|0|3\n`)
})

test('display-life-gained', async (t) => {
    await provideAnswers(t, 0, [true, true, true, true], seedStr)
    await t.expect(await getLives()).eql(['Y', 'Y', 'Y'])
    await provideAnswers(t, 4, [true], seedStr)
    await t.expect(await getLives()).eql(['Y', 'Y', 'Y', 'Y'])
    await provideAnswers(t, 5, [false, false, false, false], seedStr)
    await t.expect(await correctIncorrect(t)).eql([true, true, true, true, true, false, false, false, false])
    // low bit order first: 1111,1000 0[000,0000]. This becomes 1F 00
    await t.expect(await juxtastatInfiniteTable()).eql(`7|${seedNumeric}|1F00|5|9\n`)
})

test('display-life-regained', async (t) => {
    await provideAnswers(t, 0, [false, true, true, true, true], seedStr)
    await t.expect(await getLives()).eql(['Y', 'Y', 'N'])
    await provideAnswers(t, 5, [true], seedStr)
    await t.expect(await getLives()).eql(['Y', 'Y', 'Y'])
    await provideAnswers(t, 6, [false, false, true, false], seedStr)
    await t.expect(await correctIncorrect(t)).eql([false, true, true, true, true, true, false, false, true, false])
    // low bit order first: 0111,1100 10[00,0000] This becomes 3E 01
    await t.expect(await juxtastatInfiniteTable()).eql(`7|${seedNumeric}|3E01|6|10\n`)
})

test('19-correct', async (t) => {
    await provideAnswers(t, 0, Array<boolean>(20).fill(true), seedStr)
    // should have 7 lives
    await t.expect(await getLives()).eql(['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'])
    await provideAnswers(t, 20, Array<boolean>(7).fill(false), seedStr)
    await t.expect(await correctIncorrect(t)).eql([...Array<boolean>(20).fill(true), ...Array<boolean>(7).fill(false)])

    const copies = await withMockedClipboard(t, async () => {
        await t.click(Selector('button').withText('Copy'))
    })
    await t.expect(copies.length).eql(1)
    const copy = copies[0]
    const lines = copy.split('\n')
    await t.expect(lines).eql([
        'Juxtastat Infinite 20/∞',
        '',
        '🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟥🟥🟥🟥🟥🟥🟥',
        '',
        `https://juxtastat.org/${param}`,
    ])
    // low bit order first: 1111,1111 1111,1111 1111,0000 000[0,0000] This becomes FF FF 0F 00
    await t.expect(await juxtastatInfiniteTable()).eql(`7|${seedNumeric}|FFFF0F00|20|27\n`)
})

async function doNotReportPartial(t: TestController): Promise<void> {
    await provideAnswers(t, 0, [false, true, true, true, true], seedStr)
    await t.navigateTo(`${target}/quiz.html#mode=infinite&seed=deadbeef01&v=${version}`)
    await safeReload(t)
    await provideAnswers(t, 0, [false, false, false], 'deadbeef01')
    await t.expect(await correctIncorrect(t)).eql([false, false, false])
    await t.expect(await juxtastatInfiniteTable()).eql(`7|${seedNumeric + 1}|00|0|3\n`)
}

test('do-not-report-partial', async (t) => {
    await doNotReportPartial(t)
})

test('come-back-to-partially-completed-quiz', async (t) => {
    await doNotReportPartial(t)
    await t.navigateTo(`${target}/quiz.html#mode=infinite&seed=${seedStr}&v=${version}`)
    // await safeReload(t)
    await provideAnswers(t, 5, [false, false], seedStr)
    await t.expect(await correctIncorrect(t)).eql([false, true, true, true, true, false, false])
    // low bit order first: 0111,100[0] This becomes 3E 01
    await t.expect(await juxtastatInfiniteTable()).eql(`7|${seedNumeric}|1E|4|7\n7|${seedNumeric + 1}|00|0|3\n`)
    await t.navigateTo(`${target}/quiz.html#mode=infinite&seed=deadbeef01&v=${version}`)
    // await safeReload(t)
    await t.expect(await correctIncorrect(t)).eql([false, false, false])
})
