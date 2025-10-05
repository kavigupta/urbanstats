import fs from 'fs/promises'

import chalkTemplate from 'chalk-template'
import { execa } from 'execa'
import { globSync } from 'glob'
import createTestCafe from 'testcafe'
import { z } from 'zod'
import { argumentParser } from 'zodcli'

import { startProxy } from './ci_proxy'
import { booleanArgument, getTOTPWait, setTOTPWait } from './util'

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
    }).strict(),
}).parse(process.argv.slice(2))

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

// For debugging behavior differences
await execa('lscpu', { reject: false, stdio: 'inherit' })

if (options.proxy) {
    await startProxy()
}

const testcafe = await createTestCafe('localhost', 1337, 1338)

// Run tests

let testsFailed = 0

for (const test of tests) {
    console.warn(chalkTemplate`{cyan ${testFile(test)} running...}`)

    let tries = options.tries * (await testFileDidChange(test) ? 1 : 2)
    let success: boolean

    retry: while (true) {
        tries--
        const result = await runTest(test)
        switch (result.status) {
            case 'success':
                await fs.mkdir('durations', { recursive: true })
                await fs.writeFile(`durations/${test}.json`, JSON.stringify(result.duration))
                success = true
                break retry
            case 'timeout':
            case 'failure':
                if (result.status === 'timeout') {
                    console.error(chalkTemplate`{red Test suite took too long! (allowed duration ${result.timeLimitSeconds}s)}`)
                }
                if (tries === 0) {
                    success = false
                    break retry
                }
        }

        console.warn(chalkTemplate`{red ${testFile(test)} failed... trying again}`)
    }

    if (success) {
        console.warn(chalkTemplate`{green.bold ${testFile(test)} succeeded}`)
    }
    else {
        console.warn(chalkTemplate`{red.bold ${testFile(test)} failed}`)
        testsFailed++
    }
}

if (testsFailed > 0) {
    process.exit(1)
}

process.exit(0) // Needed to clean up subprocesses

function testFile(test: string): string {
    return `test/${test}.test.ts`
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

async function runTest(test: string): Promise<{ status: 'timeout', timeLimitSeconds: number } | { status: 'success' | 'failure', duration: number }> {
    let runner = testcafe.createRunner()
        .src(testFile(test))
        // Refs https://source.chromium.org/chromium/chromium/src/+/main:content/web_test/browser/web_test_browser_main_runner.cc;l=295
        .browsers([`${options.browser} --window-size=1400,800 --hide-scrollbars --disable-search-engine-choice-screen --disable-skia-runtime-opts --disable-renderer-backgrounding`])
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

    const timeLimitSeconds = options.timeLimitSeconds === undefined ? 10_000 : options.timeLimitSeconds * (await testFileDidChange(test) ? 1 : 2)

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
