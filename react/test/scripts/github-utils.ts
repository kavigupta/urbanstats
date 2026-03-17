export async function maybeGithub(token: () => string): Promise<undefined | typeof result> {
    if (!process.env.GITHUB_ACTIONS) {
        return undefined
    }
    const { context, getOctokit } = await import('@actions/github')

    const octokit = getOctokit(token())

    async function currentStepNumber(): Promise<number> {
        const { data } = await octokit.rest.actions.listJobsForWorkflowRun({
            owner: context.repo.owner,
            repo: context.repo.repo,
            run_id: context.runId,
        })
        const currentJob = data.jobs.find(job => job.name === context.job)
        if (currentJob === undefined) {
            throw new Error(`Could not find current job '${context.job}'. Jobs: ${JSON.stringify(data.jobs, null, 2)}`)
        }
        if (currentJob.steps === undefined) {
            throw new Error(`Current job has no steps. Current job: ${JSON.stringify(currentJob, null, 2)}`)
        }
        const inProgressStep = currentJob.steps.find(step => step.status === 'in_progress')
        if (inProgressStep === undefined) {
            throw new Error(`Current job has no in_progress steps. Current job: ${JSON.stringify(currentJob, null, 2)}`)
        }
        return inProgressStep.number
    }

    const result = { context, currentStepNumber, octokit }
    return result
}
