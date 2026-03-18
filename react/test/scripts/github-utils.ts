import { z } from 'zod'

export async function github(token = z.string().parse(process.env.GITHUB_TOKEN)): Promise<typeof result> {
    const { context, getOctokit } = await import('@actions/github')

    const octokit = getOctokit(token)

    const result = { context, octokit }
    return result
}
