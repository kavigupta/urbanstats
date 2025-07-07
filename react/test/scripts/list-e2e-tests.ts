import fs from 'fs'

import { execa } from 'execa'
import { globSync } from 'glob'
import { Model, Var } from 'lp-model'
import { z } from 'zod'
import { argumentParser } from 'zodcli'

import { DefaultMap } from '../../src/utils/DefaultMap'

const options = argumentParser({
    options: z.object({
        testDurations: z.string(),
    }).strict(),
}).parse(process.argv.slice(2))

const testDurations = z.record(z.number()).parse(JSON.parse(options.testDurations === '' ? '{}' : options.testDurations))
const tests = globSync('test/**/*.test.ts').map(testFile => /([^/]+)\.test\.ts$/.exec(testFile)![1])
const durationLimit = 5 * 60 * 1000

// sort from largest to smallest
const knownTests = tests.filter(test => test in testDurations).sort((a, b) => {
    return testDurations[b] - testDurations[a]
})

const unknownTests = tests.filter(test => !(test in testDurations))

const model = new Model()

// variables

const x: Record<string, Var> = {}

for (let t = 0; t < knownTests.length; t++) {
    for (let bin = 0; bin < knownTests.length; bin++) {
        x[`${t}_${bin}`] = model.addVar({ vtype: 'BINARY' })
    }
}

const y: Record<number, Var> = {}

for (let bin = 0; bin < knownTests.length; bin++) {
    y[bin] = model.addVar({ vtype: 'BINARY' })
}

// constraints

// each item must be in 1 bin
for (let t = 0; t < knownTests.length; t++) {
    const constr: Var[] = []
    for (let bin = 0; bin < knownTests.length; bin++) {
        constr.push(x[`${t}_${bin}`])
    }
    model.addConstr(constr, '==', 1)
}

for (let bin = 0; bin < knownTests.length; bin++) {
    const constr: [number, Var][] = []
    for (let t = 0; t < knownTests.length; t++) {
        constr.push([Math.min(testDurations[knownTests[t]], durationLimit), x[`${t}_${bin}`]])
    }
    model.addConstr(constr, '<=', [[durationLimit, y[bin]]])
}

// objective
const obj = []
for (let bin = 0; bin < knownTests.length; bin++) {
    obj.push(y[bin])
}

model.setObjective(obj, 'MINIMIZE')

fs.writeFileSync('test/scripts/lp.lp', model.toLPFormat())

// The highs integration that came with the library wasn't working
await execa(`test/scripts/vendor/${process.platform}/highs`, ['test/scripts/lp.lp', '--solution_file', 'test/scripts/solution'])

fs.readFileSync('test/scripts/solution', 'utf-8')
    .split('\n')
    .filter(line => line.startsWith('Var'))
    .map(line => line.split(' '))
    .forEach(([name, value]) => model.variables.get(name)!.value = parseInt(value))

const bins = new DefaultMap<number, string[]>(() => [])

for (let t = 0; t < knownTests.length; t++) {
    for (let bin = 0; bin < knownTests.length; bin++) {
        if (x[`${t}_${bin}`].value === 1) {
            bins.get(bin).push(knownTests[t])
        }
    }
}

process.stdout.write(JSON.stringify(Array.from(bins.values())
    .map(binTests => binTests.length > 1 ? `{${binTests.join(',')}}` : binTests[0])
    .concat(unknownTests)))
