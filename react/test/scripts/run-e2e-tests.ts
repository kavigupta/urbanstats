import fs from 'fs/promises'

import chalkTemplate from 'chalk-template'
import { execa } from 'execa'
import { globSync } from 'glob'
import createTestCafe from 'testcafe'
import { z } from 'zod'
import { argumentParser } from 'zodcli'

import { startProxy } from './ci_proxy'
import { booleanArgument } from './util'

const options = argumentParser({
    options: z.object({
        proxy: booleanArgument({ defaultValue: false }),
        browser: z.union([z.literal('chrome'), z.literal('chromium')]).default('chrome'),
        test: z.array(z.string()).default(() => { throw new Error(`Missing --test=<glob> argument. E.g. npm run test:e2e -- --test='test/*.test.ts'`) }),
        parallel: z.string().transform(string => parseInt(string)).default('1'),
        headless: booleanArgument({ defaultValue: true }),
        video: booleanArgument({ defaultValue: false }),
        compare: booleanArgument({ defaultValue: false }),
        timeLimitSeconds: z.optional(z.coerce.number().int()),
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

if (options.proxy) {
    startProxy()
}

const testcafe = await createTestCafe('localhost', 1337, 1338)

// Remove artifacts for tests
const testsPattern = tests.length === 1 ? tests[0] : `{${tests.join(',')}}`
await Promise.all(globSync(`{screenshots,delta,videos,changed_screenshots}/${testsPattern}/**`, { nodir: true }).map(file => fs.rm(file)))

const testsToRun = [...tests]

const runTest = async (): Promise<number> => {
    const test = testsToRun.shift()

    if (test === undefined) {
        return Promise.resolve(0)
    }

    let runner = testcafe.createRunner()
        .src(`test/${test}.test.ts`)
        .browsers([`${options.browser} --window-size=1400,800 --hide-scrollbars --disable-search-engine-choice-screen`])
        .screenshots(`screenshots/${test}`)

    if (options.video) {
        runner = runner.video(`videos/${test}`, {
            pathPattern: '${BROWSER}/${TEST}.mp4',
        })
    }

    const failedTests = await runner.run({ assertionTimeout: options.proxy ? 5000 : 3000, disableMultipleWindows: true })

    return failedTests + await runTest()
}

const killTimer = options.timeLimitSeconds
    ? setTimeout(() => {
        console.error(chalkTemplate`{red.bold Test suite took too long! Killing tests. (allowed duration ${options.timeLimitSeconds}s)}`)
        process.exit(1)
    }, options.timeLimitSeconds * 1000)
    : undefined

const testsFailed = (await Promise.all(Array.from({ length: options.parallel }).map(runTest))).reduce((a, n) => a + n, 0)

clearTimeout(killTimer)

if (options.compare) {
    const comparisonResults = await Promise.all(tests.map(test => execa('python', ['tests/check_images.py', `--test=${test}`], {
        cwd: '..',
        stdio: 'inherit',
        reject: false,
    })))

    if (comparisonResults.some(result => result.failed)) {
        process.exit(1)
    }
}

if (testsFailed > 0) {
    process.exit(1)
}

process.exit(0) // Needed to clean up subprocesses
