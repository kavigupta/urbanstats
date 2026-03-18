import { z } from 'zod'

export async function github(token = z.string().parse(process.env.GITHUB_TOKEN)): Promise<typeof result> {
    const { context, getOctokit } = await import('@actions/github')

    const octokit = getOctokit(token)

    function currentJobId(): number {
        return z.coerce.number().parse(process.env.CHECK_RUN_ID)
    }

    async function currentStepNumber(): Promise<number> {
        const { data: currentJob } = await octokit.rest.actions.getJobForWorkflowRun({
            owner: context.repo.owner,
            repo: context.repo.repo,
            run_id: context.runId,
            job_id: currentJobId(),
        })
        if (currentJob.steps === undefined) {
            throw new Error('Current job has no steps')
        }
        const inProgressStep = currentJob.steps.find(step => step.status === 'in_progress')
        if (inProgressStep === undefined) {
            throw new Error(`Current job has no in_progress steps. Current job: ${JSON.stringify(currentJob, null, 2)}`)
        }
        return inProgressStep.number
    }

    const result = { context, currentStepNumber, octokit, currentJobId }
    return result
}
