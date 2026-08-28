import os from 'os'
import path from 'path'

import { execa } from 'execa'

export async function runE2eTestsDocker(args: string[], hostArch: boolean, dockerOptions: string[]): Promise<number> {
    const arch = hostArch && os.arch() === 'arm64' ? 'arm64' : 'amd64'
    const platform = `linux/${arch}`
    // Tagged per architecture so switching modes doesn't clobber the other mode's image
    const baseImage = `urbanstats-test:${arch}`
    const imageName = `urbanstats-run-e2e-tests-docker:${arch}`
    const repoRoot = path.resolve(process.cwd(), '..')
    await execa('docker', ['build', '-f', 'react/test/Dockerfile', '.', '-t', baseImage, '--platform', platform], { stdio: 'inherit', cwd: repoRoot })
    await execa('docker', ['build', '-f', 'react/test/scripts/run-e2e-tests-docker.Dockerfile', '.', '-t', imageName, '--platform', platform, '--build-arg', `BASE_IMAGE=${baseImage}`], { stdio: 'inherit', cwd: repoRoot })
    const result = await execa(
        'docker',
        [
            'run', '--rm',
            '--platform', platform,
            ...dockerOptions,
            '--network', 'host',
            ...process.stdout.isTTY ? ['-it'] : [],
            '-v', `${repoRoot}:/urbanstats`,
            // Empty, so that resolution falls past the host's install to /node_modules, which is
            // built for the container.
            '--mount', 'type=tmpfs,dst=/urbanstats/react/node_modules',
            '-w', '/urbanstats/react',
            ...(['PORT', 'TESTCAFE_PORT'].flatMap(envVar => process.env[envVar] ? ['-e', `${envVar}=${process.env[envVar]}`] : [])),
            imageName,
            ...args,
        ],
        { stdio: 'inherit', reject: false },
    )
    return result.exitCode
}
