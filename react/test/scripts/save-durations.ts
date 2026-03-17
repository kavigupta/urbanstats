import assert from 'assert'

import { getOctokit } from '@actions/github'
import { z } from 'zod'

import { loadAndMergeTestHistories, repoInfo } from './util'

const durations: Record<string, number> = {}

for (const result of await loadAndMergeTestHistories()) {
    assert(result.result.status === 'success', 'Cannot save durations if a test is unsuccessful')
    durations[result.test] = result.result.duration
}

const octokit = getOctokit(z.string().parse(process.env.FINE_GRAINED_TOKEN_FOR_VARIABLES))

const response = await octokit.rest.actions.updateRepoVariable({
    ...repoInfo,
    name: 'E2E_TEST_DURATIONS',
    value: JSON.stringify(durations),
})

console.warn(`Updated variable with response code ${response.status}. New value: ${JSON.stringify(durations, null, 2)}`)
