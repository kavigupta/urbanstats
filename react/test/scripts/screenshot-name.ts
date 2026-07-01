import path from 'path'

import { TestCaseName } from './util'

// Screenshot files are named "{testName}-{screenshotNumber}.png" inside a "{browser}/" subdirectory.
// This naming is established by screenshotPath() in test_utils.ts and parsed by testCaseNameFromFile().

export function screenshotBasename(testName: string, screenshotNumber: number): string {
    return `${testName}-${screenshotNumber}.png`
}

export function flakyErrorBasename(testName: string): string {
    return `${testName}.flaky.error.png`
}

export const errorPattern = `\${BROWSER}/\${TEST}.error.png`

// Extracts the TestCafe test name from a screenshot filename.
// Handles three patterns: "{name}-{n}.png", "{name}.flaky.error.png", "{name}.error.png".
// .flaky.error.png must be tried before .error.png to avoid matching the wrong suffix.
// Throws if the filename matches none of the patterns.
export function testCaseNameFromFile(filepath: string): TestCaseName {
    const basename = path.basename(filepath)
    const match = /^(.+)-\d+\.png$/.exec(basename)
        ?? /^(.+)\.flaky\.error\.png$/.exec(basename)
        ?? /^(.+)\.error\.png$/.exec(basename)
    if (match === null) throw new Error(`could not extract test case name from: ${basename}`)
    return match[1] as TestCaseName
}
