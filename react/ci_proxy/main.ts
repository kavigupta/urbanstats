import { existsSync } from 'fs'
import { readdir, rm } from 'fs/promises'
import { join } from 'path'

import { execa } from 'execa'

// Git repo must be manually initialized
// Use command `git clone --mirror https://github.com/densitydb/densitydb.github.io.git densitydb/densitydb.github.io`

const bareRepo = join(import.meta.dirname, 'densitydb', 'densitydb.github.io')

function repoPath(branch?: string): string {
    return join(import.meta.dirname, 'densitydb', 'repos', ...(branch === undefined ? [] : [branch]))
}

async function update(): Promise<void> {
    try {
        await execa(`git`, ['remote', 'update', '--prune'], { cwd: bareRepo, stdio: 'inherit', reject: false })
        const { stdout: branchesOutput } = await execa('git', ['branch'], { cwd: bareRepo })
        const branches = Array.from(branchesOutput.matchAll(/^\*? {1,2}(.+)$/mg)).map(([, branch]) => branch)
        for (const branch of branches) {
            if (existsSync(repoPath(branch))) {
                await execa('git', ['fetch'], { stdio: 'inherit', cwd: repoPath(branch) })
                if ((await execa('git', ['rev-parse', 'HEAD'], { cwd: repoPath(branch) })).stdout !== (await execa('git', ['rev-parse', `origin/${branch}`], { cwd: repoPath(branch) })).stdout) {
                    await execa('git', ['reset', '--hard', `origin/${branch}`], { stdio: 'inherit', cwd: repoPath(branch) })
                }
            }
            else {
                await execa('git', ['clone', '--branch', branch, bareRepo, repoPath(branch)], { stdio: 'inherit' })
            }
        }
        for (const branchFolder of await readdir(repoPath())) {
            if (!branches.includes(branchFolder)) {
                await rm(repoPath(branchFolder), { recursive: true, force: true })
            }
        }
    }
    catch (e) {
        console.error(e)
    }
    setTimeout(update, 10 * 1000)
}

void update()
