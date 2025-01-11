import { Selector } from 'testcafe'

import { clickButton, clickButtons } from './quiz_test_utils'
import {
    target, screencap,
    urbanstatsFixture,
    safeReload,
    waitForLoading,
} from './test_utils'

async function isQuestionPage(t: TestController): Promise<boolean> {
    await waitForLoading(t)
    return await Selector('.quiztext').exists
}

async function correctIncorrect(t: TestController): Promise<boolean[]> {
    await waitForLoading(t)
    await screencap(t)
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
    await waitForLoading(t)
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
    for (let i = start; i < isCorrect.length; i++) {
        await clickButton(t, isCorrect[i - start] === (correctAnswerSequence[i] === 'a') ? 'a' : 'b')
    }
}

test('display-life-lost', async (t) => {
    await provideAnswers(t, 0, [false])
    await screencap(t)
    await provideAnswers(t, 1, [false])
    await screencap(t)
})

test('display-life-gained', async (t) => {
    await provideAnswers(t, 0, [true, true, true, true])
    await screencap(t)
    await provideAnswers(t, 4, [true])
    await screencap(t)
})

test('display-life-regained', async (t) => {
    await provideAnswers(t, 0, [false, true, true, true, true])
    await screencap(t)
    await provideAnswers(t, 5, [true])
    await screencap(t)
})

test('19-correct', async (t) => {
    await provideAnswers(t, 0, Array<boolean>(20).fill(true))
    // should have 7 lives
    await screencap(t)
    await provideAnswers(t, 20, Array<boolean>(7).fill(false))
    // done
    await screencap(t)
})
