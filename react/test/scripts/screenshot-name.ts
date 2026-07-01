// Screenshot files are named "{testName}-{screenshotNumber}.png" inside a "{browser}/" subdirectory.
// This naming is established by screenshotPath() in test_utils.ts.

export function screenshotBasename(testName: string, screenshotNumber: number): string {
    return `${testName}-${screenshotNumber}.png`
}

export function flakyErrorBasename(testName: string): string {
    return `${testName}.flaky.error.png`
}

export const errorPattern = `\${BROWSER}/\${TEST}.error.png`
