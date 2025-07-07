import fs from 'fs'

import { globSync } from 'glob'
import { Octokit } from 'octokit'
import { z } from 'zod'

const durationsFiles = globSync('durations/*.json')
const durations: Record<string, number> = {}

for (const durationFile of durationsFiles) {
    const test = /([^/]+)\.json$/.exec(durationFile)![1]
    const duration = z.number().parse(JSON.parse(fs.readFileSync(durationFile, 'utf-8')))
    durations[test] = duration
}

const octokit = new Octokit({ auth: z.string().parse(process.env.FINE_GRAINED_TOKEN_FOR_VARIABLES) })

await octokit.rest.actions.updateRepoVariable({
    owner: 'kavigupta',
    // eslint-disable-next-line no-restricted-syntax -- Repo identifier not branding
    repo: 'urbanstats',
    name: 'E2E_TEST_DURATIONS',
    value: JSON.stringify(durations),
})
