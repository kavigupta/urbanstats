import { join } from 'path'

import { execa } from 'execa'
import express from 'express'

// Git repo must be manually initialized
// Use command `git clone --mirror https://github.com/densitydb/densitydb.github.io.git densitydb/densitydb.github.io`

const targetPath = join(import.meta.dirname, 'densitydb', 'densitydb.github.io')

async function update(): Promise<void> {
    execa(`git`, ['remote', 'update', '--prune'], { cwd: targetPath, stdio: 'inherit', reject: false })
    setTimeout(update, 60 * 1000)
}

void update()

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
