import fs from 'fs'

import { execa } from 'execa'
import { globSync } from 'glob'
import { Model, Var } from 'lp-model'
import { z } from 'zod'
import { argumentParser } from 'zodcli'

import { DefaultMap } from '../../src/utils/DefaultMap'

/**
 * Urban Stats contains a large number of end-to-end (e2e) tests with varying execution times, which are run in parallel within the CI pipeline.
 * Each test incurs a significant startup overhead, and available CI resources (e.g., GitHub free tier) are limited.
 * We record the last successful pipeline run on main to get estimates for the duration of each e2e test.
 * To optimize resource usage, shorter tests can be grouped to run sequentially on the same runner, as the overall pipeline duration is determined by the longest-running jobs.
 * This scenario is an instance of the bin packing problem.
 * While a simple heuristic using nested loops can provide a near-optimal solution, a provably optimal solution can be obtained using linear programming (LP).
 * Due to the scale of the problem (approximately 2000 variables), the HiGHS LP solver is required for efficient computation.
 * This approach has reduced the number of jobs in the pipeline from 55 to 35.
 */

// This is a command line tool, we take in the test durations via JSON passed to a CLI flag
const options = argumentParser({
    options: z.object({
        testDurations: z.string(),
    }).strict(),
}).parse(process.argv.slice(2))

// All the tests that might run
const tests = globSync('test/**/*.test.ts').map(testFile => /([^/]+)\.test\.ts$/.exec(testFile)![1])

// Durations might be empty (running on a fork), so we should handle that and assume it's empty
const testDurations = z.record(z.number()).parse(JSON.parse(options.testDurations === '' ? '{}' : options.testDurations))

// sort from largest to smallest
const knownTests = tests.filter(test => test in testDurations).sort((a, b) => {
    return testDurations[b] - testDurations[a]
})

// For tests where we don't know their durations, we'll give them their own jobs at the end
const unknownTests = tests.filter(test => !(test in testDurations))

const model = new Model()

// variables

// Represents whether a test is in a job
// There can be up to ||tests|| jobs, since each job must have at least one test
const testInJob: Record<string, Var> = {}

for (let t = 0; t < knownTests.length; t++) {
    for (let job = 0; job < knownTests.length; job++) {
        testInJob[`${t}_${job}`] = model.addVar({ vtype: 'BINARY' })
    }
}

// Represents wheter a job is used
const jobUsed: Record<number, Var> = {}

for (let job = 0; job < knownTests.length; job++) {
    jobUsed[job] = model.addVar({ vtype: 'BINARY' })
}

// constraints

// Each test must be in exactly one job
// equivalent to:  `for t in tests, sum(x[t, job] for job in jobs) == 1`
for (let t = 0; t < knownTests.length; t++) {
    const constr: Var[] = []
    for (let job = 0; job < knownTests.length; job++) {
        constr.push(testInJob[`${t}_${job}`])
    }
    model.addConstr(constr, '==', 1)
}

// The longest we want a job to be
const durationLimit = 10 * 60 * 1000

// If a test is in a job, that job must be used
// Also, the tests in a job should not exceed how long we want jobs to be
// equivalent to: `for job in jobs, sum(x[t, job] * duration[t] for t in tests) <= duration_limit * job_used[job]`
for (let job = 0; job < knownTests.length; job++) {
    const constr: [number, Var][] = []
    for (let t = 0; t < knownTests.length; t++) {
        // If a duration is longer than the limit (which sometimes happens), the LP won't be solvable, so clamp it
        constr.push([Math.min(testDurations[knownTests[t]], durationLimit), testInJob[`${t}_${job}`]])
    }
    model.addConstr(constr, '<=', [[durationLimit, jobUsed[job]]])
}

// objective

// We want to minimize the number of jobs used
// min(sum(job_used[job] for job in jobs))
const obj = []
for (let job = 0; job < knownTests.length; job++) {
    obj.push(jobUsed[job])
}
model.setObjective(obj, 'MINIMIZE')

fs.writeFileSync('test/scripts/lp.lp', model.toLPFormat())

// The highs integration that came with the library wasn't working
// So, we execute a vendored in highs executable, and parse in the solution, assigning the variables back
await execa(
    `test/scripts/vendor/${process.platform}/highs`,
    [
        'test/scripts/lp.lp',
        '--solution_file', 'test/scripts/solution',
        '--time_limit', '60',
    ],
    { stderr: process.stderr, stdout: process.stderr },
)

fs.readFileSync('test/scripts/solution', 'utf-8')
    .split('\n')
    .filter(line => line.startsWith('Var'))
    .map(line => line.split(' '))
    .forEach(([name, value]) => model.variables.get(name)!.value = parseInt(value))

// Here we aassemble the assigned tests into their jobs
const jobs = new DefaultMap<number, string[]>(() => [])

for (let t = 0; t < knownTests.length; t++) {
    for (let job = 0; job < knownTests.length; job++) {
        if (testInJob[`${t}_${job}`].value === 1) {
            jobs.get(job).push(knownTests[t])
        }
    }
}

process.stdout.write(JSON.stringify(Array.from(jobs.values())
    .map(jobTests => jobTests.length > 1 ? `{${jobTests.join(',')}}` : jobTests[0])
    .concat(unknownTests)))
