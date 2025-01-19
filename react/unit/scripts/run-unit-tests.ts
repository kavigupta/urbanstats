import os from 'node:os'

import { globSync } from 'glob'
import { z } from 'zod'
import { argumentParser } from 'zodcli'

import { startProxy } from '../../test/scripts/ci_proxy'
import { booleanArgument } from '../../test/scripts/util'

declare global {
    /* eslint-disable no-restricted-syntax,no-var -- Global variables */
    var UVU_DEFER: boolean
    var UVU_INDEX: number
    var UVU_QUEUE: ([string] | [string, () => Promise<[true | string, number, number, number]>])[]
    /* eslint-enable no-restricted-syntax,no-var */
}

async function main(): Promise<void> {
    globalThis.UVU_DEFER = true
    globalThis.UVU_INDEX = 0
    await import('uvu')

    const options = argumentParser({
        options: z.object({
            proxy: booleanArgument({ defaultValue: false }),
            test: z.array(z.string()).default(['unit/*.test.ts']),
            parallel: z.string().transform(string => parseInt(string)).default(os.cpus().length.toString()),
        }).strict(),
    }).parse(process.argv.slice(2))

    const testFiles = globSync(options.test)

    if (testFiles.length === 0) {
        console.error(`No test files found for ${options.test}`)
        process.exit(1)
    }

    console.warn(`Using --parallel=${options.parallel}`)

    const tests = testFiles.map(file => /unit\/(.+)\.ts/.exec(file)![1])

    if (options.proxy) {
        await startProxy()
    }

    for (const test of tests) {
        globalThis.UVU_QUEUE.push([test])
        await import(`../${test}.ts`)
        globalThis.UVU_INDEX++
    }

    const runTest = async (): Promise<number> => {
        const item = globalThis.UVU_QUEUE.shift()
        if (item === undefined) {
            return Promise.resolve(0)
        }

        const [testName, runner] = item

        let failedTests: number
        try {
            const [errors] = await runner!()
            process.stdout.write(`Ran ${testName}.ts\n`)
            if (errors !== true) {
                failedTests = 1
                process.stdout.write(errors)
            }
            else {
                failedTests = 0
                process.stdout.write('    Success\n\n')
            }
        }
        catch (error) {
            console.error(error)
            failedTests = 1
        }

        return failedTests + await runTest()
    }

    const testsFailed = (await Promise.all(Array.from({ length: options.parallel }).map(runTest))).reduce((a, n) => a + n, 0)

    if (testsFailed > 0) {
        process.exit(1)
    }

    process.exit(0) // Needed to clean up subprocesses
}

void main()
