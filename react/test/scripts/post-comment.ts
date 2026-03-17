import assert from 'assert'

import { z } from 'zod'

import { maybeGithub } from './github-utils'
import { loadAndMergeTestHistories, testFile } from './util'

const env = z.object({
    GITHUB_TOKEN: z.string(),
    ARTIFACT_ID: z.string(),
    HEAD_SHA: z.string(),
}).parse(process.env)

const github = (await maybeGithub(() => env.GITHUB_TOKEN))!

const body = [await testsComment(), screenshotsComment()].filter(s => s !== undefined).join('\n\n')

if (body === '') {
    process.exit(0)
}

if (github.context.eventName === 'pull_request') {
    await github.octokit.rest.issues.createComment({
        issue_number: github.context.issue.number,
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        body,
    })
}
else {
    await github.octokit.rest.repos.createCommitComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        commit_sha: github.context.sha,
        body,
    })
}

function screenshotsComment(): string | undefined {
    if (env.ARTIFACT_ID !== '') {
        // There is a screenshots artifact, so there were screenshots changes
        return `[Screenshots merge ${env.HEAD_SHA}](https://urbanstats.org/screenshot-diff-viewer.html?artifactId=${env.ARTIFACT_ID}&hash=${github.context.sha})\n\n\`!updateScreenshots\` to update`
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

        const { data } = await github.octokit.rest.actions.downloadJobLogsForWorkflowRun({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
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

        const link = `${github.context.serverUrl}/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${github.context.runId}/job/${executionGithub.jobId}#step:${executionGithub.stepNumber}:${lineInStep + 2}`

        return `- [\`test/${test}.test.ts\`](${link}): ${statusText}${retriesText}`
    }))

    return lines.join('\n')
}
