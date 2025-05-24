import os from 'node:os'
import { run } from 'node:test'
import { spec } from 'node:test/reporters'

import { globSync } from 'glob'
import { z } from 'zod'
import { argumentParser } from 'zodcli'

import { startProxy } from '../../test/scripts/ci_proxy'
import { booleanArgument } from '../../test/scripts/util'

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

if (options.proxy) {
    startProxy()
}

const testStream = run({
    files: testFiles,
    concurrency: options.parallel,
})

testStream.compose(spec).pipe(process.stdout)

testStream.on('test:summary', (event) => {
    if (!event.success) {
        process.exitCode = 1
    }
})
