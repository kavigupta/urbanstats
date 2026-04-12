import fs from 'fs/promises'

import chalkTemplate from 'chalk-template'
import { execa } from 'execa'
import { globSync } from 'glob'
import createTestCafe from 'testcafe'
import { z } from 'zod'
import { argumentParser } from 'zodcli'

import { startProxy } from './ci_proxy'
import { github } from './github-utils'
import { runE2eTestsDocker } from './run-e2e-tests-docker'
import { booleanArgument, getTOTPWait, setTOTPWait, testFile, TestHistory, TestResult } from './util'

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
        docker: booleanArgument({ defaultValue: false }),
    }).strict(),
}).parse(process.argv.slice(2))

if (options.docker) {
    const argsWithoutDocker = process.argv.slice(2).filter(arg => arg !== '--docker' && arg !== '--docker=true')
    const exitCode = await runE2eTestsDocker(argsWithoutDocker)
    process.exit(exitCode)
}

const testFiles = globSync(options.test)

if (testFiles.length === 0) {
    console.error(`No test files found for ${options.test}`)
    process.exit(1)
}

const tests = testFiles.map(file => /test\/(.+)\.test\.ts/.exec(file)![1])

if (options.headless) {
    // Start display subsystem to browser can run
    void execa('Xvfb', [':10', '-ac'])
    process.env.DISPLAY = ':10'
    void execa('bash', ['-c', 'fluxbox >/dev/null 2>&1'])
}

if (options.proxy) {
    await startProxy()
}

const testcafe = await createTestCafe('localhost', 1337, 1338)

const testHistory: TestHistory = []

const gh = process.env.GITHUB_ACTIONS ? await github() : undefined

for (const test of tests) {
    const numTries = options.tries * (await testFileDidChange(test) ? 1 : 2)
    let retries = 0
    let result: TestResult

    retry: while (true) {
        if (gh) {
            console.warn(`::group::${testFile(test)} attempt ${retries + 1}`)
        }
        console.warn(chalkTemplate`{cyan ${testFile(test)} attempt ${(retries + 1)} running...}`)
        result = await runTest(test)
        printResult({ test, result, retries })
        switch (result.status) {
            case 'success':
                break retry
            case 'timeout':
            case 'failure':
                if (retries + 1 === numTries) {
                    console.error(chalkTemplate`{red ${testFile(test)} Out of retries}`)
                    break retry
                }
                console.warn(chalkTemplate`{red ${testFile(test)} failed... trying again}`)
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
        test,
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

function printResult({ test, result, retries }: { test: string, result: TestResult, retries: number }): void {
    switch (result.status) {
        case 'success':
            console.warn(chalkTemplate`{green.bold ${testFile(test)} succeeded (${retries} retries)}`)
            break
        case 'failure':
            console.warn(chalkTemplate`{red.bold ${testFile(test)} failed (${retries} retries)}`)
            break
        case 'timeout':
            console.error(chalkTemplate`{red ${testFile(test)} took too long! (allowed duration ${result.timeLimitSeconds}s) (${retries} retries)}`)
            break
    }
}

async function testFileDidChange(test: string): Promise<boolean> {
    if (options.baseRef === undefined) {
        // No baseRef defined, we're running on local, and don't want to retry there
        return true
    }
    if (options.baseRef === '') {
        // We're running on CI with an unspecified base ref, we do want to retry there
        return false
    }
    return await execa('git', ['diff', '--exit-code', `origin/${options.baseRef}`, '--', testFile(test)], { reject: false }).then(({ exitCode }) => {
        if (exitCode === 0 || exitCode === 1) {
            return exitCode === 1
        }
        else {
            throw new Error(`Unexpected exit code ${exitCode}`)
        }
    })
}

async function runTest(test: string): Promise<TestResult> {
    let runner = testcafe[options.live ? 'createLiveModeRunner' : 'createRunner']()
        .src(testFile(test))
        // Refs https://source.chromium.org/chromium/chromium/src/+/main:content/web_test/browser/web_test_browser_main_runner.cc;l=295
        .browsers([`${options.browser} --window-size=1400,800 --hide-scrollbars --disable-search-engine-choice-screen --disable-skia-runtime-opts --disable-renderer-backgrounding --disable-features=LocalNetworkAccessChecks`])
        // Explicitly interpolate test here so we don't add the error to the directory
        // Pattern is only used for take on fail, we make our own pattern otherwise
        .screenshots(`screenshots/${test}`, true, `\${BROWSER}/\${TEST}.error.png`)

    if (options.video) {
        runner = runner.video(`videos/${test}`, {
            pathPattern: '${BROWSER}/${TEST}.mp4',
        })
    }

    // Remove artifacts for test
    await Promise.all(globSync(`{screenshots,delta,videos,changed_screenshots}/${test}/**`, { nodir: true }).map(file => fs.rm(file)))

    // Reset TOTP wait
    await setTOTPWait(test, 0)

    const runningTests = (async () => {
        const start = Date.now()
        const failed = await runner.run({
            assertionTimeout: 5000,
            selectorTimeout: 5000,
            disableMultipleWindows: true,
        })
        return { status: failed === 0 ? 'success' as const : 'failure' as const, duration: Date.now() - start }
    })()

    const timeLimitSeconds = options.live ? 1_000_000 : (options.timeLimitSeconds ?? 10_000) * (await testFileDidChange(test) ? 1 : 2)

    const result = await withTimeout(runningTests, async () => timeLimitSeconds + await getTOTPWait(test))

    const comparisonResult = await maybeCompare(test, result.status === 'success')

    if (result.status === 'success' && !comparisonResult) {
        return { ...result, status: 'failure' }
    }

    if (result.status === 'timeout') {
        return { ...result, timeLimitSeconds }
    }

    return result
}

async function maybeCompare(test: string, success: boolean): Promise<boolean> {
    if (options.compare) {
        // If there were no failures, delete any generated .error.png so they don't set off the comparison
        if (success) {
            await Promise.all(globSync(`screenshots/${test}/**/*.error.png`, { nodir: true }).map(file => fs.rm(file)))
        }

        const screenshotComparison = await execa('python', ['tests/check_images.py', `--test=${test}`], {
            cwd: '..',
            stdio: 'inherit',
            reject: false,
        })

        if (screenshotComparison.failed) {
            return false
        }
    }

    return true
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
