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
        baseRef: z.optional(z.string()).default(''), // Since empty string if absent on cli
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
        // Explicitly interpolate test here so we don't add the error to the directory
        // Pattern is only used for take on fail, we make our own pattern otherwise
        .screenshots(`screenshots/${test}`, true, `\${BROWSER}/\${TEST}.error.png`)

    if (options.video) {
        runner = runner.video(`videos/${test}`, {
            pathPattern: '${BROWSER}/${TEST}.mp4',
        })
    }

    const testFileDidChange = options.baseRef !== ''
        ? await execa('git', ['diff', '--exit-code', `origin/${options.baseRef}`, '--', testFile], { reject: false }).then(({ exitCode }) => {
            if (exitCode === 0 || exitCode === 1) {
                return exitCode === 1
            }
            else {
                throw new Error(`Unexpected exit code ${exitCode}`)
            }
        })
        : false

    await setTOTPWait(test, 0)

    let killInterval: NodeJS.Timeout | undefined
    if (options.timeLimitSeconds !== undefined) {
        const timeLimitSeconds = options.timeLimitSeconds * (testFileDidChange ? 1 : 2)
        const killAfter = Date.now() + (timeLimitSeconds * 1000)
        killInterval = setInterval(async () => {
            if (Date.now() > killAfter + await getTOTPWait(test)) {
                console.error(chalkTemplate`{red.bold Test suite took too long! Killing tests. (allowed duration ${timeLimitSeconds}s)}`)
                clearInterval(killInterval)
                await doComparisons()
                process.exit(1)
            }
        }, 1000)
    }

    console.warn(chalkTemplate`{cyan ${testFile} running...}`)

    const start = Date.now()

    const failedThisTest = await runner.run({
        assertionTimeout: 5000,
        selectorTimeout: 5000,
        disableMultipleWindows: true,
    })
    testsFailed += failedThisTest

    const duration = Date.now() - start

    console.warn(chalkTemplate`{cyan ${testFile} done}`)

    clearInterval(killInterval)

    await fs.mkdir('durations', { recursive: true })
    await fs.writeFile(`durations/${test}.json`, JSON.stringify(duration))

    // If there were no failures, delete any generated .error.png so they don't set off the comparison
    if (failedThisTest === 0) {
        await Promise.all(globSync(`screenshots/${test}/**/*.error.png`, { nodir: true }).map(file => fs.rm(file)))
    }
}

await doComparisons()

if (testsFailed > 0) {
    process.exit(1)
}

process.exit(0) // Needed to clean up subprocesses

async function doComparisons(): Promise<void> {
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
}
