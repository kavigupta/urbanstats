import { execFile } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'

const repoRoot = path.resolve(import.meta.dirname, '..')
const references = 'reference_test_snapshots'

function git(args) {
    return promisify(execFile)('git', args, { cwd: repoRoot, encoding: 'buffer', maxBuffer: 1 << 30 }).then(({ stdout }) => stdout)
}

// Lets the snapshot diff viewer compare the references at two git refs, or at a ref and the working tree.
export function setupGitSnapshotMiddlewares(middlewares, devServer) {
    const isRef = ref => typeof ref === 'string' && ref !== '' && !ref.startsWith('-')
    const handle = handler => async (req, res) => {
        try {
            await handler(req, res)
        }
        catch (error) {
            res.status(400).send(String(error))
        }
    }

    devServer.app.get('/local-snapshots/git/changes', handle(async (req, res) => {
        const { base, head } = req.query
        if (!isRef(base) || (head !== undefined && !isRef(head))) {
            throw new Error('Expected ?base=<ref>[&head=<ref>]')
        }
        const nul = buffer => buffer.toString('utf-8').split('\0').filter(field => field !== '')
        const diff = nul(await git(['diff', '--name-status', '--no-renames', '-z', base, ...(head === undefined ? [] : [head]), '--', references]))
        const changes = []
        for (let i = 0; i < diff.length; i += 2) {
            changes.push({ status: diff[i], path: diff[i + 1] })
        }
        if (head === undefined) {
            changes.push(...nul(await git(['ls-files', '--others', '--exclude-standard', '-z', '--', references])).map(file => ({ status: 'A', path: file })))
        }
        res.json(changes.map(({ status, path: file }) => ({ status, path: path.relative(references, file) })))
    }))

    devServer.app.get('/local-snapshots/git/file', handle(async (req, res) => {
        const { ref, path: file } = req.query
        if (typeof file !== 'string' || file.split('/').includes('..') || (ref !== undefined && !isRef(ref))) {
            throw new Error('Expected ?path=<path>[&ref=<ref>]')
        }
        res.type(path.extname(file))
        res.send(ref === undefined ? await fs.readFile(path.join(repoRoot, references, file)) : await git(['show', `${ref}:${references}/${file}`]))
    }))

    return middlewares
}
