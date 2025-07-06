import fs from 'fs'

import { globSync } from 'glob'
import { Octokit } from 'octokit'
import { z } from 'zod'
import { argumentParser } from 'zodcli'

const options = argumentParser({
    options: z.object({
        githubToken: z.string(),
    }).strict(),
}).parse(process.argv.slice(2))

const durationsFiles = globSync('durations/*.json')
const durations: Record<string, number> = {}

for (const durationFile of durationsFiles) {
    const test = /([^/]+)\.json$/.exec(durationFile)![1]
    const duration = z.number().parse(JSON.parse(fs.readFileSync(durationFile, 'utf-8')))
    durations[test] = duration
}

const octokit = new Octokit({ auth: options.githubToken })

await octokit.rest.actions.updateRepoVariable({
    owner: 'kavigupta',
    // eslint-disable-next-line no-restricted-syntax -- Repo identifier not branding
    repo: 'urbanstats',
    name: 'e2eTestDurations',
    value: JSON.stringify(durations),
})
