import path from 'path'

import { execa } from 'execa'

const imageName = 'urbanstats-run-e2e-tests-docker'

export async function runE2eTestsDocker(args: string[]): Promise<number> {
    const repoRoot = path.resolve(process.cwd(), '..')
    await execa('docker', ['build', '-f', 'react/test/Dockerfile', '.', '-t', 'urbanstats-test', '--platform', 'linux/amd64'], { stdio: 'inherit', cwd: repoRoot })
    await execa('docker', ['build', '-f', 'react/test/scripts/run-e2e-tests-docker.Dockerfile', '.', '-t', imageName, '--platform', 'linux/amd64'], { stdio: 'inherit', cwd: repoRoot })
    const result = await execa(
        'docker',
        [
            'run', '--rm',
            '--network', 'host',
            ...process.stdout.isTTY ? ['-it'] : [],
            '-v', `${repoRoot}:/urbanstats`,
            '-w', '/urbanstats/react',
            ...process.env.PORT ? ['-e', `PORT=${process.env.PORT}`] : [],
            imageName,
            ...args,
        ],
        { stdio: 'inherit', reject: false },
    )
    return result.exitCode
}
