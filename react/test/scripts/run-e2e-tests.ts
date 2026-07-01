import fs from 'fs/promises'
import { Writable } from 'stream'

import chalkTemplate from 'chalk-template'
import { execa } from 'execa'
import { globSync } from 'glob'
import createTestCafe from 'testcafe'
import { z } from 'zod'
import { argumentParser } from 'zodcli'

import { compareScreenshots } from './check-images'
import { startProxy } from './ci_proxy'
import { github } from './github-utils'
import { runE2eTestsDocker } from './run-e2e-tests-docker'
import { errorPattern, testCaseNameFromFile } from './screenshot-name'
import { testCafePorts } from './testcafe-ports'
import { booleanArgument, getTOTPWait, setTOTPWait, TestCaseName, TestFileId, testFilePath, TestHistory, TestResult } from './util'

const options = argumentParser({
    options: z.object({
        proxy: booleanArgument({ defaultValue: false }),
        browser: z.union([z.literal('chrome'), z.literal('chromium')]).default('chrome'),
        test: z.array(z.string()).default(() => { throw new Error(`Missing --test=<glob> argument. E.g. npm run test:e2e -- --test='test/*.test.ts'`) }),
        headless: booleanArgument({ defaultValue: true }),
        video: booleanArgument({ defaultValue: false }),
        compare: booleanArgument({ defaultValue: false }),
        timeLimitSeconds: z.optional(z.coerce.number().int()), // Enforced at 1x if the test file has changed compared to `baseRef`. Otherwise, enforced at 2x
        tries: z.optional(z.coerce.number().int()).default(1), // Enforced at 1x if the test file has changed compared to `baseRef`. Otherwise, enforced at 2x
        baseRef: z.optional(z.string()),
        live: booleanArgument({ defaultValue: false }),
        docker: booleanArgument({ defaultValue: false }), // Runs tests in an environment very similar to the CI.
        remoteDebuggingPort: z.optional(z.coerce.number().int()), // Connect with `chrome://inspect` in your browser.
    }).strict(),
}).parse(process.argv.slice(2))

if (options.docker) {
    const argsWithoutDocker = process.argv.slice(2).filter(arg => !/--docker($|=)/.test(arg))
    const exitCode = await runE2eTestsDocker(argsWithoutDocker)
    process.exit(exitCode)
}

const testFiles = globSync(options.test)

if (testFiles.length === 0) {
    console.error(`No test files found for ${options.test}`)
    process.exit(1)
}

const testFileIds = testFiles.map(file => /test\/(.+)\.test\.ts/.exec(file)![1] as TestFileId)

if (options.headless) {
    // Start display subsystem to browser can run
    void execa('Xvfb', [':10', '-ac'])
    process.env.DISPLAY = ':10'
    void execa('bash', ['-c', 'fluxbox >/dev/null 2>&1'])
}

if (options.proxy) {
    await startProxy()
}

const testcafe = await createTestCafe('localhost', ...testCafePorts())

const testHistory: TestHistory = []

const gh = process.env.GITHUB_ACTIONS ? await github() : undefined

for (const testFileId of testFileIds) {
    const numTries = options.tries * (await testFileDidChange(testFileId) ? 1 : 2)
    let retries = 0
    let result: TestResult | undefined

    retry: while (true) {
        if (gh) {
            console.warn(`::group::${testFilePath(testFileId)} attempt ${retries + 1}`)
        }
        console.warn(chalkTemplate`{cyan ${testFilePath(testFileId)} attempt ${(retries + 1)} running...}`)
        result = await runTestFile(testFileId, testCaseName =>
            result?.status === 'failure' && result.failedTestNames !== null ? result.failedTestNames.includes(testCaseName) : true,
        )
        printResult({ testFileId, result, retries })
        switch (result.status) {
            case 'success':
                break retry
            case 'timeout':
            case 'failure':
                if (retries + 1 === numTries) {
                    console.error(chalkTemplate`{red ${testFilePath(testFileId)} Out of retries}`)
                    break retry
                }
                console.warn(chalkTemplate`{red ${testFilePath(testFileId)} failed... trying again}`)
                if (gh) {
                    console.warn(`::endgroup::`)
                }
                retries++
        }
    }

    if (gh) {
        console.warn(`::endgroup::`)
        console.warn(result.status === 'success' ? '✅' : '❌')
    }

    testHistory.push({
        testFileId,
        result,
        retries,
        github: gh && {
            jobId: gh.currentJobId(),
            stepNumber: await gh.currentStepNumber(),
        },
    })
}

testHistory.forEach(printResult)

await fs.mkdir('test_histories', { recursive: true })
await fs.writeFile(`test_histories/${process.env.GITHUB_ACTIONS ? crypto.randomUUID() : 'history'}.json`, JSON.stringify(testHistory))

if (testHistory.some(({ result }) => result.status !== 'success')) {
    process.exit(1)
}

process.exit(0) // Needed to clean up subprocesses

function printResult({ testFileId, result, retries }: { testFileId: TestFileId, result: TestResult, retries: number }): void {
    switch (result.status) {
        case 'success':
            console.warn(chalkTemplate`{green.bold ${testFilePath(testFileId)} succeeded (${retries} retries)}`)
            break
        case 'failure':
            console.warn(chalkTemplate`{red.bold ${testFilePath(testFileId)} failed (${retries} retries)}`)
            break
        case 'timeout':
            console.error(chalkTemplate`{red ${testFilePath(testFileId)} took too long! (allowed duration ${result.timeLimitSeconds}s) (${retries} retries)}`)
            break
    }
}

async function testFileDidChange(testFileId: TestFileId): Promise<boolean> {
    if (options.baseRef === undefined) {
        // No baseRef defined, we're running on local, and don't want to retry there
        return true
    }
    if (options.baseRef === '') {
        // We're running on CI with an unspecified base ref, we do want to retry there
        return false
    }
    return await execa('git', ['diff', '--exit-code', `origin/${options.baseRef}`, '--', testFilePath(testFileId)], { reject: false }).then(({ exitCode }) => {
        if (exitCode === 0 || exitCode === 1) {
            return exitCode === 1
        }
        else {
            throw new Error(`Unexpected exit code ${exitCode}`)
        }
    })
}

async function runTestFile(testFileId: TestFileId, filter: (testName: TestCaseName) => boolean): Promise<TestResult> {
    let runner = testcafe[options.live ? 'createLiveModeRunner' : 'createRunner']()
        .src(testFilePath(testFileId))
        // Refs https://source.chromium.org/chromium/chromium/src/+/main:content/web_test/browser/web_test_browser_main_runner.cc;l=295
        .browsers([`chrome:${options.browser}${options.remoteDebuggingPort ? `:cdpPort=${options.remoteDebuggingPort}` : ''} ${[
            '--window-size=1400,800',
            '--hide-scrollbars',
            '--disable-search-engine-choice-screen',
            '--disable-skia-runtime-opts',
            '--disable-renderer-backgrounding',
            '--disable-features=LocalNetworkAccessChecks',
            ...(options.remoteDebuggingPort ? [`--remote-debugging-port=${options.remoteDebuggingPort}`] : []),
        ].join(' ')}`])
        // Explicitly interpolate test here so we don't add the error to the directory
        // Pattern is only used for take on fail, we make our own pattern otherwise
        .screenshots(`screenshots/${testFileId}`, true, errorPattern)
        .filter(testCaseName => filter(testCaseName as TestCaseName))

    // Capture JSON report to identify which individual test cases failed
    let jsonData = ''
    const jsonWriter = new Writable({
        write(chunk: Buffer, _encoding: string, callback: () => void) {
            jsonData += chunk.toString()
            callback()
        },
    })
    runner = runner.reporter(['spec', { name: 'json', output: jsonWriter }])

    if (options.video) {
        runner = runner.video(`videos/${testFileId}`, {
            pathPattern: '${BROWSER}/${TEST}.mp4',
        })
    }

    await clearScreenshots(testFileId, filter)

    // Reset TOTP wait
    await setTOTPWait(testFileId, 0)

    const runningTests = (async () => {
        const start = Date.now()
        const failed = await runner.run({
            assertionTimeout: 5000,
            selectorTimeout: 5000,
            disableMultipleWindows: true,
        })
        return { status: failed === 0 ? 'success' as const : 'failure' as const, duration: Date.now() - start }
    })()

    const timeLimitSeconds = options.live ? 1_000_000 : (options.timeLimitSeconds ?? 10_000) * (await testFileDidChange(testFileId) ? 1 : 2)

    const rawResult = await withTimeout(runningTests, async () => timeLimitSeconds + await getTOTPWait(testFileId))

    if (rawResult.status === 'timeout') {
        return { status: 'timeout', timeLimitSeconds }
    }

    // Parse which test cases failed from the JSON report so we can retry only those
    const reportSchema = z.string()
        .transform((s): unknown => JSON.parse(s))
        .pipe(z.object({
            fixtures: z.array(z.object({
                tests: z.array(z.object({
                    name: z.string(),
                    errs: z.array(z.unknown()),
                    skipped: z.boolean(),
                })),
            })),
        }))
    const report = reportSchema.parse(jsonData)
    const testcafeFailures = report.fixtures.flatMap(f =>
        f.tests.filter(t => t.errs.length > 0 && !t.skipped).map(t => t.name),
    )

    // When testcafe failed some tests, only compare screenshots for the tests that passed —
    // the failing tests will be retried anyway, and their screenshots aren't meaningful yet.
    const compareFilter = rawResult.status === 'failure'
        ? (name: TestCaseName): boolean => filter(name) && !testcafeFailures.includes(name)
        : filter

    let screenshotFailures = new Set<string>()
    if (options.compare) {
        // Remove on-fail error screenshots before comparing (they have no reference counterparts)
        await Promise.all(globSync(`screenshots/${testFileId}/**/*.error.png`, { nodir: true }).map(file => fs.rm(file)))
        screenshotFailures = await compareScreenshots(testFileId, compareFilter)
    }

    const allFailed = [...testcafeFailures, ...screenshotFailures]
    if (rawResult.status === 'failure' || allFailed.length > 0) {
        return { status: 'failure', duration: rawResult.duration, failedTestNames: allFailed }
    }
    return { status: 'success', duration: rawResult.duration }
}

async function withTimeout<T>(promise: Promise<T>, getTimeoutSeconds: () => Promise<number>): Promise<T | { status: 'timeout' }> {
    const timeoutPromise = (async () => {
        let waited = 0
        let timeout
        while ((timeout = (await getTimeoutSeconds()) * 1000) > waited) {
            const toWait = timeout - waited
            await new Promise(resolve => setTimeout(resolve, toWait))
            waited += toWait
        }
        return { status: 'timeout' as const }
    })()
    return await Promise.race([promise, timeoutPromise])
}

async function clearScreenshots(testFileId: string, testCaseFilter: (testCaseName: TestCaseName) => boolean): Promise<void> {
    const files = globSync(`{screenshots,delta,changed_screenshots}/${testFileId}/**`, { nodir: true })
    await Promise.all(
        files
            .filter(f => testCaseFilter(testCaseNameFromFile(f)))
            .map(f => fs.rm(f)),
    )
}
