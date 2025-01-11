import { Selector } from 'testcafe'

import { clickButton, clickButtons } from './quiz_test_utils'
import {
    target, screencap,
    urbanstatsFixture,
    safeReload,
    waitForQuizLoading,
} from './test_utils'

async function isQuestionPage(t: TestController): Promise<boolean> {
    await waitForQuizLoading(t)
    return await Selector('.quiztext').exists
}

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

async function completeCorrectAnswerSequence(t: TestController, alreadyKnownAnswers: string[]): Promise<string[]> {
    await t.eval(() => { localStorage.clear() })
    await safeReload(t)
    await waitForQuizLoading(t)
    await clickButtons(t, alreadyKnownAnswers)
    while (await isQuestionPage(t)) {
        await clickButton(t, 'a')
        await t.wait(500)
    }
    // check that the first n characters match the already known answers
    const text = await correctIncorrect(t)
    for (let i = 0; i < alreadyKnownAnswers.length; i++) {
        if (!text[i]) {
            throw new Error('alreadyKnownAnswers is incorrect')
        }
    }
    const correctAnswers: string[] = [...alreadyKnownAnswers]
    for (let i = alreadyKnownAnswers.length; i < text.length; i++) {
        if (text[i]) {
            correctAnswers.push('a')
        }
        else {
            correctAnswers.push('b')
        }
    }
    // check that the prefixes match

    return correctAnswers
}

urbanstatsFixture('generate link', `${target}/quiz.html#mode=infinite&seed=deadbeef00&v=0`)

let correctAnswerSequence: string[]

test('formulates correct sequence', async (t) => {
    // returns if quiztext exists as a class
    let alreadyKnownAnswers: string[] = []
    while (true) {
        alreadyKnownAnswers = await completeCorrectAnswerSequence(t, alreadyKnownAnswers)
        if (alreadyKnownAnswers.length >= 30) {
            break
        }
    }
    correctAnswerSequence = alreadyKnownAnswers
})

async function provideAnswers(t: TestController, start: number, isCorrect: boolean[]): Promise<void> {
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
    await provideAnswers(t, 0, [false])
    await t.expect(await getLives()).eql(['Y', 'Y', 'N'])
    await provideAnswers(t, 1, [false])
    await t.expect(await getLives()).eql(['Y', 'N', 'N'])
    await provideAnswers(t, 2, [false])
    await t.expect(await correctIncorrect(t)).eql([false, false, false])
})

test('display-life-gained', async (t) => {
    await provideAnswers(t, 0, [true, true, true, true])
    await t.expect(await getLives()).eql(['Y', 'Y', 'Y'])
    await provideAnswers(t, 4, [true])
    await t.expect(await getLives()).eql(['Y', 'Y', 'Y', 'Y'])
})

test('display-life-regained', async (t) => {
    await provideAnswers(t, 0, [false, true, true, true, true])
    await t.expect(await getLives()).eql(['Y', 'Y', 'N'])
    await provideAnswers(t, 5, [true])
    await t.expect(await getLives()).eql(['Y', 'Y', 'Y'])
})

test('19-correct', async (t) => {
    await provideAnswers(t, 0, Array<boolean>(20).fill(true))
    // should have 7 lives
    await t.expect(await getLives()).eql(['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'])
    await provideAnswers(t, 20, Array<boolean>(7).fill(false))
    await t.expect(await correctIncorrect(t)).eql([...Array<boolean>(20).fill(true), ...Array<boolean>(7).fill(false)])
})
