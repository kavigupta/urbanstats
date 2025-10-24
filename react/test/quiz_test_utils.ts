import { exec } from 'child_process'
import { writeFileSync } from 'fs'
import { promisify } from 'util'

import { execa, execaSync } from 'execa'
import { ClientFunction, Selector } from 'testcafe'

import { safeClearLocalStorage, safeReload, screencap, target, urbanstatsFixture, waitForQuizLoading } from './test_utils'

export async function quizScreencap(t: TestController): Promise<void> {
    await t.eval(() => {
        const elem = document.getElementById('quiz-timer')
        if (elem) {
            elem.remove()
        }
    })
    await screencap(t)
}

export async function clickButtons(t: TestController, whichs: string[]): Promise<void> {
    for (const which of whichs) {
        await clickButton(t, which)
        await t.wait(500)
    }
    await t.wait(2000)
}
// click the kth button with id quiz-answer-button-$which

export async function clickButton(t: TestController, which: string): Promise<TestControllerPromise> {
    await waitForQuizLoading(t)
    return t.click(Selector('div').withAttribute('id', `quiz-answer-button-${which}`))
}

async function runForTest(): Promise<void> {
    if (!(await isServerAvailable())) {
        console.warn('No quiz server found. Starting new quiz server...')
        void execa('bash', ['../urbanstats-persistent-data/run_for_test.sh'], { stdio: 'inherit', cleanup: true })
        process.on('exit', () => {
            execaSync('pkill', ['-f', 'urbanstats-persistent-data'])
        })
        await waitForServerToBeAvailable()
        console.warn('Quiz server started.')
    }
    else {
        console.warn('Quiz server found. Using existing quiz server.')
    }
}

async function isServerAvailable(): Promise<boolean> {
    try {
        await fetch('http://localhost:54579')
        return true
    }
    catch {
        return false
    }
}
async function waitForServerToBeAvailable(): Promise<void> {
    while (!(await isServerAvailable())) {
        await new Promise(resolve => setTimeout(resolve, 100))
    }
}

export function quizFixture(
    fixName: string,
    url: string,
    newLocalstorage: Record<string, string>,
    sqlStatements: string,
    platform: 'desktop' | 'mobile',
    beforeEach?: (t: TestController) => Promise<void>,
    afterEach?: (t: TestController) => Promise<void>,
): void {
    urbanstatsFixture(fixName, url, async (t) => {
        const tempfile = `${tempfileName()}.sql`
        // Delete the database and recreate it with the given SQL statements
        writeFileSync(tempfile, sqlStatements)
        await promisify(exec)(`cd ../urbanstats-persistent-data; rm db.sqlite3; cat ${tempfile} | sqlite3 db.sqlite3; cd -`)
        await runForTest()
        await safeClearLocalStorage(t)
        await t.eval(() => {
            for (const k of Object.keys(newLocalstorage)) {
                localStorage.setItem(k, newLocalstorage[k])
            }
        }, { dependencies: { newLocalstorage } })
        await t.eval(() => {
            localStorage.setItem('testHostname', 'testproxy.nonexistent')
        })
        // Must reload after setting localstorage so page picks it up
        await safeReload(t)
        switch (platform) {
            case 'mobile':
                await t.resizeWindow(400, 800)
                break
            case 'desktop':
                await t.resizeWindow(1400, 800)
                break
        }
        await beforeEach?.(t)
    }, { afterEach })
}

export function tempfileName(): string {
    return `/tmp/quiz_test_${Math.floor(Math.random() * 1000000)}`
}

export async function withMockedClipboard(t: TestController, runner: () => Promise<void>): Promise<string[]> {
    await t.eval(() => {
        const mock: ((text: string) => Promise<void>) & { calls: string[] } = function (text: string) {
            mock.calls.push(text)
            return Promise.resolve()
        }
        mock.calls = []
        navigator.clipboard.writeText = mock
    })
    await runner()
    const calls = await t.eval(() => (navigator.clipboard.writeText as unknown as { calls: string[] }).calls) as string[]
    return calls
}

export const friendsText = ClientFunction<string[], []>(() => {
    const elements = document.getElementsByClassName('testing-friends-section')
    const results: string[] = []
    // eslint-disable-next-line @typescript-eslint/prefer-for-of -- No need to convert to array
    for (let i = 0; i < elements.length; i++) {
        results.push(elements[i].textContent!)
    }
    return results
})

const correctAnswerSequences = new Map<string, string[]>()

async function collectCorrectJuxtaInfiniteAnswers(t: TestController, seeds: string[], version: number, cas: Map<string, string[]>): Promise<void> {
    for (const seed of seeds) {
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
        cas.set(seed, correctAnswers)
    }
}

export function collectCorrectJuxtaInfiniteAnswersFixture(seeds: string[], version: number, cas: Map<string, string[]> | undefined = undefined): void {
    quizFixture(
        'collect correct answers',
        `${target}/quiz.html`,
        {},
        ``,
        'desktop',
    )

    test('collect correct answers', async (t) => {
        await collectCorrectJuxtaInfiniteAnswers(t, seeds, version, cas ?? correctAnswerSequences)
    })
}

export async function provideAnswers(t: TestController, start: number, isCorrect: boolean[] | string, seed: string, cas: Map<string, string[]> | undefined = undefined): Promise<void> {
    // check if isCorrect is a string, then interpret as 0s and 1s
    if (typeof isCorrect === 'string') {
        isCorrect = isCorrect.split('').map(c => c === '1')
    }
    const correctAnswerSequence = (cas ?? correctAnswerSequences).get(seed)!
    for (let i = start; i < start + isCorrect.length; i++) {
        await clickButton(t, isCorrect[i - start] === (correctAnswerSequence[i] === 'a') ? 'a' : 'b')
        await t.wait(500)
    }
}
