import { IS_TESTING } from "./test_utils";



fixture('mapping')
    .page(TARGET)
    // no local storage
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test("state-map", async t => {
    if (!IS_TESTING) {
        throw new Error("String tests are in overwrite mode. Set IS_TESTING to true to run tests.");
    }
})
