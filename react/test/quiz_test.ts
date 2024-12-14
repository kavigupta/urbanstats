import { exec } from 'child_process'
import { writeFileSync, readFileSync } from 'fs'
import { promisify } from 'util'

import { ClientFunction, Selector } from 'testcafe'

import { clickButton, clickButtons, quizFixture, quizScreencap, tempfileName } from './quiz_test_utils'
import { target, getLocation, mostRecentDownloadPath, safeReload, screencap } from './test_utils'

async function runQuery(query: string): Promise<string> {
    // dump given query to a string
    const commandLine = `sqlite3 ../urbanstats-persistent-data/db.sqlite3 "${query}"`
    const result = await promisify(exec)(commandLine)
    return result.stdout
}

function juxtastatTable(): Promise<string> {
    return runQuery('SELECT user, day, corrects from JuxtaStatIndividualStats')
}

function retrostatTable(): Promise<string> {
    return runQuery('SELECT user, week, corrects from JuxtaStatIndividualStatsRetrostat')
}

function secureIdTable(): Promise<string> {
    return runQuery('SELECT user, secure_id from JuxtaStatUserSecureID')
}

// eslint-disable-next-line no-restricted-syntax -- Persisted data
type QuizHistory = Record<string | number, { choices: ('A' | 'B')[], correct_pattern: [boolean, boolean, boolean, boolean, boolean] }>

function exampleQuizHistory(minQuiz: number, maxQuiz: number, minRetro?: number, maxRetro?: number): QuizHistory {
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

quizFixture(
    'quiz clickthrough test on empty background',
    `${target}/quiz.html#date=99`,
    { persistent_id: '000000000000007' },
    '',
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
    await t.expect(await juxtastatTable()).eql('7|99|5\n')
})

quizFixture(
    'report old quiz results too',
    `${target}/quiz.html#date=99`,
    { persistent_id: '000000000000007', secure_id: '00000003', quiz_history: JSON.stringify(exampleQuizHistory(87, 90)) },
    '',
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
    await t.expect(await juxtastatTable()).eql('7|87|7\n7|88|15\n7|89|23\n7|90|7\n7|99|15\n')
    // check that the user was registered
    await t.expect(await secureIdTable()).eql('7|3\n')
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
)

test('quiz-trust-on-first-use', async (t) => {
    await safeReload(t)
    await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
    await t.expect(await juxtastatTable()).eql('7|30|0\n7|87|7\n7|88|15\n7|89|23\n7|90|7\n7|99|15\n')
    await t.expect(await secureIdTable()).eql('7|3\n')
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
)

test('quiz-auth-failure', async (t) => {
    await safeReload(t)
    await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
    // authentication failure, so no change to the database
    await t.expect(await juxtastatTable()).eql('7|30|0\n')
    await t.expect(await secureIdTable()).eql('7|4\n')
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
    await t.expect(await juxtastatTable()).eql('7|87|0\n7|88|0\n7|89|0\n7|90|0\n7|91|15\n7|92|7\n7|99|15\n')
})

quizFixture(
    'percentage correct test',
    `${target}/quiz.html#date=99`,
    { persistent_id: '000000000000007' },
    `
    CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStats
        (user integer, day integer, corrects integer, time integer, PRIMARY KEY (user, day));
    CREATE TABLE IF NOT EXISTS JuxtaStatUserDomain (user integer PRIMARY KEY, domain text);

    INSERT INTO JuxtastatUserDomain VALUES (7, 'urbanstats.org');
    INSERT INTO JuxtastatUserDomain VALUES (8, 'urbanstats.org');
    
    ${Array.from(Array(30).keys()).map(
        i => `INSERT INTO JuxtaStatIndividualStats VALUES(${i + 30}, 99, 101, 0); INSERT INTO JuxtaStatUserDomain VALUES(${i + 30}, 'urbanstats.org');`,
    ).join('\n')}`,
)

test('quiz-percentage-correct', async (t) => {
    await safeReload(t)
    await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
    await quizScreencap(t)
    await t.expect(await juxtastatTable()).eql(
        `${Array.from(Array(30).keys()).map(i => `${i + 30}|99|101`).join('\n')}\n` + `7|99|15\n`,
    )
    // assert no element with id quiz-audience-statistics
    await t.expect(Selector('#quiz-audience-statistics').exists).notOk()
    // now become user 8
    await t.eval(() => {
        localStorage.clear()
        localStorage.setItem('persistent_id', '000000000000008')
        localStorage.setItem('testHostname', 'urbanstats.org')
    })
    await safeReload(t)
    await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
    await quizScreencap(t)
    await t.expect(await juxtastatTable()).eql(
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
    const juxtaTable = await juxtastatTable()
    await t.expect(juxtaTable).eql(`${userIdInt}|99|15\n`)
    await t.expect(await runQuery('SELECT user from JuxtastatUserDomain')).eql(`${userIdInt}\n`)
    const secureTable = await secureIdTable()
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
    await t.expect(await juxtastatTable()).eql('7|90|0\n7|91|15\n7|92|7\n7|93|23\n7|99|15\n')
    await t.expect(await retrostatTable()).eql('7|30|0\n')
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
    await t.expect(await juxtastatTable()).eql('7|90|0\n')
    await t.expect(await retrostatTable()).eql('7|30|0\n7|31|15\n7|32|7\n7|33|23\n7|38|20\n')
})

quizFixture(
    'quiz result test',
    `${target}/quiz.html#date=100`,
    { quiz_history: JSON.stringify(exampleQuizHistory(2, 100)) },
    '',
)

async function checkText(t: TestController, words: string, emoji: string): Promise<void> {
    const text = await Selector('#quiz-result-summary-words').innerText
    await t.expect(text).eql(words)
    const emojiText = await Selector('#quiz-result-summary-emoji').innerText
    await t.expect(emojiText).eql(emoji)
}

test('quiz-results-test', async (t) => {
    await t.resizeWindow(1400, 800)
    await safeReload(t)
    await quizScreencap(t)
    await checkText(t, 'Excellent! 😊 4/5', '🟩🟩🟩🟩🟥')
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
    },
    '',
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
    quiz_friends: [],
}

test('export quiz progress', async (t) => {
    await t.click(Selector('button').withText('Export Quiz History'))

    // Give it a second to download...
    await t.wait(1000)

    const { date_exported, ...downloadContents } = JSON.parse(readFileSync(mostRecentDownloadPath()).toString()) as Record<string, unknown>

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
)

test('import quiz progress', async (t) => {
    // Write the file to upload
    const tempfile = `${tempfileName()}.json`
    writeFileSync(tempfile, JSON.stringify(expectedExportWithoutDate, null, 2))

    await t.setNativeDialogHandler(() => 'merge')
    await t.click(Selector('button').withText('Import Quiz History'))
    await t.setFilesToUpload('input[type=file]', [tempfile])
    await checkText(t, 'Excellent! 😊 4/5', '🟩🟩🟩🟩🟥')

    await t.navigateTo('/quiz.html#mode=retro&date=38')
    // Should transfer over retro results
    await checkText(t, 'Good! 🙃 3/5', '🟩🟥🟩🟥🟩')

    // Should transfer over the user id
    await t.expect(Selector('.juxtastat-user-id').withText('b0bacafe').exists).ok()

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
    await t.click(Selector('button').withText('Import Quiz History'))
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
    await t.expect(Selector('.juxtastat-user-id').withText('b0bacafe').exists).ok()

    // Should transfer over secure id
    await t.expect(await t.eval(() => localStorage.getItem('secure_id'))).eql('baddecaf')
})

test('support old retro links', async (t) => {
    await t.navigateTo('/quiz.html?mode=retro')
    await t.expect(Selector('.headertext').withText('Retrostat').exists).ok()
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
)

test('quiz results go to compare pages', async (t) => {
    await t.click(Selector('a').withText('Colorado, USA'))
    await t.expect(getLocation()).eql(`${target}/comparison.html?longnames=%5B%22Colorado%2C+USA%22%2C%22Puerto+Rico%2C+USA%22%5D&s=25z46g1nuqK7JodT`)
    await screencap(t)
    await ClientFunction(() => { history.back() })()
    await t.click(Selector('a').withText('Toronto CDR, Ontario, Canada'))
    await t.expect(getLocation()).eql(`${target}/comparison.html?longnames=%5B%22Toronto+CDR%2C+Ontario%2C+Canada%22%2C%22Longueuil+Territory%2C+Quebec%2C+Canada%22%5D&s=25z46g1nuqK7s3rq`)
    await screencap(t)
})
