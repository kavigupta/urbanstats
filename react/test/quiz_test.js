import { Selector, RequestHook } from 'testcafe';
import { TARGET, screencap } from './test_utils';
import { exec } from 'child_process';
import { writeFileSync } from 'fs';

// proxy persistent.urbanstats.org to localhost:54579

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
    return new Promise((resolve, reject) => {
        exec(command_line, (err, stdout, stderr) => {
            if (err || stderr) {
                console.log(err);
                console.log(stderr);
                reject(err);
            }
            resolve(stdout);
        });
    });
}

function juxtastat_table() {
    return run_query("SELECT user, day, corrects from JuxtaStatIndividualStats");
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
            await new Promise((resolve, reject) => {
                exec(`rm -f ../urbanstats-persistent-data/db.sqlite3; cd ../urbanstats-persistent-data; cat ${tempfile} | sqlite3 db.sqlite3; cd -`, (err, stdout, stderr) => {
                    if (err || stderr) {
                        console.log(err);
                        console.log(stderr);
                        reject(err || stderr);
                    }
                    resolve(stdout);
                }
                );
            });
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
}

function example_quiz_history(min_quiz, max_quiz) {
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
    await screencap(t, "quiz/clickthrough-1");
    await click_button(t, "b");
    await t.wait(2000);
    await screencap(t, "quiz/clickthrough-2");
    await click_button(t, "a");
    await t.wait(2000);
    await screencap(t, "quiz/clickthrough-3");
    await click_button(t, "b");
    await t.wait(2000);
    await screencap(t, "quiz/clickthrough-4");
    await click_button(t, "a");
    await t.wait(2000);
    await t.eval(() => document.getElementById("quiz-timer").remove());
    await t.wait(3000);
    await screencap(t, "quiz/clickthrough-5");
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
    await t.eval(() => document.getElementById("quiz-timer").remove());
    await t.wait(1000);
    await screencap(t, "quiz/results-page");
});