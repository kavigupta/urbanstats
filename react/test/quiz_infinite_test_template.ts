import { globSync } from 'glob'
import { Selector } from 'testcafe'

import { runQuery } from './quiz_test_template'
import { clickButtons, collectCorrectJuxtaInfiniteAnswersFixture, friendsText, provideAnswers, quizFixture, quizScreencap, withMockedClipboard } from './quiz_test_utils'
import {
    target,
    safeReload,
    waitForQuizLoading,
    getLocation,
    screencap,
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
        // ' ', '\n', etc are ignored
        else if (/\s/.exec(c)) {
            continue
        }
        else {
            throw new Error(`unexpected character ${c} in ${text}`)
        }
    }
    return result
}

const localStorageDefault = { persistent_id: '000000000000007', secure_id: '00000003' }

const version = 1

function regressionTestForVersion(v: number): void {
    const cas = new Map<string, string[]>()
    collectCorrectJuxtaInfiniteAnswersFixture(['hi'], v, cas)

    quizFixture(`version-${v}-test`, `${target}/quiz.html#mode=infinite&seed=hi&v=${v}`, localStorageDefault, '', 'desktop')

    test(`version-${v}-test`, async (t) => {
        const correctPattern = [...Array<boolean>(20).fill(true), ...Array<boolean>(7).fill(false)]
        await provideAnswers(t, 0, correctPattern, 'hi', cas)
        await t.expect(await correctIncorrect(t)).eql(correctPattern)
        await quizScreencap(t)
    })
}

// Other tests should execute ignored versions
export function regressionTestForVersions(versions: number[], ignoredVersions: number[]): void {
    // Get all numbers such that stored_quizzes/quiz_sampling_info/${version}.json exists
    // first list the files
    const files = globSync('../stored_quizzes/quiz_sampling_info/*.json')
    if (files.length === 0) {
        throw new Error('no files found. Check your cwd')
    }
    const vs = files.map(f => parseInt(/(\d+).json$/.exec(f)![0]))
    for (const v of vs) {
        if (!versions.includes(v) && !ignoredVersions.includes(v)) {
            throw new Error(`Version ${v} not in versions or ignoredVersions`)
        }
    }

    for (const v of versions) {
        regressionTestForVersion(v)
    }
}

async function yourBestScores(): Promise<string> {
    // id=your-best-scores
    return await Selector('#your-best-scores').innerText
}

async function clickAmount(t: TestController, amount: string, nth: number): Promise<void> {
    await t.click(Selector('.quiz-audience-statistics-displayed').withText(amount).nth(nth))
}

collectCorrectJuxtaInfiniteAnswersFixture(['deadbeef00', 'deadbeef01', 'deadbeef02', 'deadbeef03', 'deadbeef04', 'deadbeef05', 'deadbeef06'], version)

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

function juxtastatInfiniteTable(t: TestController): Promise<string> {
    return runQuery(t, 'SELECT user, seed, hex(corrects), score, num_answers from JuxtaStatInfiniteStats ORDER BY seed')
}

async function copyLines(t: TestController): Promise<string[]> {
    const copies = await withMockedClipboard(t, async () => {
        await t.click(Selector('button').withExactText('Copy'))
    })
    await t.expect(copies.length).eql(1)
    const copy = copies[0]
    return copy.split('\n')
}

const seedStr = 'deadbeef00'
const param = `#mode=infinite&seed=${seedStr}&v=${version}`

export function quizInfiniteTest0(): void {
    quizFixture(
        'generate link',
        `${target}/quiz.html${param}`,
        localStorageDefault,
        ``,
        'desktop',
    )

    test('display-life-lost', async (t) => {
        await t.expect(await getLives()).eql(['Y', 'Y', 'Y'])
        await provideAnswers(t, 0, [false], seedStr)
        await t.expect(await getLives()).eql(['Y', 'Y', 'N'])
        await provideAnswers(t, 1, [false], seedStr)
        await t.expect(await getLives()).eql(['Y', 'N', 'N'])
        await provideAnswers(t, 2, [false], seedStr)
        await t.expect(await correctIncorrect(t)).eql([false, false, false])
        await t.expect(await juxtastatInfiniteTable(t)).eql(`7|${seedStr}|00|0|3\n`)
    })

    test('display-life-gained', async (t) => {
        await provideAnswers(t, 0, [true, true, true, true], seedStr)
        await t.expect(await getLives()).eql(['Y', 'Y', 'Y'])
        await provideAnswers(t, 4, [true], seedStr)
        await t.expect(await getLives()).eql(['Y', 'Y', 'Y', 'Y'])
        await provideAnswers(t, 5, [false, false, false, false], seedStr)
        await t.expect(await correctIncorrect(t)).eql([true, true, true, true, true, false, false, false, false])
        // low bit order first: 1111,1000 0[000,0000]. This becomes 1F 00
        await t.expect(await juxtastatInfiniteTable(t)).eql(`7|${seedStr}|1F00|5|9\n`)
    })

    test('display-life-regained', async (t) => {
        await provideAnswers(t, 0, [false, true, true, true, true], seedStr)
        await t.expect(await getLives()).eql(['Y', 'Y', 'N'])
        await provideAnswers(t, 5, [true], seedStr)
        await t.expect(await getLives()).eql(['Y', 'Y', 'Y'])
        await provideAnswers(t, 6, [false, false, true, false], seedStr)
        await t.expect(await correctIncorrect(t)).eql([false, true, true, true, true, true, false, false, true, false])
        // low bit order first: 0111,1100 10[00,0000] This becomes 3E 01
        await t.expect(await juxtastatInfiniteTable(t)).eql(`7|${seedStr}|3E01|6|10\n`)
    })
}

export function quizInfiniteTest1(): void {
    quizFixture(
        'generate link',
        `${target}/quiz.html${param}`,
        localStorageDefault,
        ``,
        'desktop',
    )

    async function doNotReportPartial(t: TestController): Promise<void> {
        await provideAnswers(t, 0, [false, true, true, true, true], seedStr)
        await t.navigateTo(`${target}/quiz.html#mode=infinite&seed=deadbeef01&v=${version}`)
        await safeReload(t)
        await provideAnswers(t, 0, [false, false, false], 'deadbeef01')
        await t.expect(await correctIncorrect(t)).eql([false, false, false])
        await t.expect(await juxtastatInfiniteTable(t)).eql(`7|deadbeef01|00|0|3\n`)
    }

    test('do-not-report-partial', async (t) => {
        await doNotReportPartial(t)
    })

    test('come-back-to-partially-completed-quiz', async (t) => {
        await doNotReportPartial(t)
        await t.navigateTo(`${target}/quiz.html#mode=infinite&seed=${seedStr}&v=${version}`)
        await provideAnswers(t, 5, [false, false], seedStr)
        await t.expect(await correctIncorrect(t)).eql([false, true, true, true, true, false, false])
        // low bit order first: 0111,100[0] This becomes 3E 01
        await t.expect(await juxtastatInfiniteTable(t)).eql(`7|deadbeef00|1E|4|7\n7|deadbeef01|00|0|3\n`)
        await t.navigateTo(`${target}/quiz.html#mode=infinite&seed=deadbeef01&v=${version}`)
        await t.expect(await correctIncorrect(t)).eql([false, false, false])
    })

    test('main-quiz-redirect', async (t) => {
        await doNotReportPartial(t)
        await t.navigateTo(`${target}/quiz.html#mode=infinite`)
        // should've redirected to unfinished quiz
        await t.expect(getLocation()).eql(`${target}/quiz.html#mode=infinite&seed=deadbeef00&v=${version}`)
    })

    test('several-different-quizzes', async (t) => {
        // first score is 12
        await provideAnswers(t, 0, '11110' + '11110' + '11110', seedStr)
        await screencap(t)
        await t.expect(await copyLines(t)).eql([
            'Juxtastat Infinite 12/∞',
            '',
            '🟩🟩🟩🟩🟥🟩🟩🟩🟩🟥',
            '🟩🟩🟩🟩🟥',
            '',
            '🥇 Personal Best!',
            '',
            `https://juxtastat.org/${param}`,
        ])
        await t.expect(await friendsText()).eql(['On This SeedOverall Best', 'You1212Copy Link'])
        // second score is 14
        await t.navigateTo(`${target}/quiz.html#mode=infinite&seed=deadbeef01&v=${version}`)
        await provideAnswers(t, 0, '11111' + '10' + '11110' + '111100', 'deadbeef01')
        await screencap(t)
        await t.expect(await copyLines(t)).eql([
            'Juxtastat Infinite 14/∞',
            '',
            '🟩🟩🟩🟩🟩🟩🟥🟩🟩🟩',
            '🟩🟥🟩🟩🟩🟩🟥🟥',
            '',
            '🥇 Personal Best!',
            '',
            `https://juxtastat.org/#mode=infinite&seed=deadbeef01&v=${version}`,
        ])
        await t.expect(await friendsText()).eql(['On This SeedOverall Best', 'You1414Copy Link'])
        // go back to first
        await t.navigateTo(`${target}/quiz.html#mode=infinite&seed=${seedStr}&v=${version}`)
        await t.expect(await copyLines(t)).eql([
            'Juxtastat Infinite 12/∞',
            '',
            '🟩🟩🟩🟩🟥🟩🟩🟩🟩🟥',
            '🟩🟩🟩🟩🟥',
            '',
            '🥈 Personal 2nd Best!',
            '',
            `https://juxtastat.org/${param}`,
        ])
        await t.expect(await yourBestScores()).eql('Your Best Scores\n14\n#1\n12\n#2')
        await t.expect(await friendsText()).eql(['On This SeedOverall Best', 'You1214Copy Link'])
        // go to third, third score is 8
        await t.navigateTo(`${target}/quiz.html#mode=infinite&seed=deadbeef02&v=${version}`)
        await provideAnswers(t, 0, '11110111100', 'deadbeef02')
        await screencap(t)
        await t.expect(await copyLines(t)).eql([
            'Juxtastat Infinite 8/∞',
            '',
            '🟩🟩🟩🟩🟥🟩🟩🟩🟩🟥',
            '🟥',
            '',
            '🥉 Personal 3rd Best!',
            '',
            `https://juxtastat.org/#mode=infinite&seed=deadbeef02&v=${version}`,
        ])
        await t.expect(await yourBestScores()).eql('Your Best Scores\n14\n#1\n12\n#2\n8\n#3')
        await t.expect(await friendsText()).eql(['On This SeedOverall Best', 'You814Copy Link'])
        // click on the link for first
        await clickAmount(t, '12', 0)
        await t.expect(getLocation()).eql(`${target}/quiz.html#mode=infinite&seed=${seedStr}&v=${version}`)
        // fourth score ties with first entered
        await t.navigateTo(`${target}/quiz.html#mode=infinite&seed=deadbeef03&v=${version}`)
        await provideAnswers(t, 0, '11110' + '11110' + '11110', 'deadbeef03')
        await screencap(t)
        await t.expect(await copyLines(t)).eql([
            'Juxtastat Infinite 12/∞',
            '',
            '🟩🟩🟩🟩🟥🟩🟩🟩🟩🟥',
            '🟩🟩🟩🟩🟥',
            '',
            '🥈 Personal 2nd Best!',
            '',
            `https://juxtastat.org/#mode=infinite&seed=deadbeef03&v=${version}`,
        ])
        await t.expect(await friendsText()).eql(['On This SeedOverall Best', 'You1214Copy Link'])
        await t.expect(await yourBestScores()).eql('Your Best Scores\n14\n#1\n12\n#2\n12\n#2\n8\n#3')
        await clickAmount(t, '12', 0)
        await t.expect(getLocation()).eql(`${target}/quiz.html#mode=infinite&seed=deadbeef00&v=${version}`)
        await clickAmount(t, '12', 1)
        await t.expect(getLocation()).eql(`${target}/quiz.html#mode=infinite&seed=deadbeef03&v=${version}`)
        await clickAmount(t, '12', 1)
        await t.expect(getLocation()).eql(`${target}/quiz.html#mode=infinite&seed=deadbeef03&v=${version}`)
        // fifth score is 7
        await t.navigateTo(`${target}/quiz.html#mode=infinite&seed=deadbeef04&v=${version}`)
        await provideAnswers(t, 0, '1111011100', 'deadbeef04')
        await screencap(t)
        await t.expect(await copyLines(t)).eql([
            'Juxtastat Infinite 7/∞',
            '',
            '🟩🟩🟩🟩🟥🟩🟩🟩🟥🟥',
            '',
            `https://juxtastat.org/#mode=infinite&seed=deadbeef04&v=${version}`,
        ])
        await t.expect(await friendsText()).eql(['On This SeedOverall Best', 'You714Copy Link'])
        await t.expect(await yourBestScores()).eql('Your Best Scores\n14\n#1\n12\n#2\n12\n#2\n8\n#3\n7\n#4')
        // sixth score is 6
        await t.navigateTo(`${target}/quiz.html#mode=infinite&seed=deadbeef05&v=${version}`)
        await provideAnswers(t, 0, '111011100', 'deadbeef05')
        await screencap(t)
        await t.expect(await copyLines(t)).eql([
            'Juxtastat Infinite 6/∞',
            '',
            '🟩🟩🟩🟥🟩🟩🟩🟥🟥',
            '',
            `https://juxtastat.org/#mode=infinite&seed=deadbeef05&v=${version}`,
        ])
        await t.expect(await friendsText()).eql(['On This SeedOverall Best', 'You614Copy Link'])
        await t.expect(await yourBestScores()).eql('Your Best Scores\n14\n#1\n12\n#2\n12\n#2\n8\n#3\n6\n#5')
        await clickAmount(t, '12', 0)
        await t.expect(getLocation()).eql(`${target}/quiz.html#mode=infinite&seed=deadbeef00&v=${version}`)
        await t.expect(await yourBestScores()).eql('Your Best Scores\n14\n#1\n12\n#2\n12\n#2\n8\n#3')
    })
}

export function quizInfiniteTest2(): void {
    quizFixture(
        'generate link',
        `${target}/quiz.html${param}`,
        localStorageDefault,
        ``,
        'desktop',
    )

    test('19-correct', async (t) => {
        await provideAnswers(t, 0, Array<boolean>(20).fill(true), seedStr)
        // should have 7 lives
        await t.expect(await getLives()).eql(['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'])
        await provideAnswers(t, 20, Array<boolean>(7).fill(false), seedStr)
        await t.expect(await correctIncorrect(t)).eql([...Array<boolean>(20).fill(true), ...Array<boolean>(7).fill(false)])

        await t.expect(await copyLines(t)).eql([
            'Juxtastat Infinite 20/∞',
            '',
            '🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩',
            '🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩',
            '🟥🟥🟥🟥🟥🟥🟥',
            '',
            '🥇 Personal Best!',
            '',
            `https://juxtastat.org/${param}`,
        ])
        // low bit order first: 1111,1111 1111,1111 1111,0000 000[0,0000] This becomes FF FF 0F 00
        await t.expect(await juxtastatInfiniteTable(t)).eql(`7|${seedStr}|FFFF0F00|20|27\n`)
        await quizScreencap(t)
        await t.click(Selector('[data-test-id=juxtastatCompactEmoji]'))
        await quizScreencap(t)
        await safeReload(t) // Copied! -> Copy Link
        await t.expect(await Selector('#quiz-result-summary-emoji').innerText).eql(
            '🟩2️⃣0️⃣🟥7️⃣',
        )
        await t.expect(await copyLines(t)).eql([
            'Juxtastat Infinite 20/∞',
            '',
            '🟩2️⃣0️⃣🟥7️⃣',
            '',
            '🥇 Personal Best!',
            '',
            `https://juxtastat.org/${param}`,
        ])
    })

    test('18-correct-emoji-compact', async (t) => {
        await provideAnswers(t, 0, Array<boolean>(18).fill(true), seedStr)
        await provideAnswers(t, 18, Array<boolean>(6).fill(false), seedStr)
        await t.click(Selector('[data-test-id=juxtastatCompactEmoji]'))
        await quizScreencap(t)
        await safeReload(t) // Copied! -> Copy Link
        await t.expect(await Selector('#quiz-result-summary-emoji').innerText).eql(
            '🟩1️⃣8️⃣🟥6️⃣',
        )
        await t.expect(await copyLines(t)).eql([
            'Juxtastat Infinite 18/∞',
            '',
            '🟩1️⃣8️⃣🟥6️⃣',
            '',
            '🥇 Personal Best!',
            '',
            `https://juxtastat.org/${param}`,
        ])
        await t.navigateTo(`${target}/quiz.html#date=99`)
        await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
        await t.expect(await Selector('#quiz-result-summary-emoji').innerText).eql(
            '🟩🟩🟩🟩🟥',
        )
        await t.expect(await copyLines(t)).eql([
            'Juxtastat 99 4/5',
            '',
            '🟩🟩🟩🟩🟥',
            '',
            `https://juxtastat.org/#date=99`,
        ])
    })
}
