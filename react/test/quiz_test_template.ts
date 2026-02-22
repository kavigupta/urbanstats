import { exec } from 'child_process'
import { writeFileSync, readFileSync } from 'fs'
import { promisify } from 'util'
import { gzipSync } from 'zlib'

import { ClientFunction, Selector } from 'testcafe'

import { clickButton, clickButtons, quizFixture, quizScreencap, tempfileName, withMockedClipboard } from './quiz_test_utils'
import { target, safeReload, screencap, safeClearLocalStorage, waitForDownload } from './test_utils'

export async function runQuery(t: TestController, query: string): Promise<string> {
    // dump given query to a string
    const commandLine = `sqlite3 ../urbanstats-persistent-data/db.sqlite3 "${query}"`
    await t.wait(500)
    const result = await promisify(exec)(commandLine)
    return result.stdout
}

function juxtastatTable(t: TestController): Promise<string> {
    return runQuery(t, 'SELECT user, day, corrects from JuxtaStatIndividualStats')
}

function retrostatTable(t: TestController): Promise<string> {
    return runQuery(t, 'SELECT user, week, corrects from JuxtaStatIndividualStatsRetrostat')
}

function secureIdTable(t: TestController): Promise<string> {
    return runQuery(t, 'SELECT user, secure_id from JuxtaStatUserSecureID')
}

// eslint-disable-next-line no-restricted-syntax -- Persisted data
type QuizHistory = Record<string | number, { choices: ('A' | 'B')[], correct_pattern: [boolean, boolean, boolean, boolean, boolean] }>

export function exampleQuizHistory(minQuiz: number, maxQuiz: number, minRetro?: number, maxRetro?: number): QuizHistory {
    const quizHistory: QuizHistory = {}
    for (let i = minQuiz; i <= maxQuiz; i++) {
        quizHistory[i] = {
            choices: ['A', 'A', 'A', 'A', 'A'],
            correct_pattern: [true, true, true, i % 3 === 1, i % 4 === 1],
        }
    }
    if (minQuiz <= 62 && maxQuiz >= 62) {
        quizHistory[62] = {
            choices: ['A', 'A', 'A', 'A', 'A'],
            correct_pattern: [false, false, false, false, false],
        }
    }
    if (minRetro && maxRetro) {
        for (let i = minRetro; i <= maxRetro; i++) {
            quizHistory[`W${i}`] = {
                choices: ['A', 'A', 'A', 'A', 'A'],
                correct_pattern: [true, true, true, i % 3 === 1, i % 4 === 1],
            }
        }
    }
    return quizHistory
}

async function checkText(t: TestController, words: string, emoji: string): Promise<void> {
    const text = await Selector('#quiz-result-summary-words').innerText
    await t.expect(text).eql(words)
    const emojiText = await Selector('#quiz-result-summary-emoji').innerText
    await t.expect(emojiText).eql(emoji)
}

export function quizTest({ platform }: { platform: 'desktop' | 'mobile' }): void {
    quizFixture(
        'quiz clickthrough test on empty background',
        `${target}/quiz.html#date=99`,
        { persistent_id: '000000000000007' },
        '',
        platform,
    )

    test('quiz-clickthrough-test', async (t) => {
        await clickButton(t, 'a')
        await t.wait(2000)
        await quizScreencap(t)
        await clickButton(t, 'b')
        await t.wait(2000)
        await quizScreencap(t)
        await clickButton(t, 'a')
        await t.wait(2000)
        await quizScreencap(t)
        await clickButton(t, 'b')
        await t.wait(2000)
        await quizScreencap(t)
        await clickButton(t, 'a')
        await t.wait(2000)
        await t.eval(() => { document.getElementById('quiz-timer')!.remove() })
        await t.wait(3000)
        await quizScreencap(t)
        const quizHistory: unknown = await t.eval(() => {
            return JSON.stringify(JSON.parse(localStorage.getItem('quiz_history')!))
        })
        await t.expect(quizHistory).eql('{"99":{"choices":["A","B","A","B","A"],"correct_pattern":[true,false,true,false,false]}}')
        await t.expect(await juxtastatTable(t)).eql('7|99|5\n')
    })

    quizFixture(
        'report old quiz results too',
        `${target}/quiz.html#date=99`,
        { persistent_id: '000000000000007', secure_id: '00000003', quiz_history: JSON.stringify(exampleQuizHistory(87, 90)) },
        '',
        platform,
    )

    test('quiz-report-old-results', async (t) => {
        await safeReload(t)
        await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
        const quizHistory: unknown = await t.eval(() => {
            return JSON.parse(localStorage.getItem('quiz_history')!) as unknown
        })
        const expectedQuizHistory = exampleQuizHistory(87, 90)
        expectedQuizHistory[99] = {
            choices: ['A', 'A', 'A', 'A', 'A'],
            correct_pattern: [true, true, true, true, false],
        }
        await t.expect(quizHistory).eql(expectedQuizHistory)
        await t.expect(await juxtastatTable(t)).eql('7|87|7\n7|88|15\n7|89|23\n7|90|7\n7|99|15\n')
        // check that the user was registered
        await t.expect(await secureIdTable(t)).eql('7|3\n')
    })

    test('loading indicator', async (t) => {
        // Loading indicator appears when shape load fails or is delayed
        const cdp = await t.getCurrentCDPSession()

        await cdp.Network.enable({})
        await cdp.Network.setBlockedURLs({
            urls: ['*shape*shard_31478'],
        })

        await clickButtons(t, ['a'])
        await t.expect(Selector('[data-test-id=longLoad]').exists).ok()

        await screencap(t, { wait: false })
    })

    quizFixture(
        'trust on first use',
        `${target}/quiz.html#date=99`,
        { persistent_id: '000000000000007', secure_id: '00000003', quiz_history: JSON.stringify(exampleQuizHistory(87, 90)) },
        `
    CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStats
        (user integer, day integer, corrects integer, time integer, PRIMARY KEY (user, day));
    INSERT INTO JuxtaStatIndividualStats VALUES (7, 30, 0, 0);
    `,
        platform,
    )

    test('quiz-trust-on-first-use', async (t) => {
        await safeReload(t)
        await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
        await t.expect(await juxtastatTable(t)).eql('7|30|0\n7|87|7\n7|88|15\n7|89|23\n7|90|7\n7|99|15\n')
        await t.expect(await secureIdTable(t)).eql('7|3\n')
    })

    quizFixture(
        'auth failure',
        `${target}/quiz.html#date=99`,
        { persistent_id: '000000000000007', secure_id: '00000003', quiz_history: JSON.stringify(exampleQuizHistory(87, 90)) },
        `
    CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStats
        (user integer, day integer, corrects integer, time integer, PRIMARY KEY (user, day));
    INSERT INTO JuxtaStatIndividualStats VALUES (7, 30, 0, 0);
    CREATE TABLE IF NOT EXISTS JuxtaStatUserSecureID (user integer PRIMARY KEY, secure_id int);
    INSERT INTO JuxtaStatUserSecureID VALUES (7, 4);
    `,
        platform,
    )

    test('quiz-auth-failure', async (t) => {
        await safeReload(t)
        await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
        // authentication failure, so no change to the database
        await t.expect(await juxtastatTable(t)).eql('7|30|0\n')
        await t.expect(await secureIdTable(t)).eql('7|4\n')
        await quizScreencap(t)
    })

    quizFixture(
        'do not report stale quiz results',
        `${target}/quiz.html#date=99`,
        { persistent_id: '000000000000007', quiz_history: JSON.stringify(exampleQuizHistory(87, 92)) },
        `
    CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStats
        (user integer, day integer, corrects integer, time integer, PRIMARY KEY (user, day));
    INSERT INTO JuxtaStatIndividualStats VALUES (7, 87, 0, 0);
    INSERT INTO JuxtaStatIndividualStats VALUES (7, 88, 0, 0);
    INSERT INTO JuxtaStatIndividualStats VALUES (7, 89, 0, 0);
    INSERT INTO JuxtaStatIndividualStats VALUES (7, 90, 0, 0);
    `,
        platform,
    )

    test('quiz-do-not-report-stale-results', async (t) => {
        await safeReload(t)
        await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
        const quizHistory: unknown = await t.eval(() => {
            return JSON.parse(localStorage.getItem('quiz_history')!) as unknown
        })
        const expectedQuizHistory = exampleQuizHistory(87, 92)
        expectedQuizHistory[99] = {
            choices: ['A', 'A', 'A', 'A', 'A'],
            correct_pattern: [true, true, true, true, false],
        }
        await t.expect(quizHistory).eql(expectedQuizHistory)
        await t.expect(await juxtastatTable(t)).eql('7|87|0\n7|88|0\n7|89|0\n7|90|0\n7|91|15\n7|92|7\n7|99|15\n')
    })

    quizFixture(
        'percentage correct test',
        `${target}/quiz.html#date=99`,
        { persistent_id: '000000000000007' },
        `
    CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStats
        (user integer, day integer, corrects integer, time integer, PRIMARY KEY (user, day));
    CREATE TABLE IF NOT EXISTS JuxtaStatUserDomain (user integer PRIMARY KEY, domain text);

    INSERT INTO JuxtastatUserDomain VALUES (7, 'testproxy.nonexistent');
    INSERT INTO JuxtastatUserDomain VALUES (8, 'testproxy.nonexistent');
    
    ${Array.from(Array(30).keys()).map(
        i => `INSERT INTO JuxtaStatIndividualStats VALUES(${i + 30}, 99, 101, 0); INSERT INTO JuxtaStatUserDomain VALUES(${i + 30}, 'testproxy.nonexistent');`,
    ).join('\n')}`,
        platform,
    )

    test('quiz-percentage-correct', async (t) => {
        await safeReload(t)
        await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
        await quizScreencap(t)
        await t.expect(await juxtastatTable(t)).eql(
            `${Array.from(Array(30).keys()).map(i => `${i + 30}|99|101`).join('\n')}\n` + `7|99|15\n`,
        )
        // assert no element with id quiz-audience-statistics
        await t.expect(Selector('#quiz-audience-statistics').exists).notOk()
        // now become user 8
        await safeClearLocalStorage(t)
        await t.eval(() => {
            localStorage.setItem('persistent_id', '000000000000008')
            localStorage.setItem('testHostname', 'testproxy.nonexistent')
        })
        await safeReload(t)
        await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
        await quizScreencap(t)
        await t.expect(await juxtastatTable(t)).eql(
            `${Array.from(Array(30).keys()).map(i => `${i + 30}|99|101`).join('\n')}\n` + `7|99|15\n` + `8|99|15\n`,
        )
        // assert element with id quiz-audience-statistics exists
        await t.expect(Selector('#quiz-audience-statistics').exists).ok()
        const stats = await Selector('#quiz-audience-statistics').innerText
        await t.expect(stats).eql('Question Difficulty\n100%\nQ1 Correct\n3%\nQ2 Correct\n100%\nQ3 Correct\n3%\nQ4 Correct\n0%\nQ5 Correct')
    })

    quizFixture(
        'new user',
        `${target}/quiz.html#date=99`,
        {},
        '',
        platform,
    )

    function hexToDec(hex: string): string {
        // https://stackoverflow.com/a/53751162/1549476
        if (hex.length % 2) { hex = `0${hex}` }

        const bn = BigInt(`0x${hex}`)

        const d = bn.toString(10)
        return d
    }

    test('quiz-new-user', async (t) => {
        await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
        const result = await t.eval(() => {
            return [localStorage.getItem('persistent_id'), localStorage.getItem('secure_id')] as [string, string]
        }) as [string, string] | null
        await t.expect(result).notEql(null)
        const [userId, secureId] = result!
        const userIdInt = hexToDec(userId)
        const secureIdInt = hexToDec(secureId)
        const juxtaTable = await juxtastatTable(t)
        await t.expect(juxtaTable).eql(`${userIdInt}|99|15\n`)
        await t.expect(await runQuery(t, 'SELECT user from JuxtastatUserDomain')).eql(`${userIdInt}\n`)
        const secureTable = await secureIdTable(t)
        await t.expect(secureTable).eql(`${userIdInt}|${secureIdInt}\n`)
    })

    quizFixture(
        'retrostat',
        `${target}/quiz.html#date=99`,
        { persistent_id: '000000000000007', quiz_history: JSON.stringify(exampleQuizHistory(87, 93, 27, 33)) },
        `
    CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStats
        (user integer, day integer, corrects integer, time integer, PRIMARY KEY (user, day));
    
    CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStatsRetrostat
        (user integer, week integer, corrects integer, time integer, PRIMARY KEY (user, week));

    INSERT INTO JuxtaStatIndividualStats VALUES (7, 90, 0, 0);
    INSERT INTO JuxtaStatIndividualStatsRetrostat VALUES (7, 30, 0, 0);
    `,
        platform,
    )

    test('quiz-retrostat-regular-quiz-reporting', async (t) => {
        await safeReload(t)
        await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
        const quizHistory: unknown = await t.eval(() => {
            return JSON.parse(localStorage.getItem('quiz_history')!) as unknown
        })
        const expectedQuizHistory = exampleQuizHistory(87, 93, 27, 33)
        expectedQuizHistory[99] = {
            choices: ['A', 'A', 'A', 'A', 'A'],
            correct_pattern: [true, true, true, true, false],
        }
        await t.expect(quizHistory).eql(expectedQuizHistory)
        await t.expect(await juxtastatTable(t)).eql('7|90|0\n7|91|15\n7|92|7\n7|93|23\n7|99|15\n')
        await t.expect(await retrostatTable(t)).eql('7|30|0\n')
    })

    test('quiz-retrostat-retrostat-reporting', async (t) => {
        const url = `${target}/quiz.html#mode=retro&date=38`
        await t.navigateTo(url)
        await safeReload(t)
        await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
        const quizHistory: unknown = await t.eval(() => {
            return JSON.parse(localStorage.getItem('quiz_history')!) as unknown
        })
        const expectedQuizHistory = exampleQuizHistory(87, 93, 27, 33)
        expectedQuizHistory.W38 = {
            choices: ['A', 'A', 'A', 'A', 'A'],
            correct_pattern: [false, false, true, false, true],
        }
        await t.expect(quizHistory).eql(expectedQuizHistory)
        await t.expect(await juxtastatTable(t)).eql('7|90|0\n')
        await t.expect(await retrostatTable(t)).eql('7|30|0\n7|31|15\n7|32|7\n7|33|23\n7|38|20\n')
    })

    quizFixture(
        'quiz result test',
        `${target}/quiz.html#date=100`,
        { quiz_history: JSON.stringify(exampleQuizHistory(2, 100)) },
        '',
        platform,
    )

    test('quiz-results-test', async (t) => {
        await safeReload(t)
        await quizScreencap(t)
        await checkText(t, 'Excellent! 😊 4/5', '🟩🟩🟩🟩🟥')
    })

    test('share button copy', async (t) => {
        const copies = await withMockedClipboard(t, async () => {
            await t.click(Selector('button').withExactText('Copy'))
        })
        await t.expect(copies).eql(['Juxtastat 100 4/5\n\n🟩🟩🟩🟩🟥\n\nhttps://juxtastat.org/#date=100'])
    })

    quizFixture('several quiz results', `${target}/quiz.html#date=90`,
        {
            quiz_history: JSON.stringify({
                90: {
                    choices: ['A', 'A', 'A', 'A', 'A'],
                    correct_pattern: [true, true, true, true, false],
                },
                91: {
                    choices: ['A', 'A', 'A', 'A', 'A'],
                    correct_pattern: [true, false, true, false, true],
                },
                92: {
                    choices: ['A', 'A', 'A', 'A', 'A'],
                    correct_pattern: [true, true, true, true, true],
                },
                93: {
                    choices: ['A', 'A', 'A', 'A', 'A'],
                    correct_pattern: [false, false, false, false, false],
                },
                94: {
                    choices: ['A', 'A', 'A', 'A', 'A'],
                    correct_pattern: [false, false, false, true, true],
                },
                95: {
                    choices: ['A', 'A', 'A', 'A', 'A'],
                    correct_pattern: [true, true, true, true, false],
                },
            }),
        },
        '',
        platform,
    )

    test('several-quiz-results-test', async (t) => {
        await safeReload(t)
        await quizScreencap(t)
        // true true true true false
        await checkText(t, 'Excellent! 😊 4/5', '🟩🟩🟩🟩🟥')
        // go to the next quiz via changing the href
        await t.navigateTo('/quiz.html#date=91')
        await checkText(t, 'Good! 🙃 3/5', '🟩🟥🟩🟥🟩')
        await t.navigateTo('/quiz.html#date=92')
        await checkText(t, 'Perfect! 🔥 5/5', '🟩🟩🟩🟩🟩')
        await t.navigateTo('/quiz.html#date=93')
        await checkText(t, 'Impressively Bad Job! 🤷 0/5', '🟥🟥🟥🟥🟥')
        await t.navigateTo('/quiz.html#date=94')
        await checkText(t, 'Better luck next time! 🫤 2/5', '🟥🟥🟥🟩🟩')
        await t.navigateTo('/quiz.html#date=95')
        await checkText(t, 'Excellent! 😊 4/5', '🟩🟩🟩🟩🟥')
    })
}

export function quizTestImportExport({ platform }: { platform: 'desktop' | 'mobile' }): void {
    quizFixture('export quiz progress', `${target}/quiz.html#date=90`,
        {
            quiz_history: JSON.stringify({
                90: {
                    choices: ['A', 'A', 'A', 'A', 'A'],
                    correct_pattern: [true, true, true, true, false],
                },
                W38: {
                    choices: ['A', 'A', 'A', 'A', 'A'],
                    correct_pattern: [true, false, true, false, true],
                },
            }),
            persistent_id: 'b0bacafe',
            secure_id: 'baddecaf',
            quiz_friends: JSON.stringify([
                ['name', 'id'],
                [null, 'id2', 1234],
            ]),
        },
        '',
        platform,
    )

    const expectedExportWithoutDate = {
        persistent_id: 'b0bacafe',
        secure_id: 'baddecaf',
        quiz_history: {
            90: {
                choices: [
                    'A',
                    'A',
                    'A',
                    'A',
                    'A',
                ],
                correct_pattern: [
                    true,
                    true,
                    true,
                    true,
                    false,
                ],
            },
            W38: {
                choices: [
                    'A',
                    'A',
                    'A',
                    'A',
                    'A',
                ],
                correct_pattern: [
                    true,
                    false,
                    true,
                    false,
                    true,
                ],
            },
        },
        quiz_friends: [
            ['name', 'id'],
            [null, 'id2', 1234],
        ],
    }

    test('export quiz progress', async (t) => {
        const laterThan = new Date().getTime()
        await t.click(Selector('button').withExactText('Export Quiz History'))

        const { date_exported, ...downloadContents } = JSON.parse(readFileSync(await waitForDownload(t, laterThan, '.json')).toString()) as Record<string, unknown>

        await t.expect(typeof date_exported === 'string').ok()

        await t.expect(JSON.stringify(downloadContents, null, 2)).eql(JSON.stringify(expectedExportWithoutDate, null, 2))
    })

    quizFixture('import quiz progress', `${target}/quiz.html#date=90`,
        {
            quiz_history: JSON.stringify({
                91: {
                    choices: ['A', 'A', 'A', 'A', 'A'],
                    correct_pattern: [true, true, true, true, true],
                },
                W39: {
                    choices: ['A', 'A', 'A', 'A', 'A'],
                    correct_pattern: [false, false, false, false, false],
                },
                W40: {
                    choices: ['A', 'A', 'A', 'A', 'A'],
                    correct_pattern: [true, false, false, false, false],
                },
            }),
            persistent_id: 'deadbeef',
            secure_id: 'decea5ed',
            quiz_friends: '[]',
        },
        '',
        platform,
    )

    test('import quiz progress', async (t) => {
        // Write the file to upload
        const tempfile = `${tempfileName()}.json`
        writeFileSync(tempfile, JSON.stringify(expectedExportWithoutDate, null, 2))

        await t.setNativeDialogHandler(() => 'merge')
        await t.click(Selector('button').withExactText('Import Quiz History'))
        await t.setFilesToUpload('input[type=file]', [tempfile])
        await checkText(t, 'Excellent! 😊 4/5', '🟩🟩🟩🟩🟥')

        await t.navigateTo('/quiz.html#mode=retro&date=38')
        // Should transfer over retro results
        await checkText(t, 'Good! 🙃 3/5', '🟩🟥🟩🟥🟩')

        // Should transfer over the user id
        await t.expect(Selector('.juxtastat-user-id').withExactText('b0bacafe').exists).ok()

        // Should transfer over secure id
        await t.expect(await t.eval(() => localStorage.getItem('secure_id'))).eql('baddecaf')

        // Quiz 91 should still be there
        await t.navigateTo('/quiz.html#date=91')
        await checkText(t, 'Perfect! 🔥 5/5', '🟩🟩🟩🟩🟩')

        // Retro 39 should still be there
        await t.navigateTo('/quiz.html#mode=retro&date=39')
        await checkText(t, 'Impressively Bad Job! 🤷 0/5', '🟥🟥🟥🟥🟥')
    })

    test('import quiz progress conflict', async (t) => {
        await t.navigateTo(`/quiz.html#date=91`)
        await checkText(t, 'Perfect! 🔥 5/5', '🟩🟩🟩🟩🟩')

        // Write the file to upload
        const tempfile = `${tempfileName()}.json`
        writeFileSync(tempfile, JSON.stringify({
            ...expectedExportWithoutDate,
            quiz_history: {
                90: expectedExportWithoutDate.quiz_history[90],
                91: {
                    choices: [
                        'A',
                        'A',
                        'A',
                        'A',
                        'A',
                    ],
                    correct_pattern: [
                        true,
                        true,
                        true,
                        true,
                        false,
                    ],
                },
                W39: {
                    choices: [
                        'A',
                        'A',
                        'A',
                        'A',
                        'A',
                    ],
                    correct_pattern: [
                        true,
                        false,
                        true,
                        false,
                        true,
                    ],
                },
            },
        }, null, 2))

        await t.setNativeDialogHandler(() => true)
        await t.click(Selector('button').withExactText('Import Quiz History'))
        await t.setFilesToUpload('input[type=file]', [tempfile])
        await t.expect(await t.getNativeDialogHistory()).eql([
            {
                text: 'The following quiz results exist both locally and in the uploaded file, and are different:\n'
                + '\n'
                + '• Juxtastat 91\n'
                + '• Retrostat W39\n'
                + '\n'
                + 'Are you sure you want to merge them? (The lowest score will be used)',
                type: 'confirm',
                url: 'http://localhost:8000/quiz.html#date=91',
            },
        ])

        // Score decreased becaues upload is less
        await checkText(t, 'Excellent! 😊 4/5', '🟩🟩🟩🟩🟥')

        // Score not increased although import is better
        await t.navigateTo('/quiz.html#mode=retro&date=39')
        await checkText(t, 'Impressively Bad Job! 🤷 0/5', '🟥🟥🟥🟥🟥')

        // Non-conflicing imported quizes exist
        await t.navigateTo(`/quiz.html#date=90`)
        await checkText(t, 'Excellent! 😊 4/5', '🟩🟩🟩🟩🟥')

        await t.navigateTo('/quiz.html#mode=retro&date=40')
        await checkText(t, 'No! No!! 😠 1/5', '🟩🟥🟥🟥🟥')

        // Should transfer over the user id
        await t.expect(Selector('.juxtastat-user-id').withExactText('b0bacafe').exists).ok()

        // Should transfer over secure id
        await t.expect(await t.eval(() => localStorage.getItem('secure_id'))).eql('baddecaf')
    })

    test('support old retro links', async (t) => {
        await t.navigateTo('/quiz.html?mode=retro')
        await t.expect(Selector('[class*=headertext]').withText(/Retrostat W\d*/).exists).ok()
    })

    const expectedExportWithoutDateNumbers = {
        persistent_id: 'b0bacafe',
        secure_id: 'baddecaf',
        quiz_history: {
            90: {
                choices: [
                    'A',
                    'A',
                    'A',
                    'A',
                    'A',
                ],
                correct_pattern: [
                    1,
                    1,
                    1,
                    1,
                    0,
                ],
            },
        },
        quiz_friends: [],
    }

    quizFixture('import quiz progress with numbers', `${target}/quiz.html#date=90`,
        {},
        '',
        platform,
    )

    test('import quiz progress with numbers', async (t) => {
        // Write the file to upload
        const tempfile = `${tempfileName()}.json`
        writeFileSync(tempfile, JSON.stringify(expectedExportWithoutDateNumbers, null, 2))

        await t.setNativeDialogHandler(() => 'merge')
        await t.click(Selector('button').withExactText('Import Quiz History'))
        await t.setFilesToUpload('input[type=file]', [tempfile])
        await checkText(t, 'Excellent! 😊 4/5', '🟩🟩🟩🟩🟥')
    })

    quizFixture('completed juxta 468', `${target}/quiz.html#date=468`,
        {
            quiz_history: JSON.stringify({
                468: {
                    choices: ['A', 'A', 'A', 'A', 'A'],
                    correct_pattern: [false, false, true, false, true],
                },
            }),
            persistent_id: 'b0bacafe',
            secure_id: 'baddecaf',
        },
        '',
        platform,
    )

    test('quiz results go to compare pages', async (t) => {
        // only using the image tests because the links are not stable across versions
        await t.click(Selector('a').withText(/Colorado, USA/))
        await screencap(t)
        await ClientFunction(() => { history.back() })()
        await t.click(Selector('a').withText(/Toronto CDR, Ontario, Canada/))
        await screencap(t)
    })

    quizFixture('current juxta', `${target}/quiz.html`, {}, '', platform)

    test('share link current juxta', async (t) => {
        await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
        const copies = await withMockedClipboard(t, async () => {
            await t.click(Selector('button').withExactText('Copy'))
        })
        await t.expect(copies.length).eql(1)
        // Emoji are double length
        await t.expect(copies[0]).match(/^Juxtastat [0-9]+ [012345]\/5\n\n[🟩🟥]{10}\n\nhttps:\/\/juxtastat\.org$/)
    })

    const debugTime = 25

    quizFixture(`current juxta ending in ${debugTime}s`, `${target}/quiz.html`, {
        debug_quiz_transition: `${debugTime * 1000}`,
    }, '', platform)

    test('next quiz button when quiz ends', async (t) => {
        await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
        await t.expect(Selector('a').withExactText('Next Quiz').exists).notOk()
        await t.click(Selector('a', { timeout: debugTime * 1000 }).withExactText('Next Quiz'))
        await t.expect(Selector('a').withExactText('Next Quiz').exists).notOk()
    })

    quizFixture('current retro', `${target}/quiz.html#mode=retro`, {}, '', platform)

    test('share link current retro', async (t) => {
        await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
        const copies = await withMockedClipboard(t, async () => {
            await t.click(Selector('button').withExactText('Copy'))
        })
        await t.expect(copies.length).eql(1)
        // Emoji are double length
        await t.expect(copies[0]).match(/^Retrostat Week [0-9]+ [012345]\/5\n\n[🟩🟥]{10}\n\nhttps:\/\/juxtastat\.org\/#mode=retro$/)
    })

    function customQuizURL(quiz: object): string {
        const quizStr = JSON.stringify(quiz)
        const quizBuffer = Buffer.from(quizStr)
        const quizBufferGzip = gzipSync(quizBuffer)
        const quizBase64 = quizBufferGzip.toString('base64')
        const params = new URLSearchParams()
        params.set('mode', 'custom')
        params.set('quizContent', quizBase64)
        const url = `${target}/quiz.html#${params.toString()}`
        return url
    }

    const quiz5Q = {
        name: 'this is a testing quiz',
        questions: [
            {
                stat_column: 'PW Density (r=1km) Change (2010-2020)',
                stat_path: 'ad_1_change_2010',
                question: 'higher % increase in population-weighted density (r=1km) from 2010 to 2020!TOOLTIP Population-weighted density is computed by computing the density within the given radius for each person in the region and then averaging the results. This is a better measure of the density that people actually experience.',
                longname_a: 'Wichita-Hutchinson KS Media Market, USA',
                longname_b: 'Colorado Springs-Pueblo CO Media Market, USA',
                stat_a: -0.013566195644550461,
                stat_b: 0.052631086846664205,
                kind: 'juxtastat',
            },
            {
                stat_column: '2BR Rent < $750 %',
                stat_path: 'rent_2br_under_750',
                question: 'higher % of units with 2br rent under $750',
                longname_a: 'Urban Honolulu MSA, HI, USA',
                longname_b: 'Springfield MSA, MA, USA',
                stat_a: 0.05628738569130583,
                stat_b: 0.19354157872520084,
                kind: 'juxtastat',
            },
            {
                stat_column: 'Within 1mi of a grocery store %',
                stat_path: 'lapop1share_usda_fra_1',
                question: '!FULL Which has more access to grocery stores (higher % of people within 1mi of a grocery store)?!TOOLTIP The USDA defines a grocery store as a \'supermarket, supercenter, or large grocery store.\'',
                longname_a: 'TX-09, USA',
                longname_b: 'WI-07, USA',
                stat_a: 0.786293727440369,
                stat_b: 0.300920896509278,
                kind: 'juxtastat',
            },
            {
                stat_column: 'Obesity %',
                stat_path: 'OBESITY_cdc_2',
                question: 'higher % of adults with obesity',
                longname_a: 'Philadelphia city, Pennsylvania, USA',
                longname_b: 'San Francisco city, California, USA',
                stat_a: 0.3105878164213836,
                stat_b: 0.19007954296263044,
                kind: 'juxtastat',
            },
            {
                stat_column: 'Gen Alpha %',
                stat_path: 'generation_genalpha',
                question: 'higher % of people who are gen alpha!TOOLTIP born between 2012 and 2021',
                longname_a: 'Washoe County, Nevada, USA',
                longname_b: 'Cumberland County, North Carolina, USA',
                stat_a: 0.11647330529141768,
                stat_b: 0.14569730980688378,
                kind: 'juxtastat',
            },
        ],
    }

    quizFixture('custom quiz', customQuizURL(quiz5Q), {}, `
    CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStats
        (user integer, day integer, corrects integer, time integer, PRIMARY KEY (user, day));

    CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStatsRetrostat
        (user integer, week integer, corrects integer, time integer, PRIMARY KEY (user, week));
`, platform)

    test('custom-quiz', async (t) => {
        const checkFirstQuestionPage = async (): Promise<void> => {
            await t.expect(Selector('[class*=quiztext]').innerText).eql('Which has a higher % increase in population-weighted density (r=1km) from 2010 to 2020?ⓘ\ufe0e')
        }

        await checkFirstQuestionPage()

        await screencap(t)
        await clickButtons(t, ['a', 'b', 'a', 'b', 'a'])
        await t.expect(Selector('#quiz-result-summary-words').innerText).eql('Better luck next time! 🫤 2/5')
        await t.expect(Selector('#quiz-result-summary-emoji').innerText).eql('🟥🟩🟩🟥🟥')
        await screencap(t)
        // no change to the database
        await t.expect(await juxtastatTable(t)).eql('')
        // refreshing brings us back to the same quiz
        await safeReload(t)
        await checkFirstQuestionPage()
    })

    test('custom-quiz-sharelink', async (t) => {
        await clickButtons(t, ['a', 'b', 'a', 'b', 'a'])
        const copies = await withMockedClipboard(t, async () => {
            await t.click(Selector('button').withExactText('Copy'))
        })
        await t.expect(copies.length).eql(1)
        const copy = copies[0]
        // split by line
        const lines = copy.split('\n')
        await t.expect(lines.length).eql(5)
        await t.expect(lines[0]).eql('Juxtastat Custom this is a testing quiz 2/5')
        await t.expect(lines[1]).eql('')
        await t.expect(lines[2]).eql('🟥🟩🟩🟥🟥')
        await t.expect(lines[3]).eql('')
        await t.expect(lines[4]).match(/^https:\/\/s\.urbanstats\.org\/s\?c=.*$/)
        // navigate to the url, should bring us back to the same quiz
        const response = await fetch(lines[4].replaceAll('https://s.urbanstats.org', 'http://localhost:54579'), { redirect: 'manual' })
        await t.expect(response.status).eql(302)
        await t.expect(response.headers.get('Location')).eql(customQuizURL(quiz5Q).replaceAll(target, 'https://urbanstats.org'))
    })

    const quiz3Q = {
        name: 'this is a testing quiz with 3 questions',
        questions: [
            {
                stat_column: 'PW Density (r=1km) Change (2010-2020)',
                stat_path: 'ad_1_change_2010',
                question: 'higher % increase in population-weighted density (r=1km) from 2010 to 2020!TOOLTIP Population-weighted density is computed by computing the density within the given radius for each person in the region and then averaging the results. This is a better measure of the density that people actually experience.',
                longname_a: 'Wichita-Hutchinson KS Media Market, USA',
                longname_b: 'Colorado Springs-Pueblo CO Media Market, USA',
                stat_a: -0.013566195644550461,
                stat_b: 0.052631086846664205,
                kind: 'juxtastat',
            },
            {
                stat_column: '2BR Rent < $750 %',
                stat_path: 'rent_2br_under_750',
                question: 'higher % of units with 2br rent under $750',
                longname_a: 'Urban Honolulu MSA, HI, USA',
                longname_b: 'Springfield MSA, MA, USA',
                stat_a: 0.05628738569130583,
                stat_b: 0.19354157872520084,
                kind: 'juxtastat',
            },
            {
                stat_column: 'Within 1mi of a grocery store %',
                stat_path: 'lapop1share_usda_fra_1',
                question: '!FULL Which has more access to grocery stores (higher % of people within 1mi of a grocery store)?!TOOLTIP The USDA defines a grocery store as a \'supermarket, supercenter, or large grocery store.\'',
                longname_a: 'TX-09, USA',
                longname_b: 'WI-07, USA',
                stat_a: 0.786293727440369,
                stat_b: 0.300920896509278,
                kind: 'juxtastat',
            },
        ],
    }

    quizFixture('custom quiz 3q', customQuizURL(quiz3Q), {}, '', platform)

    test('custom-quiz-3q', async (t) => {
        await screencap(t)
        await clickButtons(t, ['a', 'b'])
        await screencap(t)
        await clickButtons(t, ['a'])
        await screencap(t)
        await t.expect(Selector('#quiz-result-summary-words').innerText).eql('Excellent! 😊 2/3')
        await t.expect(Selector('#quiz-result-summary-emoji').innerText).eql('🟥🟩🟩')
    })

    const quiz11Q = {
        name: 'this is a testing quiz with 11 questions',
        questions: [
            {
                stat_column: 'Spanish at Home %',
                stat_path: 'language_spanish',
                question: 'higher % of people who speak spanish at home',
                longname_a: 'New Orleans Urban Center, USA',
                longname_b: 'Miami Urban Center, USA',
                stat_a: 0.08249346084500632,
                stat_b: 0.426731964114955,
                kind: 'juxtastat',
            },
            {
                stat_column: 'Manufacturing %',
                stat_path: 'industry_manufacturing',
                question: 'higher % of workers employed in the manufacturing industry!TOOLTIP metal manufacturing, machinery manufacturing, cement and concrete product manufacturing, sawmills, wood product manufacturing, food and beverage manufacturing, textile mills, apparel manufacturing, paper manufacturing, printing, chemical manufacturing, plastics and rubber products manufacturing, etc.',
                longname_a: 'Hamilton City, Hamilton CDR, Ontario, Canada',
                longname_b: 'San Juan zona urbana, Puerto Rico, USA',
                stat_a: 0.11584687291342102,
                stat_b: 0.031900753259022634,
                kind: 'juxtastat',
            },
            {
                stat_column: 'PW Mean % of parkland within 1km',
                stat_path: 'park_percent_1km_v2',
                question: '!FULL Which has more access to parks (higher % of area within 1km of a park, population weighted)?',
                longname_a: 'Winston-Salem MSA, NC, USA',
                longname_b: 'Urban Honolulu MSA, HI, USA',
                stat_a: 0.009619555985026298,
                stat_b: 0.02761836938665365,
                kind: 'juxtastat',
            },
            {
                stat_column: 'Transportation occupations %',
                stat_path: 'occupation_transportation_occupations',
                question: 'higher % of workers employed in transportation occupations!TOOLTIP truck drivers, bus drivers, taxi drivers, pilots, flight attendants, sailors, etc.',
                longname_a: 'Ottawa County, Michigan, USA',
                longname_b: 'Howard County, Maryland, USA',
                stat_a: 0.037622607635908606,
                stat_b: 0.017356676805907068,
                kind: 'juxtastat',
            },
            {
                stat_column: 'Smoking %',
                stat_path: 'CSMOKING_cdc_2',
                question: 'higher % of adults who smoke',
                longname_a: 'Bergen County, New Jersey, USA',
                longname_b: 'Kent County, Michigan, USA',
                stat_a: 0.11535737384866114,
                stat_b: 0.15343243012184765,
                kind: 'juxtastat',
            },
            {
                stat_column: '% units built pre-1970',
                stat_path: 'year_built_1969_or_earlier',
                question: 'higher % units built pre-1970',
                longname_a: 'MA-04, USA',
                longname_b: 'NC-02, USA',
                stat_a: 0.5536152460351866,
                stat_b: 0.12210186690953195,
                kind: 'juxtastat',
            },
            {
                stat_column: '2020 Presidential Election',
                stat_path: '2020 Presidential Election-margin',
                question: '!FULL Which voted more for Biden in the 2020 presidential election?',
                longname_a: 'Lexington-Fayette MSA, KY, USA',
                longname_b: 'Scranton--Wilkes-Barre--Hazleton MSA, PA, USA',
                stat_a: 0.021793516915771013,
                stat_b: -0.06216567621988598,
                kind: 'juxtastat',
            },
            {
                stat_column: 'Renter %',
                stat_path: 'rent_or_own_rent',
                question: 'higher % of people who are renters',
                longname_a: 'TX-30, USA',
                longname_b: 'MD-05, USA',
                stat_a: 0.48848916779183443,
                stat_b: 0.20997575115596062,
                kind: 'juxtastat',
            },
            {
                stat_column: 'Commute Walk %',
                stat_path: 'transportation_means_walk',
                question: 'higher % of people who commute by walking',
                longname_a: 'Boston Urban Center, USA',
                longname_b: 'Dayton Urban Center, USA',
                stat_a: 0.0844202827410501,
                stat_b: 0.03195903153111631,
                kind: 'juxtastat',
            },
            {
                stat_column: 'Citizen by Birth %',
                stat_path: 'citizenship_citizen_by_birth',
                question: 'higher % of residents who are citizens by birth',
                longname_a: 'Texas, USA',
                longname_b: 'South Dakota, USA',
                stat_a: 0.8300810867944861,
                stat_b: 0.9617763967407014,
                kind: 'juxtastat',
            },
            {
                stat_column: 'PW Mean % of parkland within 1km',
                stat_path: 'park_percent_1km_v2',
                question: '!FULL Which has more access to parks (higher % of area within 1km of a park, population weighted)?',
                longname_a: 'Indio Urban Center, USA',
                longname_b: 'Washington D.C. Urban Center, USA',
                stat_a: 0.011169369218126281,
                stat_b: 0.052825856965525185,
                kind: 'juxtastat',
            },
        ],
    }

    quizFixture('custom quiz 11q', customQuizURL(quiz11Q), {}, '', platform)

    test('custom-quiz-11q', async (t) => {
        await screencap(t)
        await clickButtons(t, ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'b', 'a', 'b'])
        await screencap(t)
        await clickButtons(t, ['a'])
        await screencap(t)
        await t.expect(Selector('#quiz-result-summary-words').innerText).eql('Better luck next time! 🫤 3/11')
        await t.expect(Selector('#quiz-result-summary-emoji').innerText).eql('🟥🟥🟥🟥🟥🟥🟩🟥🟩🟩\n🟥')
    })
}
