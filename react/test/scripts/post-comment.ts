import { context, getOctokit } from '@actions/github'
import { z } from 'zod'

import { loadAndMergeTestHistories } from './util'

const env = z.object({
    GITHUB_TOKEN: z.string(),
    ARTIFACT_ID: z.string(),
    HEAD_SHA: z.string(),
}).parse(process.env)

const octokit = getOctokit(env.GITHUB_TOKEN)

await octokit.rest.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: [await testsComment(), screenshotsCommment()].join('\n\n'),
})

function screenshotsCommment(): string | undefined {
    if (env.ARTIFACT_ID === '') {
        // There is a screenshots artifact, so there were screenshots changes
        return `[Screenshots merge ${env.HEAD_SHA}](https://urbanstats.org/screenshot-diff-viewer.html?artifactId=${env.ARTIFACT_ID}&hash=${context.sha})\n\n\`!updateScreenshots\` to update`
    }
    return
}

async function testsComment(): Promise<string | undefined> {
    const histories = await loadAndMergeTestHistories()
}
