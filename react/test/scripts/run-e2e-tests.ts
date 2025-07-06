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
        headless: booleanArgument({ defaultValue: true }),
        video: booleanArgument({ defaultValue: false }),
        compare: booleanArgument({ defaultValue: false }),
        timeLimitSeconds: z.optional(z.coerce.number().int()), // Enforced at 1x if the test file has changed compared to `baseRef`. Otherwise, enforced at 2x
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

if (options.proxy) {
    startProxy()
}

const testcafe = await createTestCafe('localhost', 1337, 1338)

// Remove artifacts for tests
const testsPattern = tests.length === 1 ? tests[0] : `{${tests.join(',')}}`
await Promise.all(globSync(`{screenshots,delta,videos,changed_screenshots}/${testsPattern}/**`, { nodir: true }).map(file => fs.rm(file)))

// Run tests

let testsFailed = 0

for (const test of tests) {
    const testFile = `test/${test}.test.ts`
    let runner = testcafe.createRunner()
        .src(testFile)
        .browsers([`${options.browser} --window-size=1400,800 --hide-scrollbars --disable-search-engine-choice-screen`])
        .screenshots(`screenshots/${test}`)

    if (options.video) {
        runner = runner.video(`videos/${test}`, {
            pathPattern: '${BROWSER}/${TEST}.mp4',
        })
    }

    const start = Date.now()

    const testFileDidChange = options.baseRef
        ? await execa('git', ['diff', '--exit-code', options.baseRef, '--', testFile], { reject: false }).then(({ exitCode }) => {
            if (exitCode === 0 || exitCode === 1) {
                return exitCode === 1
            }
            else {
                throw new Error(`Unexpected exit code ${exitCode}`)
            }
        })
        : false

    const killTimer = options.timeLimitSeconds
        ? setTimeout(() => {
            console.error(chalkTemplate`{red.bold Test suite took too long! Killing tests. (allowed duration ${options.timeLimitSeconds}s)}`)
            process.exit(1)
        }, options.timeLimitSeconds * (testFileDidChange ? 1 : 2) * 1000)
        : undefined

    testsFailed += await runner.run({ assertionTimeout: options.proxy ? 5000 : 3000, disableMultipleWindows: true })

    const duration = Date.now() - start

    clearTimeout(killTimer)

    await fs.mkdir('durations', { recursive: true })
    await fs.writeFile(`durations/${test}.json`, JSON.stringify(duration))
}

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
