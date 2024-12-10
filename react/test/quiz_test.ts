import { exec } from 'child_process'
import { writeFileSync, readFileSync } from 'fs'
import { promisify } from 'util'

import { execa } from 'execa'
import { RequestHook, Selector } from 'testcafe'

import { TARGET, most_recent_download_path, safeReload, screencap, urbanstatsFixture } from './test_utils'

async function quiz_screencap(t: TestController): Promise<void> {
    await t.eval(() => {
        const elem = document.getElementById('quiz-timer')
        if (elem) {
            elem.remove()
        }
    })
    await t.wait(1000)
    await screencap(t)
}

export class ProxyPersistent extends RequestHook {
    override onRequest(e: { requestOptions: RequestMockOptions }): void {
        if (e.requestOptions.hostname === 'persistent.urbanstats.org') {
            e.requestOptions.hostname = 'localhost'
            e.requestOptions.port = 54579
            e.requestOptions.protocol = 'http:'
            e.requestOptions.path = e.requestOptions.path.replace('https://persistent.urbanstats.org', 'localhost:54579')
            e.requestOptions.host = 'localhost:54579'
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function -- TestCafe complains if we don't have this
    override onResponse(): void { }
}

async function run_query(query: string): Promise<string> {
    // dump given query to a string
    const command_line = `sqlite3 ../urbanstats-persistent-data/db.sqlite3 "${query}"`
    const result = await promisify(exec)(command_line)
    return result.stdout
}

function juxtastat_table(): Promise<string> {
    return run_query('SELECT user, day, corrects from JuxtaStatIndividualStats')
}

function retrostat_table(): Promise<string> {
    return run_query('SELECT user, week, corrects from JuxtaStatIndividualStatsRetrostat')
}

function secure_id_table(): Promise<string> {
    return run_query('SELECT user, secure_id from JuxtaStatUserSecureID')
}

function tempfile_name(): string {
    return `/tmp/quiz_test_${Math.floor(Math.random() * 1000000)}`
}

function quiz_fixture(fix_name: string, url: string, new_localstorage: Record<string, string>, sql_statements: string): void {
    urbanstatsFixture(fix_name, url, async (t) => {
        // create a temporary file
        const tempfile = `${tempfile_name()}.sql`
        // write the sql statements to the temporary file
        writeFileSync(tempfile, sql_statements)
        await promisify(exec)(`rm -f ../urbanstats-persistent-data/db.sqlite3; cd ../urbanstats-persistent-data; cat ${tempfile} | sqlite3 db.sqlite3; cd -`)
        void execa('bash', ['../urbanstats-persistent-data/run_for_test.sh'], { stdio: 'inherit' })
        await t.wait(2000)
        await t.eval(() => {
            localStorage.clear()
            for (const k of Object.keys(new_localstorage)) {
                localStorage.setItem(k, new_localstorage[k])
            }
        }, { dependencies: { new_localstorage } })
        await t.eval(() => {
            localStorage.setItem('testHostname', 'urbanstats.org')
        })
    })
        .afterEach(async (t) => {
            exec('killall gunicorn')
            await t.wait(1000)
        })
        .requestHooks(new ProxyPersistent())
}

// click the kth button with id quiz-answer-button-$which
function click_button(t: TestController, which: string): TestControllerPromise {
    return t.click(Selector('div').withAttribute('id', `quiz-answer-button-${which}`))
}

async function click_buttons(t: TestController, whichs: string[]): Promise<void> {
    for (const which of whichs) {
        await click_button(t, which)
        await t.wait(500)
    }
    await t.wait(2000)
}

function example_quiz_history(min_quiz: number, max_quiz: number, min_retro?: number, max_retro?: number): Record<string | number, { choices: ('A' | 'B')[], correct_pattern: [boolean, boolean, boolean, boolean, boolean] }> {
    const quiz_history: Record<number | string, { choices: ('A' | 'B')[], correct_pattern: [boolean, boolean, boolean, boolean, boolean] }> = {}
    for (let i = min_quiz; i <= max_quiz; i++) {
        quiz_history[i] = {
            choices: ['A', 'A', 'A', 'A', 'A'],
            correct_pattern: [true, true, true, i % 3 === 1, i % 4 === 1],
        }
    }
    if (min_quiz <= 62 && max_quiz >= 62) {
        quiz_history[62] = {
            choices: ['A', 'A', 'A', 'A', 'A'],
            correct_pattern: [false, false, false, false, false],
        }
    }
    if (min_retro && max_retro) {
        for (let i = min_retro; i <= max_retro; i++) {
            quiz_history[`W${i}`] = {
                choices: ['A', 'A', 'A', 'A', 'A'],
                correct_pattern: [true, true, true, i % 3 === 1, i % 4 === 1],
            }
        }
    }
    return quiz_history
}

quiz_fixture(
    'quiz clickthrough test on empty background',
    `${TARGET}/quiz.html#date=99`,
    { persistent_id: '000000000000007' },
    '',
)

test('quiz-clickthrough-test', async (t) => {
    await click_button(t, 'a')
    await t.wait(2000)
    await quiz_screencap(t)
    await click_button(t, 'b')
    await t.wait(2000)
    await quiz_screencap(t)
    await click_button(t, 'a')
    await t.wait(2000)
    await quiz_screencap(t)
    await click_button(t, 'b')
    await t.wait(2000)
    await quiz_screencap(t)
    await click_button(t, 'a')
    await t.wait(2000)
    await t.eval(() => { document.getElementById('quiz-timer')!.remove() })
    await t.wait(3000)
    await quiz_screencap(t)
    const quiz_history: unknown = await t.eval(() => {
        return JSON.stringify(JSON.parse(localStorage.getItem('quiz_history')!))
    })
    await t.expect(quiz_history).eql('{"99":{"choices":["A","B","A","B","A"],"correct_pattern":[true,false,true,false,false]}}')
    await t.expect(await juxtastat_table()).eql('7|99|5\n')
})

quiz_fixture(
    'report old quiz results too',
    `${TARGET}/quiz.html#date=99`,
    { persistent_id: '000000000000007', secure_id: '00000003', quiz_history: JSON.stringify(example_quiz_history(87, 90)) },
    '',
)

test('quiz-report-old-results', async (t) => {
    await safeReload(t)
    await click_buttons(t, ['a', 'a', 'a', 'a', 'a'])
    const quiz_history: unknown = await t.eval(() => {
        return JSON.parse(localStorage.getItem('quiz_history')!) as unknown
    })
    const expected_quiz_history = example_quiz_history(87, 90)
    expected_quiz_history[99] = {
        choices: ['A', 'A', 'A', 'A', 'A'],
        correct_pattern: [true, true, true, true, false],
    }
    await t.expect(quiz_history).eql(expected_quiz_history)
    await t.expect(await juxtastat_table()).eql('7|87|7\n7|88|15\n7|89|23\n7|90|7\n7|99|15\n')
    // check that the user was registered
    await t.expect(await secure_id_table()).eql('7|3\n')
})

quiz_fixture(
    'trust on first use',
    `${TARGET}/quiz.html#date=99`,
    { persistent_id: '000000000000007', secure_id: '00000003', quiz_history: JSON.stringify(example_quiz_history(87, 90)) },
    `
    CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStats
        (user integer, day integer, corrects integer, time integer, PRIMARY KEY (user, day));
    INSERT INTO JuxtaStatIndividualStats VALUES (7, 30, 0, 0);
    `,
)

test('quiz-trust-on-first-use', async (t) => {
    await safeReload(t)
    await click_buttons(t, ['a', 'a', 'a', 'a', 'a'])
    await t.expect(await juxtastat_table()).eql('7|30|0\n7|87|7\n7|88|15\n7|89|23\n7|90|7\n7|99|15\n')
    await t.expect(await secure_id_table()).eql('7|3\n')
})

quiz_fixture(
    'auth failure',
    `${TARGET}/quiz.html#date=99`,
    { persistent_id: '000000000000007', secure_id: '00000003', quiz_history: JSON.stringify(example_quiz_history(87, 90)) },
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
    await click_buttons(t, ['a', 'a', 'a', 'a', 'a'])
    // authentication failure, so no change to the database
    await t.expect(await juxtastat_table()).eql('7|30|0\n')
    await t.expect(await secure_id_table()).eql('7|4\n')
    await quiz_screencap(t)
})

quiz_fixture(
    'do not report stale quiz results',
    `${TARGET}/quiz.html#date=99`,
    { persistent_id: '000000000000007', quiz_history: JSON.stringify(example_quiz_history(87, 92)) },
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
    await click_buttons(t, ['a', 'a', 'a', 'a', 'a'])
    const quiz_history: unknown = await t.eval(() => {
        return JSON.parse(localStorage.getItem('quiz_history')!) as unknown
    })
    const expected_quiz_history = example_quiz_history(87, 92)
    expected_quiz_history[99] = {
        choices: ['A', 'A', 'A', 'A', 'A'],
        correct_pattern: [true, true, true, true, false],
    }
    await t.expect(quiz_history).eql(expected_quiz_history)
    await t.expect(await juxtastat_table()).eql('7|87|0\n7|88|0\n7|89|0\n7|90|0\n7|91|15\n7|92|7\n7|99|15\n')
})

quiz_fixture(
    'percentage correct test',
    `${TARGET}/quiz.html#date=99`,
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
    await click_buttons(t, ['a', 'a', 'a', 'a', 'a'])
    await quiz_screencap(t)
    await t.expect(await juxtastat_table()).eql(
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
    await click_buttons(t, ['a', 'a', 'a', 'a', 'a'])
    await quiz_screencap(t)
    await t.expect(await juxtastat_table()).eql(
        `${Array.from(Array(30).keys()).map(i => `${i + 30}|99|101`).join('\n')}\n` + `7|99|15\n` + `8|99|15\n`,
    )
    // assert element with id quiz-audience-statistics exists
    await t.expect(Selector('#quiz-audience-statistics').exists).ok()
    const stats = await Selector('#quiz-audience-statistics').innerText
    await t.expect(stats).eql('Question Difficulty\n100%\nQ1 Correct\n3%\nQ2 Correct\n100%\nQ3 Correct\n3%\nQ4 Correct\n0%\nQ5 Correct')
})

quiz_fixture(
    'new user',
    `${TARGET}/quiz.html#date=99`,
    {},
    '',
)

function hex_to_dec(hex: string): string {
    // https://stackoverflow.com/a/53751162/1549476
    if (hex.length % 2) { hex = `0${hex}` }

    const bn = BigInt(`0x${hex}`)

    const d = bn.toString(10)
    return d
}

test('quiz-new-user', async (t) => {
    await click_buttons(t, ['a', 'a', 'a', 'a', 'a'])
    const result = await t.eval(() => {
        return [localStorage.getItem('persistent_id'), localStorage.getItem('secure_id')] as [string, string]
    }) as [string, string] | null
    await t.expect(result).notEql(null)
    const [user_id, secure_id] = result!
    const user_id_int = hex_to_dec(user_id)
    const secure_id_int = hex_to_dec(secure_id)
    const juxta_table = await juxtastat_table()
    await t.expect(juxta_table).eql(`${user_id_int}|99|15\n`)
    await t.expect(await run_query('SELECT user from JuxtastatUserDomain')).eql(`${user_id_int}\n`)
    const secure_table = await secure_id_table()
    await t.expect(secure_table).eql(`${user_id_int}|${secure_id_int}\n`)
})

quiz_fixture(
    'retrostat',
    `${TARGET}/quiz.html#date=99`,
    { persistent_id: '000000000000007', quiz_history: JSON.stringify(example_quiz_history(87, 93, 27, 33)) },
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
    await click_buttons(t, ['a', 'a', 'a', 'a', 'a'])
    const quiz_history: unknown = await t.eval(() => {
        return JSON.parse(localStorage.getItem('quiz_history')!) as unknown
    })
    const expected_quiz_history = example_quiz_history(87, 93, 27, 33)
    expected_quiz_history[99] = {
        choices: ['A', 'A', 'A', 'A', 'A'],
        correct_pattern: [true, true, true, true, false],
    }
    await t.expect(quiz_history).eql(expected_quiz_history)
    await t.expect(await juxtastat_table()).eql('7|90|0\n7|91|15\n7|92|7\n7|93|23\n7|99|15\n')
    await t.expect(await retrostat_table()).eql('7|30|0\n')
})

test('quiz-retrostat-retrostat-reporting', async (t) => {
    const url = `${TARGET}/quiz.html#mode=retro&date=38`
    await t.navigateTo(url)
    await safeReload(t)
    await click_buttons(t, ['a', 'a', 'a', 'a', 'a'])
    const quiz_history: unknown = await t.eval(() => {
        return JSON.parse(localStorage.getItem('quiz_history')!) as unknown
    })
    const expected_quiz_history = example_quiz_history(87, 93, 27, 33)
    expected_quiz_history.W38 = {
        choices: ['A', 'A', 'A', 'A', 'A'],
        correct_pattern: [false, false, true, false, true],
    }
    await t.expect(quiz_history).eql(expected_quiz_history)
    await t.expect(await juxtastat_table()).eql('7|90|0\n')
    await t.expect(await retrostat_table()).eql('7|30|0\n7|31|15\n7|32|7\n7|33|23\n7|38|20\n')
})

quiz_fixture(
    'quiz result test',
    `${TARGET}/quiz.html#date=100`,
    { quiz_history: JSON.stringify(example_quiz_history(2, 100)) },
    '',
)

async function check_text(t: TestController, words: string, emoji: string): Promise<void> {
    const text = await Selector('#quiz-result-summary-words').innerText
    await t.expect(text).eql(words)
    const emoji_text = await Selector('#quiz-result-summary-emoji').innerText
    await t.expect(emoji_text).eql(emoji)
}

test('quiz-results-test', async (t) => {
    await t.resizeWindow(1400, 800)
    await safeReload(t)
    await quiz_screencap(t)
    await check_text(t, 'Excellent! 😊 4/5', '🟩🟩🟩🟩🟥')
})

quiz_fixture('several quiz results', `${TARGET}/quiz.html#date=90`,
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
    await quiz_screencap(t)
    // true true true true false
    await check_text(t, 'Excellent! 😊 4/5', '🟩🟩🟩🟩🟥')
    // go to the next quiz via changing the href
    await t.eval(() => {
        document.location.href = '/quiz.html#date=91'
    })
    await check_text(t, 'Good! 🙃 3/5', '🟩🟥🟩🟥🟩')
    await t.eval(() => {
        document.location.href = '/quiz.html#date=92'
    })
    await check_text(t, 'Perfect! 🔥 5/5', '🟩🟩🟩🟩🟩')
    await t.eval(() => {
        document.location.href = '/quiz.html#date=93'
    })
    await check_text(t, 'Impressively Bad Job! 🤷 0/5', '🟥🟥🟥🟥🟥')
    await t.eval(() => {
        document.location.href = '/quiz.html#date=94'
    })
    await check_text(t, 'Better luck next time! 🫤 2/5', '🟥🟥🟥🟩🟩')
    await t.eval(() => {
        document.location.href = '/quiz.html#date=95'
    })
    await check_text(t, 'Excellent! 😊 4/5', '🟩🟩🟩🟩🟥')
})

quiz_fixture('export quiz progress', `${TARGET}/quiz.html#date=90`,
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
}

test('export quiz progress', async (t) => {
    await t.click(Selector('button').withText('Export Quiz History'))

    // Give it a second to download...
    await t.wait(1000)

    const { date_exported, ...downloadContents } = JSON.parse(readFileSync(most_recent_download_path()).toString()) as Record<string, unknown>

    await t.expect(typeof date_exported === 'string').ok()

    await t.expect(JSON.stringify(downloadContents, null, 2)).eql(JSON.stringify(expectedExportWithoutDate, null, 2))
})

quiz_fixture('import quiz progress', `${TARGET}/quiz.html#date=90`,
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
    },
    '',
)

test('import quiz progress', async (t) => {
    // Write the file to upload
    const tempfile = `${tempfile_name()}.json`
    writeFileSync(tempfile, JSON.stringify(expectedExportWithoutDate, null, 2))

    await t.setNativeDialogHandler(() => 'merge')
    await t.click(Selector('button').withText('Import Quiz History'))
    await t.setFilesToUpload('input[type=file]', [tempfile])
    await check_text(t, 'Excellent! 😊 4/5', '🟩🟩🟩🟩🟥')

    await t.eval(() => {
        document.location.href = '/quiz.html#mode=retro&date=38'
    })
    // Should transfer over retro results
    await check_text(t, 'Good! 🙃 3/5', '🟩🟥🟩🟥🟩')

    // Should transfer over the user id
    await t.expect(Selector('.juxtastat-user-id').withText('b0bacafe').exists).ok()

    // Should transfer over secure id
    await t.expect(await t.eval(() => localStorage.getItem('secure_id'))).eql('baddecaf')

    // Quiz 91 should still be there
    await t.eval(() => {
        document.location.href = '/quiz.html#date=91'
    })
    await check_text(t, 'Perfect! 🔥 5/5', '🟩🟩🟩🟩🟩')

    // Retro 39 should still be there
    await t.eval(() => {
        document.location.href = '/quiz.html#mode=retro&date=39'
    })
    await check_text(t, 'Impressively Bad Job! 🤷 0/5', '🟥🟥🟥🟥🟥')
})

test('import quiz progress conflict', async (t) => {
    await t.navigateTo(`/quiz.html#date=91`)
    await check_text(t, 'Perfect! 🔥 5/5', '🟩🟩🟩🟩🟩')

    // Write the file to upload
    const tempfile = `${tempfile_name()}.json`
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
    await check_text(t, 'Excellent! 😊 4/5', '🟩🟩🟩🟩🟥')

    // Score not increased although import is better
    await t.navigateTo('/quiz.html#mode=retro&date=39')
    await check_text(t, 'Impressively Bad Job! 🤷 0/5', '🟥🟥🟥🟥🟥')

    // Non-conflicing imported quizes exist
    await t.navigateTo(`/quiz.html#date=90`)
    await check_text(t, 'Excellent! 😊 4/5', '🟩🟩🟩🟩🟥')

    await t.navigateTo('/quiz.html#mode=retro&date=40')
    await check_text(t, 'No! No!! 😠 1/5', '🟩🟥🟥🟥🟥')

    // Should transfer over the user id
    await t.expect(Selector('.juxtastat-user-id').withText('b0bacafe').exists).ok()

    // Should transfer over secure id
    await t.expect(await t.eval(() => localStorage.getItem('secure_id'))).eql('baddecaf')
})
