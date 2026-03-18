import assert from 'assert'

import { z } from 'zod'

import { github } from './github-utils'
import { loadAndMergeTestHistories, testFile } from './util'

const env = z.object({
    ARTIFACT_ID: z.string(),
    HEAD_SHA: z.string(),
}).parse(process.env)

const gh = await github()

const body = [await testsComment(), screenshotsComment()].filter(s => s !== undefined).join('\n\n')

if (body === '') {
    process.exit(0)
}

if (gh.context.eventName === 'pull_request') {
    await gh.octokit.rest.issues.createComment({
        issue_number: gh.context.issue.number,
        owner: gh.context.repo.owner,
        repo: gh.context.repo.repo,
        body,
    })
}
else {
    await gh.octokit.rest.repos.createCommitComment({
        owner: gh.context.repo.owner,
        repo: gh.context.repo.repo,
        commit_sha: gh.context.sha,
        body,
    })
}

function screenshotsComment(): string | undefined {
    if (env.ARTIFACT_ID !== '') {
        // There is a screenshots artifact, so there were screenshots changes
        return `[Screenshots merge ${env.HEAD_SHA}](https://urbanstats.org/screenshot-diff-viewer.html?artifactId=${env.ARTIFACT_ID}&hash=${gh.context.sha})\n\n\`!updateScreenshots\` to update`
    }
    return
}

async function testsComment(): Promise<string | undefined> {
    const executions = (await loadAndMergeTestHistories()).filter((execution): execution is Required<typeof execution> => {
        assert(execution.github, 'Must be a Github test execution')
        return true
    }).sort((a, b) => a.test.localeCompare(b.test))

    const failedExecutions = executions.filter(execution => execution.result.status !== 'success')

    if (failedExecutions.length === 0) {
        return
    }

    const lines = await Promise.all(failedExecutions.map(async ({ test, result, retries, github: executionGithub }) => {
        const statusText = result.status === 'timeout'
            ? `timeout (limit: ${result.timeLimitSeconds}s)`
            : 'failure'
        const retriesText = retries === 0 ? '' : ` (${retries} retries)`

        const { data } = await gh.octokit.rest.actions.downloadJobLogsForWorkflowRun({
            owner: gh.context.repo.owner,
            repo: gh.context.repo.repo,
            job_id: executionGithub.jobId,
        })

        const logs = z.string().parse(data).split('\n')

        const stepStartIdx = logs.findIndex(line => line.includes('##[group]Run npm run test:e2e'))

        if (stepStartIdx === -1) {
            throw new Error('Could not find the start of the test step in the logs')
        }

        const lineIdx = logs.findIndex(line => line.includes(`##[group]${testFile(test)} attempt ${(retries + 1)}`))

        if (lineIdx === -1) {
            throw new Error(`Couldn't find log line for ${test}`)
        }

        const lineInStep = lineIdx - stepStartIdx

        const link = `${gh.context.serverUrl}/${gh.context.repo.owner}/${gh.context.repo.repo}/actions/runs/${gh.context.runId}/job/${executionGithub.jobId}#step:${executionGithub.stepNumber}:${lineInStep + 2}`

        return `- [\`test/${test}.test.ts\`](${link}): ${statusText}${retriesText}`
    }))

    return lines.join('\n')
}
