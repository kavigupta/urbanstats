/**
 * Measures one memory test against two builds and prints what each retained. See test/MEMORY.md
 * for why the measurement needs a production bundle and an amd64 container to mean anything.
 */
import fs from 'fs/promises'
import net from 'net'
import os from 'os'
import path from 'path'

import { execa } from 'execa'
import express from 'express'
import { z } from 'zod'
import { argumentParser } from 'zodcli'

import { booleanArgument } from './util'

const options = argumentParser({
    options: z.object({
        site: z.string(),
        test: z.string(),
        base: z.string().default('main'),
        // Defaults to the working tree
        head: z.optional(z.string()),
        keep: booleanArgument({ defaultValue: false }),
    }).strict(),
}).parse(process.argv.slice(2))

const react = process.cwd()
const site = path.resolve(options.site)
const work = await fs.mkdtemp(path.join(os.tmpdir(), 'memory-ab-'))

async function build(ref: string | undefined, out: string): Promise<void> {
    // Building the working tree in place would fight the dev server over ../dist
    let src = react
    if (ref !== undefined) {
        const worktree = path.join(work, `src-${out}`)
        await execa('git', ['worktree', 'add', '--detach', worktree, ref])
        // A copy, not a symlink: rspack resolves through symlinks, and the real path then misses
        // the config's `exclude` for maplibre-gl, which builds it differently from the CI's bundle
        await copyTree(path.join(react, 'node_modules'), path.join(worktree, 'react', 'node_modules'))
        src = path.join(worktree, 'react')
    }
    await execa('npx', ['rspack', '--mode=production', '--output-path', path.join(work, out)], {
        cwd: src,
        env: { NODE_ENV: 'production' },
        stdout: process.stderr,
        stderr: process.stderr,
    })
}

/** Cheap where the filesystem can clone or reflink, a real copy where it can't. */
async function copyTree(from: string, to: string): Promise<void> {
    const clone = process.platform === 'darwin' ? ['-Rc'] : ['-R', '--reflink=auto']
    const result = await execa('cp', [...clone, from, to], { reject: false })
    if (result.exitCode !== 0) {
        await execa('cp', ['-R', from, to])
    }
}

async function measure(out: string): Promise<number> {
    const app = express()
    // The generated HTML loads `/scripts/index.js`, so a bundle mounted only at the root is ignored
    app.use('/scripts', express.static(path.join(work, out)))
    app.use(express.static(site))
    const server = app.listen(0)
    await new Promise(resolve => server.once('listening', resolve))
    const port = (server.address() as net.AddressInfo).port

    try {
        // memoryUsage attaches to every CDP target, and the USS worker's idle timer can take one
        // out from under it, so a run that reaches no measurement at all is worth repeating
        for (let attempt = 1; attempt <= 3; attempt++) {
            const result = await execa(
                'npm',
                [
                    'run', 'test:e2e', '--',
                    `--test=test/${options.test}.test.ts`,
                    // An arm64 container reports numbers that don't track the amd64 ones CI asserts against
                    '--docker=ci',
                    '--browser=chromium',
                ],
                {
                    env: { PORT: String(port), TESTCAFE_PORT: String(await freePortRun(2)) },
                    all: true,
                    reject: false,
                },
            )
            const log = path.join(work, `${out}.test.${attempt}.log`)
            await fs.writeFile(log, result.all ?? '')
            const bytes = [...(result.all ?? '').matchAll(/bytes: (\d+)/g)].at(-1)
            if (bytes !== undefined) {
                return Number(bytes[1])
            }
            console.warn(`no measurement in attempt ${attempt}; see ${log}`)
        }
        throw new Error(`no measurement for ${out} after 3 attempts`)
    }
    finally {
        server.close()
    }
}

/** TestCafe wants a consecutive pair, and its default 1337 is often taken. */
async function freePortRun(count: number): Promise<number> {
    for (;;) {
        const base = 20_000 + Math.floor(Math.random() * 40_000)
        const servers = await Promise.all(Array.from({ length: count }, (_, i) => bind(base + i)))
        const bound = servers.filter(server => server !== undefined)
        await Promise.all(bound.map(server => new Promise((resolve) => { server.close(resolve) })))
        if (servers.every(server => server !== undefined)) {
            return base
        }
    }
}

function bind(port: number): Promise<net.Server | undefined> {
    return new Promise((resolve) => {
        const server = net.createServer()
        server.once('error', () => { resolve(undefined) })
        server.listen(port, () => { resolve(server) })
    })
}

try {
    console.warn(`building ${options.base}...`)
    await build(options.base, 'base')
    console.warn(`building ${options.head ?? 'working tree'}...`)
    await build(options.head, 'head')

    console.warn(`measuring ${options.base}...`)
    const baseBytes = await measure('base')
    console.warn(`measuring ${options.head ?? 'working tree'}...`)
    const headBytes = await measure('head')

    const rows = [
        [options.base, baseBytes],
        [options.head ?? 'working tree', headBytes],
        ['delta', headBytes - baseBytes],
    ] as const
    const width = Math.max(...rows.map(([label]) => label.length)) + 2
    for (const [label, bytes] of rows) {
        process.stdout.write(`${label.padEnd(width)}${String(bytes).padStart(12)}\n`)
    }
}
finally {
    if (options.keep) {
        console.warn(`kept ${work}`)
    }
    else {
        await fs.rm(work, { recursive: true, force: true })
    }
    await execa('git', ['worktree', 'prune'])
}
