import { existsSync } from 'fs'
import { join } from 'path'

import { execa } from 'execa'
import express from 'express'

const repoUrl = 'https://github.com/densitydb/densitydb.github.io.git'
const targetPath = join(import.meta.dirname, 'densitydb.github.io')

if (!existsSync(targetPath)) {
    console.warn('Repository not found. Cloning...')
    try {
        await execa(`git`, ['clone', '--mirror', repoUrl, targetPath], { stdio: 'inherit' })
        console.warn('Repository cloned successfully.')
    }
    catch (error) {
        console.error('Failed to clone repository:', error)
    }
}
else {
    console.warn('Repository already exists.')
    await execa(`git`, ['remote', 'update', '--prune'], { cwd: targetPath, stdio: 'inherit' })
}

setInterval(() => {
    void execa(`git`, ['remote', 'update', '--prune'], { cwd: targetPath, stdio: 'inherit' })
}, 60 * 1000)

const app = express()

app.use(async (req, res) => {
    let path = decodeURIComponent(req.path.slice(1))
    if (path === '') {
        path = 'index.html'
    }
    const object = `${req.headers['x-branch'] ?? 'master'}:${path}`
    if ((await execa('git', ['cat-file', '-e', object], { cwd: targetPath, reject: false })).exitCode === 128) {
        console.warn(`Not found: ${object}`)
        res.sendStatus(404)
        return
    }
    const fileExtension = (/\.(.+)$/.exec(path))?.[1]
    const mimeType = fileExtension ? { html: 'text/html', js: 'text/javascript' }[fileExtension] : undefined
    if (mimeType !== undefined) {
        res.setHeader('content-type', mimeType)
    }
    execa('git', ['cat-file', '-p', object], { cwd: targetPath }).stdout!.pipe(res)
})

app.listen(8001)
