import { Selector } from 'testcafe';
import { TARGET, screencap } from './test_utils';

fixture('quiz clickthrough test')
    .page(TARGET + '/quiz.html?date=99')
    // no local storage
    .beforeEach(async t => {
        await t.eval(() => {
            localStorage.clear()
        });
    });

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