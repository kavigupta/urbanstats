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
            if (err) {
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
            exec(`rm ../urbanstats-persistent-data/db.sqlite3; cd ../urbanstats-persistent-data; cat ${tempfile} | sqlite3 db.sqlite3; cd -`);
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

quiz_fixture(
    'quiz clickthrough test on empty background',
    TARGET + '/quiz.html?date=99',
    { "persistent_id": "000000000000007" },
    "CREATE TABLE A (a INT);"
);

// click the kth button with id quiz-answer-button-$which
function click_button(t, which) {
    return t.click(Selector("div").withAttribute("id", "quiz-answer-button-" + which));
}

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

fixture('quiz result test')
    .page(TARGET + '/quiz.html?date=100')
    // very specific local storage
    .beforeEach(async t => {
        await t.eval(() => {
            localStorage.clear()
            const quiz_history = {};
            for (var i = 2; i <= 100; i++) {
                quiz_history[i] = {
                    "choices": ["A", "A", "A", "A", "A"],
                    "correct_pattern": [true, true, true, i % 3 == 1, i % 4 == 1]
                }
            }
            quiz_history[62] = {
                "choices": ["A", "A", "A", "A", "A"],
                "correct_pattern": [false, false, false, false, false]
            }
            localStorage.setItem("quiz_history", JSON.stringify(quiz_history));
        });
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