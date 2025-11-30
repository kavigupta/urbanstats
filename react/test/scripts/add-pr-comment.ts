import { Octokit } from 'octokit'
import { z } from 'zod'

import { repoInfo } from './util'

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

await octokit.rest.issues.createComment({
    ...repoInfo,
    issue_number: z.coerce.number().parse(process.env.PR_NUMBER),
    body: 'Your comment text here',
})
