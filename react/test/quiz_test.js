import { Selector, RequestHook } from 'testcafe';
import { TARGET, screencap } from './test_utils';
import { exec } from 'child_process';
import { writeFileSync } from 'fs';
import { promisify } from 'util';

async function quiz_screencap(t, name) {
    await t.eval(() => {
        const elem = document.getElementById("quiz-timer");
        if (elem) {
            elem.remove();
        }
    });
    await t.wait(1000);
    await screencap(t, name);
}

export class ProxyPersistent extends RequestHook {
    constructor() {
        // only use this hook for persistent.urbanstats.org
        // super("https://persistent.urbanstats.org", 443);
        super()
    }

    async onRequest(e) {
        if (e.requestOptions.hostname == "persistent.urbanstats.org") {
            e.requestOptions.hostname = "localhost";
            e.requestOptions.port = 54579;
            e.requestOptions.protocol = "http:";
            e.requestOptions.path = e.requestOptions.path.replace("https://persistent.urbanstats.org", "localhost:54579");
            e.requestOptions.host = "localhost:54579";
            // console.log(e)
        }
    }

    async onResponse(e) {
    }
}

async function run_query(query) {
    // dump given query to a string
    const command_line = `sqlite3 ../urbanstats-persistent-data/db.sqlite3 "${query}"`;
    const result = await promisify(exec)(command_line);
    return result.stdout;
}

function juxtastat_table() {
    return run_query("SELECT user, day, corrects from JuxtaStatIndividualStats");
}

function retrostat_table() {
    return run_query("SELECT user, week, corrects from JuxtaStatIndividualStatsRetrostat");
}

function quiz_fixture(fix_name, url, new_localstorage, sql_statements) {
    fixture(fix_name)
        .page(url)
        // no local storage
        .beforeEach(async t => {
            // create a temporary file
            const tempfile = "/tmp/quiz_test_" + Math.floor(Math.random() * 1000000) + ".sql";
            // write the sql statements to the temporary file
            writeFileSync(tempfile, sql_statements);
            await promisify(exec)(`rm -f ../urbanstats-persistent-data/db.sqlite3; cd ../urbanstats-persistent-data; cat ${tempfile} | sqlite3 db.sqlite3; cd -`);
            exec("bash ../urbanstats-persistent-data/run_for_test.sh");
            await t.wait(2000);
            await t.eval(() => {
                localStorage.clear()
                for (var k in new_localstorage) {
                    localStorage.setItem(k, new_localstorage[k]);
                }
            }, { dependencies: { new_localstorage } });
        })
        .afterEach(async t => {
            exec("killall gunicorn");
            await t.wait(1000);
        })
        .requestHooks(new ProxyPersistent());
}

// click the kth button with id quiz-answer-button-$which
function click_button(t, which) {
    return t.click(Selector("div").withAttribute("id", "quiz-answer-button-" + which));
}

async function click_buttons(t, whichs) {
    for (var i = 0; i < whichs.length; i++) {
        await click_button(t, whichs[i]);
        await t.wait(500);
    }
    await t.wait(2000);
}

function example_quiz_history(min_quiz, max_quiz, min_retro, max_retro) {
    const quiz_history = {};
    for (var i = min_quiz; i <= max_quiz; i++) {
        quiz_history[i] = {
            "choices": ["A", "A", "A", "A", "A"],
            "correct_pattern": [true, true, true, i % 3 == 1, i % 4 == 1]
        }
    }
    if (min_quiz <= 62 && max_quiz >= 62) {
        quiz_history[62] = {
            "choices": ["A", "A", "A", "A", "A"],
            "correct_pattern": [false, false, false, false, false]
        }
    }
    if (min_retro && max_retro) {
        for (var i = min_retro; i <= max_retro; i++) {
            quiz_history["W" + i] = {
                "choices": ["A", "A", "A", "A", "A"],
                "correct_pattern": [true, true, true, i % 3 == 1, i % 4 == 1]
            }
        }
    }
    return quiz_history;
}



quiz_fixture(
    'quiz clickthrough test on empty background',
    TARGET + '/quiz.html?date=99',
    { "persistent_id": "000000000000007" },
    ""
);

test('quiz-clickthrough-test', async t => {
    await click_button(t, "a");
    await t.wait(2000);
    await quiz_screencap(t, "quiz/clickthrough-1");
    await click_button(t, "b");
    await t.wait(2000);
    await quiz_screencap(t, "quiz/clickthrough-2");
    await click_button(t, "a");
    await t.wait(2000);
    await quiz_screencap(t, "quiz/clickthrough-3");
    await click_button(t, "b");
    await t.wait(2000);
    await quiz_screencap(t, "quiz/clickthrough-4");
    await click_button(t, "a");
    await t.wait(2000);
    await t.eval(() => document.getElementById("quiz-timer").remove());
    await t.wait(3000);
    await quiz_screencap(t, "quiz/clickthrough-5");
    let quiz_history = await t.eval(() => {
        return JSON.stringify(JSON.parse(localStorage.getItem("quiz_history")));
    });
    await t.expect(quiz_history).eql('{"99":{"choices":["A","B","A","B","A"],"correct_pattern":[true,false,true,false,false]}}');
    await t.expect(await juxtastat_table()).eql("7|99|5\n");
});

quiz_fixture(
    'report old quiz results too',
    TARGET + '/quiz.html?date=99',
    { "persistent_id": "000000000000007", "quiz_history": JSON.stringify(example_quiz_history(87, 90)) },
    ""
);

test('quiz-report-old-results', async t => {
    await t.eval(() => location.reload(true));
    await click_buttons(t, ["a", "a", "a", "a", "a"]);
    let quiz_history = await t.eval(() => {
        return JSON.parse(localStorage.getItem("quiz_history"));
    });
    let expected_quiz_history = example_quiz_history(87, 90);
    expected_quiz_history[99] = {
        "choices": ["A", "A", "A", "A", "A"],
        "correct_pattern": [true, true, true, true, false]
    }
    await t.expect(quiz_history).eql(expected_quiz_history);
    await t.expect(await juxtastat_table()).eql("7|87|7\n7|88|15\n7|89|23\n7|90|7\n7|99|15\n");
});

quiz_fixture(
    'do not report stale quiz results',
    TARGET + '/quiz.html?date=99',
    { "persistent_id": "000000000000007", "quiz_history": JSON.stringify(example_quiz_history(87, 92)) },
    `
    CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStats
        (user integer, day integer, corrects integer, time integer, PRIMARY KEY (user, day));
    INSERT INTO JuxtaStatIndividualStats VALUES (7, 87, 0, 0);
    INSERT INTO JuxtaStatIndividualStats VALUES (7, 88, 0, 0);
    INSERT INTO JuxtaStatIndividualStats VALUES (7, 89, 0, 0);
    INSERT INTO JuxtaStatIndividualStats VALUES (7, 90, 0, 0);
    `
);

test('quiz-do-not-report-stale-results', async t => {
    await t.eval(() => location.reload(true));
    await click_buttons(t, ["a", "a", "a", "a", "a"]);
    let quiz_history = await t.eval(() => {
        return JSON.parse(localStorage.getItem("quiz_history"));
    });
    let expected_quiz_history = example_quiz_history(87, 92);
    expected_quiz_history[99] = {
        "choices": ["A", "A", "A", "A", "A"],
        "correct_pattern": [true, true, true, true, false]
    }
    await t.expect(quiz_history).eql(expected_quiz_history);
    await t.expect(await juxtastat_table()).eql("7|87|0\n7|88|0\n7|89|0\n7|90|0\n7|91|15\n7|92|7\n7|99|15\n");
});


quiz_fixture(
    'percentage correct test',
    TARGET + '/quiz.html?date=99',
    { "persistent_id": "000000000000007" },
    `
    CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStats
        (user integer, day integer, corrects integer, time integer, PRIMARY KEY (user, day));
    CREATE TABLE IF NOT EXISTS JuxtaStatUserDomain (user integer PRIMARY KEY, domain text);

    INSERT INTO JuxtastatUserDomain VALUES (7, 'urbanstats.org');
    INSERT INTO JuxtastatUserDomain VALUES (8, 'urbanstats.org');
    
    ` + Array.from(Array(30).keys()).map(
        i => `INSERT INTO JuxtaStatIndividualStats VALUES(${i + 30}, 99, 101, 0); INSERT INTO JuxtaStatUserDomain VALUES(${i + 30}, 'urbanstats.org');`
    ).join("\n")
);

test('quiz-percentage-correct', async t => {
    await t.eval(() => location.reload(true));
    await click_buttons(t, ["a", "a", "a", "a", "a"]);
    await quiz_screencap(t, "quiz/percentage-correct");
    await t.expect(await juxtastat_table()).eql(
        Array.from(Array(30).keys()).map(i => `${i + 30}|99|101`).join("\n") + "\n" + "7|99|15\n"
    );
    // assert no element with id quiz-audience-statistics
    await t.expect(Selector("#quiz-audience-statistics").exists).notOk();
    // now become user 8
    await t.eval(() => {
        localStorage.clear();
        localStorage.setItem("persistent_id", "000000000000008");
    });
    await t.eval(() => location.reload(true));
    await click_buttons(t, ["a", "a", "a", "a", "a"]);
    await quiz_screencap(t, "quiz/percentage-correct-2");
    await t.expect(await juxtastat_table()).eql(
        Array.from(Array(30).keys()).map(i => `${i + 30}|99|101`).join("\n") + "\n" + "7|99|15\n" + "8|99|15\n"
    );
    // assert element with id quiz-audience-statistics exists
    await t.expect(Selector("#quiz-audience-statistics").exists).ok();
    const stats = await Selector("#quiz-audience-statistics").innerText;
    await t.expect(stats).eql('Question Difficulty\n100%\nQ1 Correct\n3%\nQ2 Correct\n100%\nQ3 Correct\n3%\nQ4 Correct\n0%\nQ5 Correct');
});

quiz_fixture(
    'new user',
    TARGET + '/quiz.html?date=99',
    {},
    "",
);

function hex_to_dec(hex) {
    // https://stackoverflow.com/a/53751162/1549476
    if (hex.length % 2) { hex = '0' + hex; }

    var bn = BigInt('0x' + hex);

    var d = bn.toString(10);
    return d;
}

test('quiz-new-user', async t => {
    await click_buttons(t, ["a", "a", "a", "a", "a"]);
    const user_id = await t.eval(() => {
        return localStorage.getItem("persistent_id");
    });
    await t.expect(user_id).notEql(null);
    var user_id_int = hex_to_dec(user_id);
    const juxta_table = await juxtastat_table();
    await t.expect(juxta_table).eql(`${user_id_int}|99|15\n`);
    await t.expect(await run_query("SELECT user from JuxtastatUserDomain")).eql(`${user_id_int}\n`);
});

quiz_fixture(
    'retrostat',
    TARGET + '/quiz.html?date=99',
    { "persistent_id": "000000000000007", "quiz_history": JSON.stringify(example_quiz_history(87, 93, 27, 33)) },
    `
    CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStats
        (user integer, day integer, corrects integer, time integer, PRIMARY KEY (user, day));
    
    CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStatsRetrostat
        (user integer, week integer, corrects integer, time integer, PRIMARY KEY (user, week));

    INSERT INTO JuxtaStatIndividualStats VALUES (7, 90, 0, 0);
    INSERT INTO JuxtaStatIndividualStatsRetrostat VALUES (7, 30, 0, 0);
    `
);

test('quiz-retrostat-regular-quiz-reporting', async t => {
    await t.eval(() => location.reload(true));
    await click_buttons(t, ["a", "a", "a", "a", "a"]);
    let quiz_history = await t.eval(() => {
        return JSON.parse(localStorage.getItem("quiz_history"));
    });
    let expected_quiz_history = example_quiz_history(87, 93, 27, 33);
    expected_quiz_history[99] = {
        "choices": ["A", "A", "A", "A", "A"],
        "correct_pattern": [true, true, true, true, false]
    }
    await t.expect(quiz_history).eql(expected_quiz_history);
    await t.expect(await juxtastat_table()).eql("7|90|0\n7|91|15\n7|92|7\n7|93|23\n7|99|15\n");
    await t.expect(await retrostat_table()).eql("7|30|0\n");
})

test('quiz-retrostat-retrostat-reporting', async t => {
    const url = TARGET + '/quiz.html?mode=retro&date=38';
    await t.navigateTo(url);
    await t.eval(() => location.reload(true));
    await click_buttons(t, ["a", "a", "a", "a", "a"]);
    let quiz_history = await t.eval(() => {
        return JSON.parse(localStorage.getItem("quiz_history"));
    });
    let expected_quiz_history = example_quiz_history(87, 93, 27, 33);
    expected_quiz_history["W38"] = {
        "choices": ["A", "A", "A", "A", "A"],
        "correct_pattern": [false, false, true, false, true]
    }
    await t.expect(quiz_history).eql(expected_quiz_history);
    await t.expect(await juxtastat_table()).eql("7|90|0\n");
    await t.expect(await retrostat_table()).eql("7|30|0\n7|31|15\n7|32|7\n7|33|23\n7|38|20\n");
});

fixture('quiz result test')
    .page(TARGET + '/quiz.html?date=100')
    // very specific local storage
    .beforeEach(async t => {
        await t.eval(() => {
            localStorage.clear()
            localStorage.setItem("quiz_history", JSON.stringify(example_quiz_history(2, 100)));
        }, { dependencies: { example_quiz_history } });
    });

test('quiz-results-test', async t => {
    await t.resizeWindow(1400, 800);
    await t.eval(() => location.reload(true));
    await t.wait(1000);
    await t.eval(() => location.reload(true));
    await quiz_screencap(t, "quiz/results-page");
});