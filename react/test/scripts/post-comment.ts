import assert from 'assert'

import { z } from 'zod'

import { maybeGithub } from './github-utils'
import { loadAndMergeTestHistories } from './util'

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

    const { data: { jobs } } = await github.octokit.rest.actions.listJobsForWorkflowRun({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        run_id: github.context.runId,
    })

    const lines = failedExecutions.map(({ test, result, retries, github: executionGithub }) => {
        const statusText = result.status === 'timeout'
            ? `timeout (limit: ${result.timeLimitSeconds}s)`
            : 'failure'
        const retriesText = retries === 0 ? '' : ` (${retries} retries)`

        const job = jobs.find(j => j.name === executionGithub.jobName)
        assert(job, `Couldn't find job ${executionGithub.jobName} in the jobs for run ${github.context.runId}`)
        const link = `${github.context.serverUrl}/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${github.context.runId}/job/${job.id}#step:${executionGithub.stepNumber}:${executionGithub.groupNumber}`

        return `- [\`test/${test}.test.ts\`](${link}): ${statusText}${retriesText}`
    })

    return `## Failed Tests\n\n${lines.join('\n')}`
}
