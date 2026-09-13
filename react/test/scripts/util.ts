import assert from 'assert'
import fs from 'fs/promises'
import path from 'path'

import chalkTemplate from 'chalk-template'
import { globSync } from 'glob'
import { z } from 'zod'

export function booleanArgument({ defaultValue }: { defaultValue: boolean }): typeof result {
    const result = z.optional(z.union([
        z.literal('true').transform(() => true),
        z.literal('false').transform(() => false),
        z.null().transform(() => true),
    ])).default(defaultValue ? 'true' : 'false')
    return result
}

export async function getTOTPWait(testName: string): Promise<number> {
    try {
        return z.number().parse(JSON.parse(await fs.readFile(`totp_wait_time/${testName}.json`, 'utf-8')))
    }
    catch {
        return 0
    }
}

export async function setTOTPWait(testName: string, newValue: number): Promise<void> {
    await fs.mkdir('totp_wait_time', { recursive: true })
    await fs.writeFile(`totp_wait_time/${testName}.json`, JSON.stringify(newValue))
}

export const repoInfo = {
    owner: 'kavigupta',
    // eslint-disable-next-line no-restricted-syntax -- Repo identifier not branding
    repo: 'urbanstats',
}

export const testHistorySchema = z.array(z.object({
    test: z.string(),
    result: z.discriminatedUnion('status', [
        z.object({ status: z.literal('timeout'), timeLimitSeconds: z.number() }),
        z.object({ status: z.literal('success'), duration: z.number() }),
        z.object({ status: z.literal('failure'), duration: z.number(), reason: z.enum(['assertions', 'assets']) }),
    ]),
    retries: z.number(),
    github: z.optional(z.object({
        jobId: z.number(),
        stepNumber: z.number(),
    })),
}))

export type TestHistory = z.infer<typeof testHistorySchema>

export type TestResult = TestHistory[number]['result']

export async function loadAndMergeTestHistories(): Promise<TestHistory> {
    const historiesFiles = globSync('test_histories/*.json')

    const processedTests = new Set<string>()

    const rawResult = await Promise.all(historiesFiles.map(async (historyFile) => {
        const history = testHistorySchema.parse(JSON.parse(await fs.readFile(historyFile, 'utf-8')))
        for (const result of history) {
            assert(!processedTests.has(result.test), 'Duplicate test histories!')
            processedTests.add(result.test)
        }
        return history
    }))

    return rawResult.flat()
}

export function testFile(test: string): string {
    return `test/${test}.test.ts`
}

export function testsFromGlobs(globs: string[]): string[] {
    const testFiles = globSync(globs)
    if (testFiles.length === 0) {
        console.error(`No test files found for ${globs.join(', ')}`)
        process.exit(1)
    }
    return testFiles.map(file => /test\/(.+)\.test\.ts/.exec(file)![1])
}

const changedAssetsManifest = 'manifest.json'

/** Paths relative to the test's directory, so they resolve against the reference and delta trees too. */
export function changedAssets(test: string): string[] {
    return globSync(`changed_assets/${test}/**`, { nodir: true })
        .map(file => path.relative(`changed_assets/${test}`, file))
        .filter(file => file !== changedAssetsManifest && !file.endsWith('.error.png'))
}

/** The asset diff viewer's index of a local run, since it can't list the directories itself. */
export async function writeChangedAssetsManifest(test: string): Promise<void> {
    const changed = changedAssets(test)
    if (changed.length === 0) {
        return
    }
    const delta = globSync(`delta/${test}/**`, { nodir: true }).map(file => path.relative(`delta/${test}`, file))
    await fs.writeFile(path.join('changed_assets', test, changedAssetsManifest), JSON.stringify({ changed, delta }))
}

export async function updateReferences(test: string): Promise<void> {
    const changed = changedAssets(test)
    await Promise.all(changed.map(async (file) => {
        const destination = path.join('..', 'reference_test_assets', test, file)
        await fs.mkdir(path.dirname(destination), { recursive: true })
        await fs.copyFile(path.join('changed_assets', test, file), destination)
    }))
    // The deltas are against references that no longer exist, so leaving them would only mislead.
    await Promise.all([`changed_assets/${test}`, `delta/${test}`].map(dir => fs.rm(dir, { recursive: true, force: true })))
    console.warn(chalkTemplate`{green ${testFile(test)} updated ${changed.length} reference assets}`)
}
