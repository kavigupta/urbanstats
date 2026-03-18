import assert from 'assert'
import fs from 'fs/promises'

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
        z.object({ status: z.enum(['success', 'failure']), duration: z.number() }),
    ]),
    retries: z.number(),
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
