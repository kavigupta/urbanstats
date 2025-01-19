import { Selector } from 'testcafe'

import { clickButton, withMockedClipboard } from './quiz_test_utils'
import {
    target,
    urbanstatsFixture,
    safeReload,
    waitForQuizLoading,
} from './test_utils'

const seedStr = 'deadbeef00'
const version = 0

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

const correctAnswerSequences = new Map<string, string[]>()

urbanstatsFixture(
    'collect correct answers',
    `${target}/quiz.html`,
)

test('collect correct answers', async (t) => {
    for (const seed of ['deadbeef00']) {
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
        console.log(`correctAnswers: ${correctAnswers}`)
        correctAnswerSequences.set(seed, correctAnswers)
    }
})

const param = `#mode=infinite&seed=${seedStr}&v=${version}`
urbanstatsFixture(
    'generate link',
    `${target}/quiz.html${param}`,
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

test('display-life-lost', async (t) => {
    await t.expect(await getLives()).eql(['Y', 'Y', 'Y'])
    await provideAnswers(t, 0, [false], seedStr)
    await t.expect(await getLives()).eql(['Y', 'Y', 'N'])
    await provideAnswers(t, 1, [false], seedStr)
    await t.expect(await getLives()).eql(['Y', 'N', 'N'])
    await provideAnswers(t, 2, [false], seedStr)
    await t.expect(await correctIncorrect(t)).eql([false, false, false])
})

test('display-life-gained', async (t) => {
    await provideAnswers(t, 0, [true, true, true, true], seedStr)
    await t.expect(await getLives()).eql(['Y', 'Y', 'Y'])
    await provideAnswers(t, 4, [true], seedStr)
    await t.expect(await getLives()).eql(['Y', 'Y', 'Y', 'Y'])
    await provideAnswers(t, 5, [false, false, false, false], seedStr)
    await t.expect(await correctIncorrect(t)).eql([true, true, true, true, true, false, false, false, false])
})

test('display-life-regained', async (t) => {
    await provideAnswers(t, 0, [false, true, true, true, true], seedStr)
    await t.expect(await getLives()).eql(['Y', 'Y', 'N'])
    await provideAnswers(t, 5, [true], seedStr)
    await t.expect(await getLives()).eql(['Y', 'Y', 'Y'])
    await provideAnswers(t, 6, [false, false, true, false], seedStr)
    await t.expect(await correctIncorrect(t)).eql([false, true, true, true, true, true, false, false, true, false])
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
})
