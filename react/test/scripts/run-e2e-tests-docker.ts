import os from 'os'
import path from 'path'

import { execa } from 'execa'

export async function runE2eTestsDocker(args: string[], hostArch: boolean): Promise<number> {
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
            '--network', 'host',
            ...process.stdout.isTTY ? ['-it'] : [],
            '-v', `${repoRoot}:/urbanstats`,
            // A tmpfs purely as a way to leave an empty directory here. Otherwise react/node_modules
            // is the host's, built for the host's platform, and Node finds it long before it
            // consults NODE_PATH. With nothing in it, the resolution walk falls through to
            // /node_modules, which is the install that matches the container.
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
