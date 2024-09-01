import { IS_TESTING } from "./test_utils";

if (!IS_TESTING) {
    throw new Error("String tests are in overwrite mode. Set IS_TESTING to true to run tests.");
}