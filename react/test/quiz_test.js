import { TARGET, screencap } from './test_utils';

fixture('quiz result test')
    .page(TARGET + '/quiz.html?date=100')
    // no local storage
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