import { globSync } from 'glob'
import { z } from 'zod'
import { argumentParser } from 'zodcli'

const options = argumentParser({
    options: z.object({
        testDurations: z.string(),
    }).strict(),
}).parse(process.argv.slice(2))

const tests = globSync('test/**/*.test.ts').map(testFile => /([^/]+)\.test\.ts$/.exec(testFile)![1]).sort()

const testDurations = z.record(z.number()).parse(JSON.parse(options.testDurations === '' ? '{}' : options.testDurations))
const groupings: { tests: string[], duration: number }[] = []
const durationLimit = 4.5 * 60 * 1000

/**
 * For known tests, fill up 4.5 minute buckets
 * For unknown tests, just append them
 */

const leftovers: string[] = []

tests: for (const test of tests) {
    if (test in testDurations) {
        const duration = testDurations[test]
        for (const grouping of groupings) {
            if (grouping.duration + duration < durationLimit) {
                grouping.tests.push(test)
                grouping.duration += duration
                continue tests
            }
        }
        // If no grouping found
        groupings.push({
            tests: [test],
            duration,
        })
    }
    else {
        leftovers.push(test)
    }
}

process.stdout.write(JSON.stringify(groupings.map(g => `{${g.tests.join(',')}}`).concat(leftovers)))
