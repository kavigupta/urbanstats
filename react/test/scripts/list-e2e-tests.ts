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

/*
 * The e2e phase takes as long as its longest job, so the job count is only a means to
 * a wall-clock time. Runner minutes are free on a public repo, so the reason not to
 * shard further is that jobs past the account's concurrency ceiling queue instead of
 * running, which adds latency rather than removing it. 28 shards have been observed
 * starting together; this leaves room for the rest of the pipeline on top.
 */
const jobBudget = 36

/*
 * A single test file cannot be divided, so the longest one sets a floor under the whole
 * phase and packing below it just buys jobs that finish early while everyone waits on
 * that file anyway. Taking the max means splitting up a long test file is what turns
 * into a faster pipeline, with no constant here to retune afterwards.
 */
const durationLimit = knownTests.length === 0
    ? 0
    : Math.max(
        Math.ceil(knownTests.reduce((total, test) => total + testDurations[test], 0) / jobBudget),
        ...knownTests.map(test => testDurations[test]),
    )

// If a test is in a job, that job must be used
// Also, the tests in a job should not exceed how long we want jobs to be
// equivalent to: `for job in jobs, sum(x[t, job] * duration[t] for t in tests) <= duration_limit * job_used[job]`
for (let job = 0; job < knownTests.length; job++) {
    const constr: [number, Var][] = []
    for (let t = 0; t < knownTests.length; t++) {
        constr.push([testDurations[knownTests[t]], testInJob[`${t}_${job}`]])
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
        // Stopping early only costs us a few extra jobs: it is the duration constraint,
        // not the objective, that decides how long the pipeline takes.
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

// If the solver gives up without an incumbent, every variable stays unset and the tests
// silently drop out of the pipeline instead of failing here.
const assignedCount = Array.from(jobs.values()).reduce((total, jobTests) => total + jobTests.length, 0)
if (assignedCount !== knownTests.length) {
    throw new Error(`Solver placed ${assignedCount} of ${knownTests.length} tests into jobs`)
}

process.stdout.write(JSON.stringify(Array.from(jobs.values())
    .map(jobTests => jobTests.length > 1 ? `{${jobTests.join(',')}}` : jobTests[0])
    .concat(unknownTests)))
