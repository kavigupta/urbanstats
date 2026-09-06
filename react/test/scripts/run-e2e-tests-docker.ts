import crypto from 'crypto'
import net from 'net'
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
    const vncPort = await freePort()
    // The VNC protocol truncates the password to 8 characters, so there's no point generating more.
    const vncPassword = crypto.randomBytes(4).toString('hex')
    await execa('docker', ['build', '-f', 'react/test/Dockerfile', '.', '-t', baseImage, '--platform', platform], { stdio: 'inherit', cwd: repoRoot })
    await execa('docker', ['build', '-f', 'react/test/scripts/run-e2e-tests-docker.Dockerfile', '.', '-t', imageName, '--platform', platform, '--build-arg', `BASE_IMAGE=${baseImage}`], { stdio: 'inherit', cwd: repoRoot })
    const run = execa(
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
            '-e', `URBANSTATS_VNC=${vncPassword}`,
            '-e', `URBANSTATS_VNC_PORT=${vncPort}`,
            imageName,
            ...args,
        ],
        { stdio: 'inherit', reject: false },
    )
    const viewer = showVncViewer(vncPort, vncPassword, run)
    const result = await run
    await viewer
    return result.exitCode
}

// A port of its own, so parallel runs don't fight over one.
function freePort(): Promise<number> {
    return new Promise((resolve) => {
        const server = net.createServer()
        server.listen(0, () => {
            const { port } = server.address() as net.AddressInfo
            server.close(() => { resolve(port) })
        })
    })
}

// The container shares the host's network, so x11vnc's display is on localhost.
async function showVncViewer(vncPort: number, password: string, run: Promise<unknown>): Promise<void> {
    if (os.platform() !== 'darwin') {
        console.warn(`Connect a VNC client to localhost:${vncPort}, password ${password}, to watch the tests`)
        return
    }
    let running = true
    void run.then(() => { running = false })
    while (running) {
        if (await portIsOpen(vncPort)) {
            // Leave a session the user opened themselves alone when we're done
            const wasOpen = await screenSharingIsOpen()
            // -g so the tests don't steal focus, which is the point of running them in Docker
            await execa('open', ['-g', `vnc://:${password}@localhost:${vncPort}`], { reject: false })
            await run
            if (!wasOpen) {
                // Screen Sharing has no window-level scripting, so it's the whole app or nothing
                await execa('osascript', ['-e', 'quit app "Screen Sharing"'], { reject: false })
            }
            return
        }
        await new Promise(resolve => setTimeout(resolve, 500))
    }
}

async function screenSharingIsOpen(): Promise<boolean> {
    const { exitCode } = await execa('pgrep', ['-x', 'Screen Sharing'], { reject: false })
    return exitCode === 0
}

function portIsOpen(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = net.connect({ port, host: 'localhost' })
        socket.on('connect', () => { socket.destroy(); resolve(true) })
        socket.on('error', () => { socket.destroy(); resolve(false) })
    })
}
